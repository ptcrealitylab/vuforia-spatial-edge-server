#!/usr/bin/env bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

# generate certificate and key
openssl req -config $SCRIPT_DIR/cert.conf -new -x509 -sha256 -newkey rsa:2048 -nodes -keyout $SCRIPT_DIR/../key.pem -days 365 -out $SCRIPT_DIR/../cert.pem
