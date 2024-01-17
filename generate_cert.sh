#!/bin/bash

# generate certificate and key
libressl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -sha256 -days 356 -out cert.pem
