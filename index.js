var express = require("express");
var app = express();
var fs = require("fs");

var key = fs.readFileSync("2_www.mgxwz.com.key");
var cert = fs.readFileSync("1_www.mgxwz.com_bundle.crt");

var https = require("https");
var schedule = require("node-schedule");

https.createServer({
	key:key,
	cert:cert
},app).listen(8086,function() {
	console.log("run on 8086 changed");
});

var date = new Date();
console.log(date.getTimezoneOffset());
console.log(date.toLocaleString());

var task = require("./route/task");
task.doThemAll();



var bodyParser = require('body-parser');

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));


var userRouter = require("./route/user");
var drawRouter = require("./route/draw");
var cpntRouter = require("./route/cpnt");


app.use('/user',userRouter);
app.use('/draw',drawRouter);
app.use('/cpnt',cpntRouter);
app.use('/img',express.static("upload"));
app.use('/src',express.static("cpnt"));