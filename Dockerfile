FROM node:12
# Create app directory
WORKDIR /app

#RUN git clone https://github.com/ptcrealitylab/vuforia-spatial-edge-server.git; mv vuforia-spatial-edge-server /app

# Bundle app source for development
COPY . .

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

#RUN git submodule update --init --recursive; \
#    cd addons/vuforia-spatial-core-addon; \
#    npm install



EXPOSE 8080
EXPOSE 49368
EXPOSE 52316

CMD [ "node", "index.js" ]
