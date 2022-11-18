#!/bin/bash
set -ex

npm ci --omit=dev

cd addons

for i in `ls ./`; do
  echo $i
  cd $i
  npm ci --omit=dev
  npm uninstall --omit=dev --no-save @ffmpeg-installer/ffmpeg fsevents
  cd ..
done

cd ..

# npm uninstall --omit=dev --no-save archiver directory-tree monaco-editor node-persist readdirp simple-git

npm uninstall --omit=dev --no-save monaco-editor
