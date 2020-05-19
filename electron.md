# Electron Builder

This readme explains how to build an application for the Vuforia Spatial Edge Server using the electron-builder package.

## Read First
The Vuforia Spatial Toolbox and Vuforia Spatial Edge Server make up a shared research platform for exploring spatial computing as a community. This research platform is not an out of the box production-ready enterprise solution. Please read the [MPL 2.0 license](LICENSE) before use.

Join the conversations in our [discourse forum](https://forum.spatialtoolbox.vuforia.com) if you have questions, ideas want to collaborate or just say hi.


## Installation

First, install the [Vuforia Spatial Edge Server](README.md).

Second, switch to branch 'electron-app'

```bash
cd vuforia-spatial-edge-server
git checkout electron-app
```

Install dependencies again:

```bash
npm install
```

Now run the command to build the application:

```bash
yarn dist
```

This command will generate a folder called dist with the application files.
