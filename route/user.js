var express = require("express");
var router = express.Router();
var fs = require("fs");
var https = require("https");
var qs = require("querystring");
var request = require("request");
var MongoClient = require('mongodb').MongoClient;
// const db_url = 'mongodb://103.209.102.252:27017/lucky';
const db_url = 'mongodb://127.0.0.1:27017/lucky';
var jwt = require("jwt-simple");
var secret = "photopp";

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

        request(options, (err, res, body) => {
            console.log(res.body+"\n"+err)
            if (body) {
                console.log(res.statusCode);
                console.log(body);
                var response = JSON.parse(body);
                console.log(response.openid);
                //拿到了微信个人id
                //此处可能内部有出现新的进程，导致新的进程进入else执行，所以写一个返回中断下面的逻辑？？？
                return MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
                    if(db_err) throw db_err;
                    var dbase = db.db("lucky");
                    console.log("db connected");

                    var col = dbase.collection("user");
                    //此处可以不用find，直接upsert
                    col.find({id:response.openid}).toArray((find_err,find_result)=>{
                        if(find_err)  throw find_err;
                        if(find_result.length == 0){
                            console.log("之前未登录的用户");
                            //可增加更多的insert项
                            col.insertOne({ id:response.openid, name: "", phone: "", address: "", zipcode: "", chance: 50},(insert_err,insert_result)=>{
                                if(insert_err) throw insert_err;
                                console.log("插入用户成功");
                            })
                            
                        }else{
                            console.log("用户存在，直接登录");
                            console.log(find_result);
                        }
                        //不管几次登录都返回一样的信息
                        //s生成jwt
                        var token = jwt.encode({iss: response.openid}, secret);
                        console.log("jwt:",token);
                        resback.send({error:null, jwt:token, uid:response.openid});
                        db.close();
                    })
                })

            }else
                console.log("error occured when accesing weixinserver");
                resback.send({error:"访问微信api出现问题"});
                //resback微信服务器问题
        })
    }else{//测试使用
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
                if(find_result.length == 0){
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


router.post("/userInfo",(req,resback)=>{
    console.log("/user/userInfo");
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;
    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
        if(db_err) throw db_err;
        var dbase = db.db("lucky"); 
        console.log("db connected");
        var col = dbase.collection("user");
        col.findOne({id: user},(find_err,find_result)=>{
            if(find_err) throw find_err;
            console.log("过来拿信息的");
            resback.send(find_result);
            db.close();
        })
    })
});

router.post("/infoEdit",(req,resback)=>{
    console.log("/user/infoEdit");
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
        if(db_err) throw db_err;
        var dbase = db.db("lucky"); 
        console.log("db connected");
        var col = dbase.collection("user");

        col.updateOne({id: user},{$set: {name: req.body.name, phone:req.body.phone, address: req.body.address, zipcode: req.body.zipcode}},(update_err,update_result)=>{
            if(update_err) throw update_err;
            console.log("修改信息");
            resback.send({error: null});
            db.close();
        })
    })
});

router.post("/addDrawChance",(req,resback)=>{
    console.log("/user/addDrawChance");
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
        if(db_err) throw db_err;
        var dbase = db.db("lucky"); 
        console.log("db connected");
        var col = dbase.collection("user");

        col.updateOne({id: user},{$inc:{chance: req.body.number}},(update_err,update_result)=>{
            if(update_err) throw update_err;
            console.log("增加更新的次数");
            resback.send({error: null});
            db.close();
        })
    })
})

router.post("/chanceNum",(req,resback)=>{
    console.log("/user/chanceNum");
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
        if(db_err) throw db_err;
        var dbase = db.db("lucky"); 
        console.log("db connected");
        var col = dbase.collection("user");

        col.findOne({id: user},{projection:{chance: 1, _id: 0}},(find_err,find_result)=>{
            if(find_err) throw find_err;
            console.log("拿抽奖次数");
            resback.send(find_result);
            db.close();
        })
    })
})

router.post("/luckyInfo",(req,resback)=>{
    console.log("/user/luckyInfo");
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
        if(db_err) throw db_err;
        var dbase = db.db("lucky"); 
        console.log("db connected");
        var col_joiner = dbase.collection("joiner");
        
        col_joiner.aggregate([
            {$match:
                {
                    draw_id: req.body.draw_id,
                    result:{$gte: 0}
                }
            },
            {$lookup:
                {
                    from: "user",
                    localField: "id",
                    foreignField: "id",
                    as: "detached"
                }
            }
        ]).toArray((agg_err,agg_result)=>{
            if(agg_err) throw agg_err;
            console.log(agg_result);
            resback.send(agg_result);
            db.close();
        })
    })
})

module.exports = router;