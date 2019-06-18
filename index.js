var express = require("express");
var app = express();
var fs = require("fs");

var key = fs.readFileSync("privatekey.pem");
var cert = fs.readFileSync("certificate.crt");

var https = require("https");

https.createServer({
	key:key,
	cert:cert
},app).listen(8086,function() {
	console.log("run on 8086 changed");
});

var bodyParser = require('body-parser');

app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: false}));

var userRouter = require("./route/user");

app.use('/user',userRouter);