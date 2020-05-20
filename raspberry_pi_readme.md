
Starting the Vuforia Spatial Edge Server on Raspberry Pi

This toolbox has been tested for Ubuntu 20, Ubuntu 18 and the Raspian operating systems on a Raspberry Pi 4 model B.

Ubuntu:

You can install Ubuntu on the Raspberry Pi using a MicroSD Card.
First you need to download the OS image that will be written to the SD Card. 

The latest version of Ubuntu can be found here: https://ubuntu.com/download/raspberry-pi

In order to write the image of Ubuntu, you need to write the OS image onto the MicroSD Card. We used Win32 Disk Imager softwre for windows. 
You can find instructions for writing the OS image into the SD Card for each of the operating sytems here: 

Ubuntu: https://ubuntu.com/tutorials/create-an-ubuntu-image-for-a-raspberry-pi-on-ubuntu#1-overview
MacOS: https://ubuntu.com/tutorials/create-an-ubuntu-image-for-a-raspberry-pi-on-macos#1-overview
Windows: https://ubuntu.com/tutorials/create-an-ubuntu-image-for-a-raspberry-pi-on-windows#1-overview

Then insert the SD Card into the Raspberry Pi and plug in the power adapter. This image is the Ubuntu Server and you need to install a desktop for it. 
After downloading the specific version of Ubuntu for your raspberry Pi, the webiste will direct you to the instructions on installing the server and the desktop.

We installed the main Ubuntu gnome desktop using the command: 
`sudo apt-get install ubuntu-desktop`

When the OS is installed, make sure you install git: 
`sudo apt install git`

You can install Node.js v14.x by running the following commands:
`curl -sL https://deb.nodesource.com/setup_13.x | sudo -E bash -`
`sudo apt-get install -y nodejs`

For other versions of Node.js refer to the github page: https://github.com/nodesource/distributions/blob/master/README.md

When the OS is installed you can download the Vuforia Edge Server by following the instructions in the github page: https://github.com/SainaRez/vuforia-spatial-edge-server




