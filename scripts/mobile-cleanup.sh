#!/bin/bash
set -ex

# this would be good but prevents undoing this
# rm -fr .git
# rm -r hardwareInterfaces/*
npm remove --no-save archiver change-case decompress-size directory-tree express-handlebars forever forever-monitor lodash monaco-editor network-interfaces node-fetch node-hid node-persist node-rest-client readdirp serialport sharp simple-git smtp-server wedo xmljs
