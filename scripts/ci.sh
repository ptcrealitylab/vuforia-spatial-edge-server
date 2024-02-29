#!/bin/bash -x

./scripts/ci_generate_certificate.sh

mkdir screenshots

npm ci

git clone https://github.com/ptcrealitylab/vuforia-spatial-toolbox-userinterface
git clone https://github.com/hobinjk-ptc/test-spatialToolbox spatialToolbox

cd addons

git clone https://github.com/ptcrealitylab/pop-up-onboarding-addon
git clone https://github.com/ptcrealitylab/vuforia-spatial-edge-agent-addon
git clone https://github.com/ptcrealitylab/vuforia-spatial-remote-operator-addon

for i in `ls ./`; do
  echo $i
  cd $i
  npm ci
  npm uninstall --no-save @ffmpeg-installer/ffmpeg fsevents
  cd ..
done

cd ..
