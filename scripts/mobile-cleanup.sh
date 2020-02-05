#!/bin/bash
set -ex

# this would be good but prevents undoing this
# rm -fr .git
rm -r hardwareInterfaces/aaaa
npm remove --no-save archiver change-case decompress-size directory-tree express-handlebars forever forever-monitor ip lodash monaco-editor network-interfaces node-fetch node-hid node-persist node-rest-client readdirp request serialport sharp simple-git smtp-server socket.io socket.io-client wedo xmljs
