const express = require('express')
const bodyParser = require('body-parser')
const request = require('request-promise')
const { Pool, Client } = require('pg')
const save_results = require('./save_results.js')
const port = process.argv[2] || 8888
const app = express()
const secrets= require('./secrets.js')
const knex = require('knex')(secrets.database)
const { performance } = require('perf_hooks')
const label_names = require('./label_names.js')

const memcache = require('./cache.json')

const IMAGE_STATE = {
    INITIAL: 0,
    SELECTED: 1
}

function random_slice(arr, n) {
    const i = Math.max(0, Math.floor(Math.random()*arr.length - n))
    return arr.slice(i, i+n)
}

app.use(express.static('public'))
app.use(bodyParser.json())
app.set('view engine', 'pug')
app.set('views', 'public')

app.get('/i', async (req, res) => {
    const key = req.query.k
    if (!key) return res.sendStatus(404)
    const { id, vector, label, parent1 } = await knex.from('image').where({ key }).first()
    let pkey = null
    if (parent1 != null) {
        let res = await knex.select('key').from('image').where({ id: parent1 }).first()
        pkey = res.key
    }
    res.render('image.pug', { key, pkey, vector, label, label_names })
})

app.get('/info', async (req, res) => {
    const key = req.query.k
    if (!key) return res.sendStatus(404)
    const { vector, label } = await knex.from('image').where({ key }).first()
    res.json({ vector, label })
})

app.get('/', async (req, res) => {
    try {
        /* Provide a mix of starred and raw images.
        */
        const keys_1 = random_slice(memcache['raw'], 6)
        const keys_2 = random_slice(memcache['starred'], 6)
        const keys = keys_1.concat(keys_2)
        const count = memcache['count']
        res.render('random.pug', { keys, count })
    } catch(err) {
        console.log('Error: /', { err })
        return res.sendStatus(500)
    }
})

app.get('/starred', (req, res) => res.render('starred'))
app.get('/mix', (req, res) => res.render('mix'))

app.get('/latest', async (req, res) => {
    const page = req.query.page || 0
    try {
        const images = await knex.
            select('key', 'created_at').
            from('image').
            where('stars', '>', 0).
            orderBy('id', 'desc').
            offset(48 * page).
            limit(48)

        res.render('latest.pug', { images, page })
    } catch(err) {
        console.log('Error: /latest', err)
        return res.sendStatus(500)
    }
})

app.get('/lineage', async (req, res) => {
    const key = req.query.k
    if (!key) return res.sendStatus(404)
    try {
        const q = `WITH RECURSIVE parenttree AS (
            SELECT id, key, created_at, parent1
            FROM image
            WHERE image.key = '${key}'
            UNION ALL
            SELECT e.id, e.key, e.created_at, e.parent1
            FROM image e
            INNER JOIN parenttree ptree ON ptree.parent1 = e.id
        )
        SELECT key, created_at FROM parenttree order by created_at desc`
        const parents = (await knex.raw(q)).rows
        return res.render('lineage.pug', { key, parents })
    } catch(err) {
        console.log('Error: /lineage', err)
        return res.sendStatus(500)
    }
})

app.post('/image_children', async (req, res) => {
    const key = req.body.key
    if (!key) return res.sendStatus(404)
    try {
        const q = knex.from('image').where({ key }).first()
        const { id, state, vector, label, size } = await q

        if (state == IMAGE_STATE.INITIAL) {
            const t = performance.now()
            const url = (size == 128) ? secrets.ganurl128 : secrets.ganurl256
            const [ imgs, vectors, labels ] = await request({
                url: url+'/children',
                method: 'POST',
                json: true,
                form: {
                    label: JSON.stringify(label),
                    vector: JSON.stringify(vector)
                }
            })
            console.log(`Made children in: ${performance.now() - t}`)
            await knex('image').where({ id }).update({ state: 1 })
            const children = await save_results({ imgs, vectors, labels, size, parent1: id })
            memcache['count'] += 1
            return res.json(children)
        } else if (state == 1) {
            const children = await knex.from('image').select('key').where({ parent1: id, parent2:null })
            if (children.length) {
                return res.json(children)
            }
            // Children are being processed, do not request more.
            return res.json([])
        }
    } catch(err) {
        console.log('Error: /image_children', err)
        return res.sendStatus(500)
    }
})

app.post('/mix_images', async (req, res) => {
    const key1 = req.body.key1
    const key2 = req.body.key2
    if (!key1 || !key2) return res.sendStatus(400)
    try {
        const image1 = await knex.from('image').where({ key:key1 }).first()
        const image2 = await knex.from('image').where({ key:key2 }).first()

        if (image1.size != image2.size) {
            return res.status(400).send('Cannot mix images of differnet sizes.')
        }
        const url = (image1.size == 128) ? secrets.ganurl128 : secrets.ganurl256
        const [ imgs, vectors, labels ] = await request({
            url: url+'/mix_images',
            method: 'POST',
            json: true,
            form: {
                label1: JSON.stringify(image1.label),
                label2: JSON.stringify(image2.label),
                vector1: JSON.stringify(image1.vector),
                vector2: JSON.stringify(image2.vector)
            }
        })
        const children = await save_results({ imgs, vectors, labels,
                                              size: image1.size,
                                              parent1: image1.id,
                                              parent2: image2.id })
        return res.json(children)
    } catch(err) {
        console.log('Error: /mix', err)
        return res.sendStatus(500)
    }
})

app.post('/star', async (req, res) => {
    const key = req.body.key
    if (!key) return res.sendStatus(400)
    try {
        const { stars, id } = await knex.select('stars', 'id').from('image').where({ key }).first()
        await knex('image').update({stars: stars+1}).where({ id })
        res.sendStatus(200)
    } catch(err) {
        console.log('Error: /star', err)
        res.sendStatus(500)
    }
})

app.listen(port, () => console.log('Server running on', port))
