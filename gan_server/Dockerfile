FROM python:3.6.9-buster
ADD ./gan_server /gan_server
WORKDIR /gan_server
# Install dependencies
RUN pip install -r /gan_server/requirements.txt
# And go...
CMD ["python", "server.py"]
