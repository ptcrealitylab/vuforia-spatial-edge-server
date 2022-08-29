#!/bin/bash
set -ex

# this would be good but prevents undoing this
# rm -fr .git
# rm -r hardwareInterfaces/*
npm ci --omit=dev
npm uninstall --omit=dev --no-save archiver directory-tree monaco-editor node-persist readdirp simple-git
