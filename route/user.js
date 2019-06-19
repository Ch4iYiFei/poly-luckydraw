var express = require("express");
var router = express.Router();
var fs = require("fs");
var https = require("https");
var qs = require("querystring");
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
var db_url = 'mongodb://localhost:27017/runoob';

router.post("/login", (req, resback) => {
    //   console.log(req.method+req.statusCode);
    console.log("/usr/login");
    console.log("body:"+req.body);
    var appid = "wx55bd9c881859ddb5";
    // var appsecret = fs.readFileSync("AppSecret").toString();
    var appsecret = require("../AppSecret");
    // console.log(appsecret);

    if(req.body.code){
        console.log(req.body.code);
        var param = {
            appid: appid,
            secret: appsecret,
            js_code: req.body.code,
            grant_type: "authorization_code"
        };
        var options = {
            method: "get",
            url: "https://api.weixin.qq.com/sns/jscode2session?" + qs.stringify(param)
        };
        console.log(options.url);

        // var req = https.request(options,(res)=>{
        //     console.log(res.statusCode);
        //     console.log(res.body);
        // })

        request(options, (err, res, body) => {
            if (!err && res) {
                console.log(res.statusCode);
                console.log(body);
                var response = JSON.parse(body);
                console.log(response.openid);
                //拿到了微信个人id
                MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
                    if(db_err) throw db_err;
                    var dbase = db.db("lucky");
                    console.log("db connected");

                    var col = dbase.collection("user");
                    col.find({id:response.openid}).toArray((find_err,find_result)=>{
                        if(find_err)  throw find_err;
                        if(!find_result){
                            console.log("不存在该用户");
                        }else{
                            console.log("用户存在，直接登录");
                        }


                        db.close();
                    })
                })






            }else
                console.log("error occured when accesing weixinserver");
        })
        //resback.send(response.openid);//response需要处理
    }else{
        console.log("no code get");
        console.log(req.body);
        MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
            if(db_err) throw db_err;
            var dbase = db.db("lucky");
            console.log("db connected");
            // dbase.createCollection("draw", function (err, res) {
            //     if (err) throw err;
            //     console.log("draw collection created");
            //     db.close();
            // });
            var col = dbase.collection("user");

            // col.insertOne({ id:req.body.openid, address:"华中科技大学", intro:"I am a student"},(insert_err,insert_result)=>{
            //     if(insert_err) throw insert_err;
            //     console.log(insert_result);
            // })

            col.find({id:req.body.openid}).toArray((find_err,find_result)=>{
                if(find_err)  throw find_err;
                if(!find_result){
                    console.log("不存在该用户");
                }else{
                    console.log("用户存在，直接登录");
                    console.log(find_result);
                }

                db.close();
            })
            // col.find({id:"asdfhsadfasf"}).toArray((find_err,find_result)=>{
            //     if(find_err)  throw find_err;
            //     console.log(find_result);
            //     db.close();
            // })
            
        })
        resback.send("testing ok");
    }
});

module.exports = router;