if [ ! -d "vuforia-spatial-edge-server" ]; then
  echo "Cloning"
  git clone https://github.com/ptcrealitylab/vuforia-spatial-edge-server
  cd vuforia-spatial-edge-server
  git submodule update --init --recursive
  cd ..
fi

cd vuforia-spatial-edge-server
npm ci

cd addons
for i in `ls ./`; do echo $i; cd $i; npm ci; cd ..; done
cd ..
