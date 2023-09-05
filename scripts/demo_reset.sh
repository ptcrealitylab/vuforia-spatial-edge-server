#!/bin/bash -x

mv /home/nerfstudio/Desktop/NERF_YC/SpatialToolbox/spatialToolbox /home/nerfstudio/Desktop/NERF_YC/SpatialToolbox/OLD_DEMO_STATES/$(date +"%Y%-m-%d-%H%M")-spatialToolbox
cp -r /home/nerfstudio/Desktop/NERF_YC/SpatialToolbox/DEMO_RESET_STATE/spatialToolbox /home/nerfstudio/Desktop/NERF_YC/SpatialToolbox/spatialToolbox
 
