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
var jwt = require("jwt-simple");
var secret = "photopp";

var multer = require("multer");
var storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './upload');
    },
    filename: function (req, file, cb) {
        console.log(file.originalname);
        var suffix = (file.originalname).split(".");
        cb(null, 'img-' + uuidv1() + '.' + suffix[suffix.length -1]);
    }
});
var upload = multer({storage: storage});

router.post("/publish", upload.single("draw"), (req, resback) => {//draw为field，并没使用fieldname
    console.log("/draw/publish");
    var file = req.file;
    //console.log(req.file);
    //console.log(req.body);
    
    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        console.log("文件类型",file.mimetype);
        console.log("文件保存路径", file.path);
        console.log("文件名称",file.filename);
        console.log(req.body.award);
        console.log(req.body.desc);
        console.log(req.body.time);
        console.log(req.body.date);
        console.log(req.body.isPublic);

        var draw_id = 'draw-' + uuidv1();
        var token = req.body.jwt;
        var publisher = jwt.decode(token,secret).iss;
        console.log("发布者",publisher);
        
        var object = {draw_id: draw_id, path: file.path, publisher:publisher, award: req.body.award, desc: req.body.desc, date:req.body.date, time: req.body.time, isPublic:req.body.isPublic};
        console.log(object);
        col.insertOne(object, (insert_err,insert_result)=>{
            if(insert_err) throw insert_err;
            console.log("插入抽奖成功");
            //...........
            resback.send({error: null});
            db.close();
        })
    });
});

router.post("/fetch/publish", (req,resback)=>{
    console.log("/draw/fetch/publish");
    console.log(req.body);
    var token = req.body.jwt;
    var publisher = jwt.decode(token,secret).iss;
    //已经拥有的抽奖信息数量
    var skipnum = req.body.num;
    var limitnum = 10;
    console.log("发布者",publisher);

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        //isPublic对发布者不是限制
        col.find({publisher: publisher}).skip(skipnum).limit(limitnum).toArray((find_err,find_result)=>{
            if(find_err)  throw find_err;
            console.log(find_result);
            resback.send(find_result);
            db.close();
        });
    });

});

router.post("/fetch/all", (req,resback)=>{
    console.log("/draw/fetch/all");
    console.log(req.body);
    var token = req.body.jwt;
    var publisher = jwt.decode(token,secret).iss;
    //已经拥有的抽奖信息数量
    var skipnum = req.body.num;
    var limitnum = 10;
    console.log("发布者",publisher);

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        //isPublic对所有用户来说是选择条件
        col.find({isPublic: true}).skip(skipnum).limit(limitnum).toArray((find_err,find_result)=>{
            if(find_err)  throw find_err;
            console.log(find_result);
            resback.send(find_result);
            db.close();
        });
    });

});

module.exports = router;