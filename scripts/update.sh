#!/bin/bash
set -ex

git pull --rebase

pushd addons

for i in `ls ./`; do
  echo $i
  pushd $i
  git pull --rebase
  popd
done

popd
