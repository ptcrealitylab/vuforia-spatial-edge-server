# vuforia-toolbox-server

The vuforia-toolbox-server is the backbone of the Vuforia Toolbox system. Every
device in the system, from an iPhone to an industrial robot arm, will run an
instance of this server. This README outlines how to install the server on
larger scale devices with command line access like laptops or desktops. Running
on embedded devices may require more preparation. App-specific documentation
can be found in the [Vuforia Toolbox
iOS](https://github.com/ptcrealitylab/vuforia-toolbox-ios) or [Vuforia Toolbox
Android](https://github.com/ptcrealitylab/vuforia-toolbox-android)
repositories.

## Installation

First, install [Node.js](https://nodejs.org/en/). We currently test our
software on Node 6, 8, and 10 with 10 being our recommended platform.

Second, clone this repository into your desired directory:

```bash
git clone https://github.com/ptcrealitylab/vuforia-toolbox-server.git
```

Next, enter the vuforia-toolbox-server directory and install all dependencies.

```bash
cd vuforia-toolbox-server
npm install
```

Now, download the core add-on package and install its dependencies.

```bash
mkdir addons
cd addons
git clone https://github.com/ptcrealitylab/vuforia-spatial-core-addon
cd vuforia-spatial-core-addon
npm install
cd ../.. # return to the main vuforia-toolbox-server directory
```

You can now run the server using the following command:

```bash
node server.js
```

## Contributing

We highly encourage you to contribute any code changes by making pull requests
on GitHub. Fork this repository using the button on the top right, make and
commit your changes, then GitHub will prompt you to make a pull request.

### Automated Tests
Note that we do run some automated testing to ensure that our code remains
consistently styled and functional. If you want to see the results of this
testing locally, run the following command in your vuforia-toolbox-server
folder:

```bash
npm run test
```
