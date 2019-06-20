var express = require("express");
var router = express.Router();
var fs = require("fs");
var https = require("https");
var qs = require("querystring");
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
// const db_url = 'mongodb://103.209.102.252:27017/lucky';
const db_url = 'mongodb://127.0.0.1:27017/lucky';
var uuidv1 = require("uuid/v1");

var multer = require("multer");
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './upload');
    },
    filename: function (req, file, cb) {
        cb(null, file.fieldname + '-' + uuidv1());
    }
});
var upload = multer({storage: storage});

router.post("/publish", upload.single("draw"), (req, resback) => {
    console.log("/draw/publish");
    var file = req.file;
    console.log(req.file);
    console.log(req.body);
    
    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        console.log("文件类型",file.mimetype);
        console.log('文件保存路径：%s', file.path);
        //var object = {};
        //col.insertOne()
    });
});



module.exports = router;