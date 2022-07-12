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

## Read First
The Vuforia Spatial Toolbox and Vuforia Spatial Edge Server make up a shared research platform for exploring spatial computing as a community. This research platform is not an out of the box production-ready enterprise solution. Please read the [MPL 2.0 license](LICENSE) before use.

Join the conversations in our [discourse forum](https://forum.spatialtoolbox.vuforia.com) if you have questions, ideas want to collaborate or just say hi.


## Installation

First, install [Node.js](https://nodejs.org/en/). We currently test our
software on Node 10, 12, and 14 with 12 being our recommended platform.

Second, clone this repository into your desired directory:

```bash
git clone https://github.com/ptcrealitylab/vuforia-spatial-edge-server.git
```

Next, enter the vuforia-toolbox-server directory and install all dependencies.

```bash
cd vuforia-spatial-edge-server
npm install
```

Now, initialize the core add-on git submodule and install its dependencies.

```bash
git submodule update --init --recursive
cd addons/vuforia-spatial-core-addon
npm install
cd ../.. # return to the main vuforia-toolbox-server directory
```

You can now run the server using the following command:

```bash
node index.js
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
logged. For example, on Mac/Linux the following command will only print log
messages that originate from hardware interfaces:

```bash
LOG_MODULES=interfaces node index.js
```

This command hides all console messages except for those made using `console.error`:

```bash
LOG_LEVEL=error node index.js
```

This command would limit messages to the gitInterface.js and envelope.js files:

```bash
LOG_MODULES=gitInterface,envelope node index.js
```

LOG_MODULES is a list of comma-separated file names, folder names, or keywords
that are checked against each log message's originating file's path.

### Windows

To specify environmental variables like LOG_MODULES and LOG_LEVEL use the
following in PowerShell:

```
$env:LOG_MODULES="interfaces"
node index.js
```

## Additional Server Addons
There are several useful server addons that we do not include in the base
server. For example, installing the include the [edge
agent](https://github.com/ptcrealitylab/vuforia-spatial-edge-agent-addon) and
[remote
operator](https://github.com/ptcrealitylab/vuforia-spatial-remote-operator-addon/)
addons will enable your server to act as a standalone remote operator host
behind our cloud proxy. Note that the edge agent addon is currently private but
will be open-sourced soon.

For each addon you want to install follow these steps, substituting the github
url as necessary:
```bash
cd addons
git clone https://github.com/ptcrealitylab/vuforia-spatial-remote-operator-addon
git clone git@github.com:ptcrealitylab/vuforia-spatial-edge-agent-addon
cd vuforia-spatial-remote-operator-addon
npm install
cd .. # return to the addons directory
cd vuforia-spatial-edge-agent-addon
npm install
```
