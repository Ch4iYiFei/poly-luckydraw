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
var schedule = require("node-schedule");


module.exports = {
    doThemAll: async function doThemAll(){
        allTask = await this.findAllTask();
        allTask.forEach(element=>{
            var date_arr = element.date.split("-");
            var time_arr = element.time.split(":");
            var date = new Date(date_arr[0],date_arr[1]-1,date_arr[2],time_arr[0],time_arr[1]);
            console.log(date.toLocaleString());
            schedule.scheduleJob(date,()=>{
                console.log("大概可能就会执行");
                this.messagesend(element.draw_id);
            })
        });
    },
//可能会出现删除抽奖后的问题

//之查询drawid链
    findAllTask: async function findAllTask(){
        return new Promise((resolve,reject)=>{
            console.log("去数据库获得所有的draw_id");
            MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
                if(db_err) reject(db_err);
                console.log("into resolve");
                var dbase = db.db("lucky");
                console.log("db connected");
                var col = dbase.collection("draw");
                col.find({},{projection:{'draw_id': 1,'date': 1,'time': 1,'_id': 0}}).toArray((find_err,find_result)=>{
                    if(find_err) reject(find_err);
                    console.log(find_result);
                    resolve(find_result);
                    db.close();
                })
            });
        });
    },

    messagesend: async function messagesend(draw_id){
        //其实感觉下面两个await可以并发，但是不知道怎么写
        var ids = await this.getAllId(draw_id).catch((err)=>{
            throw err;
        });
        var info = await this.getDrawInfo(draw_id).catch((err)=>{
            throw err;
        });
        var body = await this.getToken().catch((err)=>{
            throw err;
        });
    
        console.log(body);
        var response = JSON.parse(body);
        console.log(response.access_token);
    
        //处理没有抽奖着的问

        await Promise.all(ids.map(async function(element){
            console.log("开始发送消息");
            var messageData = {
                "touser": element.id,
                "template_id": "_jZtBpX7u2NlIi6y-f8bCttH-75A2Ix2IEd3QthfzKE",
                "page": "pages/detail/detail?draw_id="+draw_id,
                "form_id": element.formId,
                "data": {
                    "keyword1": {
                        "value": info.award
                    },
                    "keyword2": {
                        "value": "点击进入查看抽奖结果"
                    },
                    "keyword3": {
                        "value": "此处为抽奖提醒"
                    }
                },
                "emphasis_keyword": "keyword2.DATA"
            }
    
            var options = {
                method: "POST",
                url: "https://api.weixin.qq.com/cgi-bin/message/wxopen/template/send?access_token="+response.access_token,
                json: true,
                headers: {
                    "content-type": "application/json",
                },
                body: messageData,
            };
            await new Promise((resolve,reject)=>{
                request(options,(err, res, body)=>{
                    if(err) reject(err);
                    else{
                        console.log("应该已经发送了模版消息");
                        console.log(res.body);
                        resolve(body);
                    }
                    
                })
            });
            
        }));
    },



    
    getToken: async function getToken(){
        var appid = "wx55bd9c881859ddb5";
        var appsecret = require("../AppSecret");
    
        var param = {
            grant_type: "client_credential",
            appid: appid,
            secret: appsecret,
            
        };
        var options = {
            method: "get",
            url: "https://api.weixin.qq.com/cgi-bin/token?" + qs.stringify(param)
        };
        console.log(options.url);
    
        return new Promise((resolve,reject)=>{
            console.log("微信端开始");
            request(options, (err, res, body) => {
                if(err)
                {
                    console.log("into reject");
                    reject(err);
                }else {
                    console.log("into resolve");
                    resolve(body);
                }
            })
        })
    },
    
    getAllId: async function getAllId(draw_id){
        return new Promise((resolve,reject)=>{
            console.log("去数据库获得id和formid");
            MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
                if(db_err) reject(db_err);
                console.log("into resolve");
                var dbase = db.db("lucky");
                console.log("db connected");
                var col = dbase.collection("joiner");
                col.find({draw_id: draw_id}).toArray((find_err,find_result)=>{
                    if(find_err) reject(find_err);
                    console.log(find_result);
                    resolve(find_result);
                    db.close();
                })
            });
        });
    },
    
    getDrawInfo: async function getDrawInfo(draw_id){
        return new Promise((resolve,reject)=>{
            console.log("去数据库获得这个draw的一些信息");
            //查询优化，可以只查询某个参数
            MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db)=>{
                if(db_err) reject(db_err);
                console.log("into resolve");
                var dbase = db.db("lucky");
                console.log("db connected");
                var col = dbase.collection("draw");
    
                col.findOne({draw_id: draw_id},(find_err,find_result)=>{
                    if(find_err) reject(find_err);
                    console.log(find_result);
                    resolve(find_result);
                    db.close();
                })
            });
        });
    }
}