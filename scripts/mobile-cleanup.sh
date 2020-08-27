#!/bin/bash
set -ex

# this would be good but prevents undoing this
# rm -fr .git
# rm -r hardwareInterfaces/*
npm prune --production
npm uninstall --production --no-save archiver change-case decompress-size directory-tree express-handlebars lodash monaco-editor network-interfaces node-persist readdirp sharp simple-git smtp-server xmljs
