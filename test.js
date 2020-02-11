
var test = {};

test.intervalls = 15550000;
test.a = 0;
test.b = 0;
test.c = "";
test.d = "";
test.timeStart = null;
test.timeEnd = null;
test.counter = 0;


var a = 0;
var b = 0;
var c = "";
var d = "";
var timeStart;
var timeEnd;
var intervalls = test.intervalls;
var counter = 0;


test.testA = function (){
    test.a = 0;
    test.b = 0;
    test.c = "";
    test.d = "";
    test.timeStart = null;
    test.timeEnd = null;
    test.counter = 0;

    test.timeStart = Date.now();
	for(test.counter =0; test.counter < test.intervalls; test.counter++) {
        test.a = test.counter;
        test.b = test.a;
        test.a = test.b * test.counter;
        test.c = test.d + " " + test.counter;
	}
	test.timeEnd = Date.now() - test.timeStart;
	console.log("test. "+test.timeEnd);
};

test.testB = function (){
    this.a = 0;
    this.b = 0;
    this.c = "";
    this.d = "";
    this.timeStart = null;
    this.timeEnd = null;
    this.counter = 0;

    this.timeStart = Date.now();
    for(this.counter =0; this.counter < this.intervalls; this.counter++) {
        this.a = this.counter;
        this.b = this.a;
        this.a = this.b * this.counter;
        this.c = this.d + " " + this.counter;
    }
    this.timeEnd = Date.now() - this.timeStart;
    console.log("this. "+this.timeEnd);
};

test.testC = function (){
    var a = 0;
    var b = 0;
    var c = "";
    var d = "";
    var timeStart;
    var timeEnd;
	var intervalls = this.intervalls;

    timeStart = Date.now();
    for(var counter =0; counter < intervalls; counter++) {
        a = counter;
        b = a;
        a = b * counter;
        c = d + " " + counter;
    }
    timeEnd = Date.now() - timeStart;
    console.log("var  "+timeEnd);
};

test.testD = function (){
    timeStart = Date.now();
    for(counter =0; counter < intervalls; counter++) {
        a = counter;
        b = a;
        a = b * counter;
        c = d + " " + counter;
    }
    timeEnd = Date.now() - timeStart;
    console.log("var  "+timeEnd);
};

test.testE = function (timeStart, timeEnd, counter, intervalls, a, b, c, d){
    timeStart = Date.now();
    for(counter =0; counter < intervalls; counter++) {
        a = counter;
        b = a;
        a = b * counter;
        c = d + " " + counter;
    }
    timeEnd = Date.now() - timeStart;
    console.log("var  "+timeEnd);
};

test.testF = function (timeStart, timeEnd, counter, intervalls, a, b, c, d){
   var timeStart = timeStart;
	   var timeEnd = timeEnd;
		var counter = counter;
			var intervalls = intervalls;
		var a = a;
			var b = b;
		var c = c;
		var d = d;


    timeStart = Date.now();
    for(counter =0; counter < intervalls; counter++) {
        a = counter;
        b = a;
        a = b * counter;
        c = d + " " + counter;
    }
    timeEnd = Date.now() - timeStart;
    console.log("var  "+timeEnd);
};

a1 = {n :1235};

function testNumber(n){
    n['n'] = 1111111;
}
testNumber(a1);

console.log("this number "+a1.n);


clear();
console.log("test global call");
test.testA();
clear();
console.log("this global call");
test.testB();
clear();
console.log("local var");
test.testC();
clear();
console.log("global var");
test.testD();
clear();
console.log("this arguments");
test.testC = function (){
    test.testE(this.timeStart, this.timeEnd, this.counter, this.intervalls, this.a, this.b, this.c, this.d);
};
test.testC();
clear();
console.log("test. arguments");
test.testE(test.timeStart, test.timeEnd, test.counter, test.intervalls, test.a, test.b, test.c, test.d);

clear();
console.log("buffered test. arguments");
test.testF(test.timeStart, test.timeEnd, test.counter, test.intervalls, test.a, test.b, test.c, test.d);



function clear() {
    test.a = 0;
    test.b = 0;
    test.c = "";
    test.d = "";
    test.timeStart = null;
    test.timeEnd = null;
    test.counter = 0;

     a = 0;
     b = 0;
     c = "";
     d = "";
     timeStart;
     timeEnd;
     intervalls = test.intervalls;
     counter = 0;

}
