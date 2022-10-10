#!/bin/bash

mkdir screenshots

npm ci

git clone https://github.com/ptcrealitylab/vuforia-spatial-toolbox-userinterface
git clone https://github.com/hobinjk-ptc/test-spatialToolbox spatialToolbox

cd addons

git clone https://github.com/ptcrealitylab/vuforia-spatial-edge-agent-addon
git clone https://github.com/ptcrealitylab/vuforia-spatial-remote-operator-addon

for i in `ls ./`; do echo $i; cd $i; npm ci; cd ..; done
cd ..
