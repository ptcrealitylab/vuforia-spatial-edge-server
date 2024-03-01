#!/bin/bash -x

openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -sha256 -days 356 -out cert.pem -subj "/C=US/ST=Massachusetts/L=Boston/O=Ptc/OU=Reality lab/CN=localhost/emailAddress=test@ptc.com"
