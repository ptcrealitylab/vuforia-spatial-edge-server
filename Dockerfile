FROM node:12
LABEL maintainer="vheun@ptc.com,jhobin@ptc.com"

# Bundle app source for development
ADD . /app/vuforia-spatial-edge-server
WORKDIR /app
RUN echo "Installing dependencies" \
  && set -x \
  && ./vuforia-spatial-edge-server/scripts/install.sh

EXPOSE 8080
EXPOSE 49368
EXPOSE 52316

WORKDIR /app/vuforia-spatial-edge-server
CMD [ "npm", "start" ]
