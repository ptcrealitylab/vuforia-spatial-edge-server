### Behaviour

Links can connect to the logic block at a specific color.<br>
Within the logic node blocks can be moved around.


Therefore, logic nodes are a special kind of nodes.



   // defines if IO-Point is a logic block
    this.isBlock = false;
    
  ```
var testA = "";
var testB = false;
var result = false;
var counter = 0;
var time = new Date().getTime();

while(counter < 100000000){
    if(testA===null){
        result = true;
    }else {
        result = false;
    }
    counter++;
}
console.log("long null: " + parseInt(new Date().getTime()-time));

var testA = true;
var testB = false;
var result = false;
var counter = 0;
var time = new Date().getTime();

while(counter < 100000000){
    if(testA===true){
        result = true;
    }else {
        result = false;
    }
    counter++;
}
console.log("long bool: "+ parseInt(new Date().getTime()-time));


var testA = true;
var testA = "2312123";
var result = false;
var counter = 0;
var time = new Date().getTime();

while(counter < 100000000){
    if(testA===""){
        result = true;
    }else {
        result = false;
    }
    counter++;
}
console.log("string: "+ parseInt(new Date().getTime()-time));

var testA = true;
var testA = 231223213;
var result = 23231;
var counter = 0;
var time = new Date().getTime();

while(counter < 100000000){
    if(testA===11){
        result = true;
    }else {
        result = false;
    }
    counter++;
}
console.log("short int: "+ parseInt(new Date().getTime()-time));


var testA = true;
var testA = 231223213213213123123123223;
var result = 23231;
var counter = 0;
var time = new Date().getTime();

while(counter < 100000000){
    if(testA===11){
        result = true;
    }else {
        result = false;
    }
    counter++;
}
console.log("long int: "+ parseInt(new Date().getTime()-time));




```