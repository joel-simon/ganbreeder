import json
from flask import Flask, request, jsonify
from flask_cors import CORS, cross_origin
import time
import tensorflow as tf
import tensorflow_hub as hub
import numpy as np
from scipy.stats import truncnorm
import random
import base64
from io import BytesIO
import PIL.Image

module_path = '/tmp/tfhub_modules/69c940d5e79ede1c89f384d21607f04875f24507'
# module_path = '/Users/joelsimon/Projects/gan/modules/128'
rand_seed = 123
truncation = 0.5

tf.reset_default_graph()
print('Loading BigGAN module from:', module_path)
module = hub.Module(module_path)
inputs = {k: tf.placeholder(v.dtype, v.get_shape().as_list(), k)
          for k, v in module.get_input_info_dict().items()}
output = module(inputs)

input_z = inputs['z']
input_y = inputs['y']
input_trunc = inputs['truncation']
random_state = np.random.RandomState(rand_seed)
dim_z = input_z.shape.as_list()[1]
vocab_size = input_y.shape.as_list()[1]

initializer = tf.global_variables_initializer()

config = tf.ConfigProto()
config = tf.ConfigProto(intra_op_parallelism_threads=0, inter_op_parallelism_threads=0, \
                        allow_soft_placement=True, device_count = {'CPU': 12})

sess = tf.Session()
sess.run(initializer)

def truncated_z_sample(batch_size):
    values = truncnorm.rvs(-2, 2, size=(batch_size, dim_z), random_state=random_state)
    return truncation * values

def create_labels(num, max_classes):
    label = np.zeros((num, vocab_size))
    for i in range(len(label)):
        for _ in range(random.randint(1, max_classes)):
            j = random.randint(0,vocab_size-1)
            label[i, j] = random.random()
    return label

def sample(vectors, labels, batch_size=10):
    num = vectors.shape[0]
    ims = []
    for batch_start in range(0, num, batch_size):
        s = slice(batch_start, min(num, batch_start + batch_size))
        feed_dict = {input_z: vectors[s], input_y: labels[s], input_trunc: truncation}
        ims.append(sess.run(output, feed_dict=feed_dict))
    ims = np.concatenate(ims, axis=0)
    assert ims.shape[0] == num
    ims = np.clip(((ims + 1) / 2.0) * 256, 0, 255)
    ims = np.uint8(ims)
    return ims

def create_variations(num, vector, label):
    new_vectors = np.zeros((num, vector.shape[0]))
    new_labels  = np.zeros((num, label.shape[0]))

    vector_mutation_rate = vector.std() * 4

    for i in range(num):
        new_labels[i][:] = label
        dv = (np.random.rand(*vector.shape)-0.5) * vector_mutation_rate
        new_vectors[i] = vector + dv
        new_vectors[i] /= max(-new_vectors.min(), new_vectors.max())

        # Remove class
        if random.random() < 0.2:
            opts = np.nonzero(new_labels[i])[0]
            if len(opts) == 1:
                continue
            new_labels[i][random.choice(opts)] = 0.0

        # Add class.
        if random.random() < 0.3:
            new_labels[i][random.randint(0, label.shape[0]-1)] = 1.0

    return new_vectors, new_labels

def create_random_images(num_images, max_classes):
    vectors = truncated_z_sample(num_images)
    labels = create_labels(num_images, max_classes)
    ims = sample(vectors, labels)

    return ims, vectors, labels

def encode_img(arr, format='png'):
    # Encode uint8 values array into base64 string for sending.
    image = PIL.Image.fromarray(arr)
    buffered = BytesIO()
    image.save(buffered, format="JPEG")
    img_bytes = base64.b64encode(buffered.getvalue())
    img_str = 'data:image/jpeg;base64,'+img_bytes.decode('ascii')
    return img_str

app = Flask(__name__, static_url_path='') #, static_folder='public', )
CORS(app)

@app.route('/')
def index():
    return "Hello, World!"

@app.route('/random', methods=['POST'])
def get_random():
    try:
        num = int(request.form['num'])
        print('Random', num)
        t = time.time()
        imgs, vectors, labels = create_random_images(num, max_classes=3)
        print('Finished in', time.time()-t)
        response = jsonify([
            [ encode_img(arr) for arr in imgs ],
            vectors.tolist(),
            labels.tolist()
        ])
        return response
    except Exception as e:
        print(e)
        return '', 500

@app.route('/children', methods=['POST'])
def children():
    try:
        print('children')
        vector = json.loads(request.form['vector'])
        label  = json.loads(request.form['label'])
        vector = np.asarray(vector, dtype='float64')
        label  = np.asarray(label, dtype='float64')
        new_vectors, new_labels = create_variations(12, vector, label)

        new_ims = sample(new_vectors, new_labels)

        return jsonify([
            [ encode_img(arr) for arr in new_ims ],
            new_vectors.tolist(),
            new_labels.tolist()
        ])
    except Exception as e:
        print(e)
        return '', 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True)
