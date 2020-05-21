
## Starting the Vuforia Spatial Edge Server on Raspberry Pi

This tutorial explains the steps to start the Vuforia Spatial Edge Server on a Raspberry Pi. This toolbox has been tested for Ubuntu 20.04, Ubuntu 18.04 and the Raspian operating system on a Raspberry Pi 4 model B. To learn more about this toolbox refer to the [Vuforia Spatial Toolbox](https://spatialtoolbox.vuforia.com/) website.


### Ubuntu:

You can install Ubuntu on the Raspberry Pi using a MicroSD Card.
First you need to download the OS image that will be written to the SD Card. 

Different versions of Ubuntu 20.04 LTS and 18.04 can be found [here](https://ubuntu.com/download/raspberry-pi).

In order to write the image of Ubuntu, you need to write the OS image onto the MicroSD Card. We used the Win32 Disk Imager software for windows. 
You can find instructions for writing the OS image into the SD Card for each of the operating sytems here: 
[Ubuntu](https://ubuntu.com/tutorials/create-an-ubuntu-image-for-a-raspberry-pi-on-ubuntu#1-overview), 
[MacOS](https://ubuntu.com/tutorials/create-an-ubuntu-image-for-a-raspberry-pi-on-macos#1-overview), 
[Windows](https://ubuntu.com/tutorials/create-an-ubuntu-image-for-a-raspberry-pi-on-windows#1-overview).

After writing the image to the SD Card, insert the Card into your Raspberry Pi and plug in the power adapter. If you used the link above, the image is the Ubuntu Server and you need to install a desktop for it. 
After downloading the specific version of Ubuntu for your raspberry Pi, the webiste will direct you to the instructions on installing the server and the desktop. Although the recommended desktops are xubuntu, lubuntu and kubuntu, we installed the main Ubuntu gnome desktop since our system has 4GB of RAM using the following command: 

```
$ sudo apt-get install ubuntu-desktop
```



### Raspian:

You can install the Raspberry Pi Imager to write the OS image to your SD Card. The imager already has the the different Raspian images, so there is no need to download it. You can open the software and write the image. The imager can be downloaded from [here](https://www.raspberrypi.org/downloads/).
 
Insert the SD Card into your Raspberry Pi and enter the Raspian enviornment. 


#### The Following Steps are the same for Ubuntu and Raspian:

When the OS is installed, make sure you install git: 

```
$ sudo apt install git
```

You can install Node.js v14.x by running the following commands:

```
$ curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -
$ sudo apt-get install -y nodejs
```

For other versions of Node.js refer to the [Github Page](ttps://github.com/nodesource/distributions/blob/master/README.md).

Node js also installs npm which a package manager. You can update the version of npm using:
```
$ sudo npm install -g npm
```

Now you can download the Vuforia Edge Server by cloning the respository first: git clone https://github.com/ptcrealitylab/vuforia-spatial-edge-server.git

Enter the vuforia-spatial-edge-server directory and install the required dependencies:

```
$ cd vuforia-spatial-edge-server
$ npm install
```

The next step is to initialize the core add-on submodule:

```$ git submodule update --init --recursive
$ cd addons/vuforia-spatial-core-addon
$ npm install
```

Return to the main directory and install the dependencies one more time. The server should be ready! You can run the server now:

```
$ cd ../..
$ npm install
$ node server
```

Note: Every time you add an add-on folder, make sure to run `$ npm install` in the folder and then in the main direcotry.


### Contribution
In order to contribute to this toolbox, fork the repository in the top right corner and after pushing your changes, on top of a page the option of making a pull request will appear. 

You can also run our automated tests wich ensures the code is functional:

```
$ npm run test
```

### Support
If you encounter any problems you can make a post in the [Vuforia Spatial Toolbox Forum](https://forum.spatialtoolbox.vuforia.com/).

###### Date: 05/21/2020

