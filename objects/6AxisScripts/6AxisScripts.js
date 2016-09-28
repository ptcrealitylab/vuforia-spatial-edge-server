function scaleData(data){
	//data is a JSON object that dependent on the interface might contain: pitch,yaw,roll,height,touchX,touchY
	// its job is to take this data and scale it between 0 and 1
	var scaledData = {};
	if(data.pitch)
		scaledData.pitch = map(data.pitch.value-data.pitch.init,-1,1,0,1);
	if(data.yaw){
		var yaw = data.yaw.value;
		yaw = scaleYaw(yaw);
		var init_yaw = scaleYaw(data.yaw.init);
		scaledData.yaw=map(yaw-init_yaw+.5,0,1,0,1);
	}
	if(data.roll){
		var roll = scaleRoll(data.roll.value);
		var init_roll = scaleRoll(data.roll.init);
		scaledData.roll=map(roll-init_roll+.5,0,1,0,1);		
	}
	if(data.height){
		var height = (((10001-(20000/data.height.value))/9999)+1)/2;
		height = map(height,.9971,1,0,1);
		var init_height = (((10001-(20000/data.height.init))/9999)+1)/2;
		init_height = map(init_height,.9971,1,0,1);
		scaledData.height=map(height-init_height+.5,0,1,0,1);
	}
	if(data.touchX){
		scaledData.touchX = map(data.touchX.value-data.touchX.init,-350,350,0,1);
	}
	if(data.touchY){
		scaledData.touchY = map(data.touchY.value-data.touchY.init,-350,350,0,1);
	}
	return scaledData;
}

function scaleYaw(value){
  if(value>0 && value <Math.PI){
    value = map(value,0,Math.PI,.25,.75);
  }
  else if(value< -Math.PI/2){
    value = map(value,-Math.PI,-Math.PI/2,.75,1);
  }
  else{
    value = map(value,-Math.PI/2,0,0,.25);
  }
  return value;
}

function scaleRoll(value){
  if(value<0){
    value = map(Math.abs(value),2.4,Math.PI,0,.5);
  }
  else{
    value = map(1/value,1/Math.PI,1/2.4,.5,1);
  }
  //console.log("returning roll: " + value);
  return value;	
}

function writeSpeed(ioPoint,value,sharpness,error,max_value,mapping_type,negate, buffer){
	//this function takes a data input from 0-1 and converts that to a value from 0-1 representing a motor speed for the robot to go
	//ioPoint: the IOPoint to write to
	//value: data input value from 0-1
	//sensitivity: value between 0-1 -- the sharpness with which the mapping curve should have
	//error: natural hand shaking can cause data values to oscillate, so error accounts for this making numbers within error range to not cause motor movement
	//max_value: cap speed for motor (default is 1) (inputs should be between 0-1);
	//mapping type: exponential, linear, or logistic mapping functions
	// https://www.desmos.com/calculator/ldlfqnwtnq shows the various functions with sliders to play with the scales 
	//true false for whether speed sign should be flipped (may be necessary dependent on orientation of marker)
	var speed =0;
	if(sharpness > 1 || sharpness < 0)
		sharpness = .5;
	if(max_value > 1 || max_value < 0)
		max_value = .5;
	value = (value-1/2)*2;
	if(negate)
		value *= -1;
	if(Math.abs(value)>error){
		if(mapping_type == "exponential")
			speed = mapExponential(Math.abs(value),sharpness,max_value);
		else if(mapping_type == "linear")
			speed = mapLinear(Math.abs(value),sharpness,max_value);
		else
			speed = mapLogistic(Math.abs(value),sharpness,max_value);
	}
	speed *= value/Math.abs(value);

	hybridObj.write(ioPoint,map(speed,-1,1,0,1));
}

function mapExponential(value,sharpness,max_value){
	var scale = 5+(sharpness-.5)*7;
	return max_value*(1-Math.pow(Math.E,-scale*value));
}
function mapLinear(value,sharpness,max_value){
	var value = (1+2*(sharpness-.5))*value;
	if(value > max_value)
		value = max_value;
	return value;
}
function mapLogistic(value,sharpness,max_value){
	var scale = 10+(sharpness-.5)*10;
	return max_value/(1+Math.pow(Math.E,-scale*(value-.5)));
}
function map(x, in_min, in_max, out_min,out_max) {
	if (x > in_max) x = in_max;
	if (x < in_min) x = in_min;
	return (x - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}