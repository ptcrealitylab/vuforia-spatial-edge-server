# Vuforia Spatial Edge Server

The Spatial Edge Server is the backbone of the Vuforia Toolbox system. Every
device in the system, from an iPhone to an industrial robot arm, will run an
instance of this server. This README outlines how to install the server on
larger scale devices with command line access like laptops or desktops. Running
on embedded devices may require more preparation. App-specific documentation
can be found in the [Vuforia Toolbox
iOS](https://github.com/ptcrealitylab/vuforia-toolbox-ios) or [Vuforia Toolbox
Android](https://github.com/ptcrealitylab/vuforia-toolbox-android)
repositories.

# Read First
The Vuforia Spatial Edge Server is a shared research platform for exploring spatial computing as a community. It is not an out of the box production-ready enterprise solution. Please read the [MPL 2.0 license](LICENSE before use, and we want to welcome you to our community [forum.spatialtoolbox.vuforia.com](https://forum.spatialtoolbox.vuforia.com).

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

## Debugging

If you encounter a problem while developing, you can specify the LOG_MODULES or
LOG_LEVEL environment variables. LOG_MODULES will filter debug logs to a
specific file or directory. LOG_LEVEL will set the minimum console level to be
logged. For example, the following command will only print log messages that
originate from hardware interfaces:

```bash
LOG_MODULES=interfaces node server.js
```

This command hides all console messages except for those made using `console.error`:

```bash
LOG_LEVEL=error node server.js
```

This command would limit messages to the gitInterface.js and envelope.js files:

```bash
LOG_MODULES=gitInterface,envelope node server.js
```

LOG_MODULES is a list of comma-separated file names, folder names, or keywords
that are checked against each log message's originating file's path.

