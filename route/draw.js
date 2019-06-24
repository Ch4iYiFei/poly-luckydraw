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
var Agenda = require("agenda");


const agenda_options = {db: {
    address: 'mongodb://127.0.0.1:27017/agenda',
    collection: 'agendaJobs',
    options: { auto_reconnect: true, useNewUrlParser:true }
  }
}

var agenda = new Agenda(agenda_options);

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

function defineJob(agenda) {
    console.log(`Defining ${JOB_NAME} job`);
    agenda.define(JOB_NAME, jobFunction);
}

async function jobFunction(job, done) {
    
    let item = db.findById(itemId);

    let success = await tryDoTheThing(item);

    if (!success) {
        throw new Error(`Failed to do the thing in myJobName job, itemId ${itemId}`);
    }
    done(success);
}

async function messageSend(draw_id){
    //其实感觉下面两个await可以并发，但是不知道怎么写
    var ids = await getAllId(draw_id).catch((err)=>{
        throw err;
    });
    var info = await getDrawInfo(draw_id).catch((err)=>{
        throw err;
    });
    var body = await getToken().catch((err)=>{
        throw err;
    });

    console.log(body);
    var response = JSON.parse(body);
    console.log(response.access_token);

    //处理没有抽奖着的问题
    ids.forEach(element => {
        //console.log("element:",element);
        //console.log("element.ID",element.id);
        //console.log("element.formId",element.formId);
        console.log("开始发送消息");
        var messageData = {
            "touser": element.id,
            "template_id": "_jZtBpX7u2NlIi6y-f8bCttH-75A2Ix2IEd3QthfzKE",
            //"page": "pages/detail/detail?",
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
        
        request(options,(err, res, body)=>{
            console.log("应该已经发送了模版消息");
            console.log(res.body);
        })
    
    });

    
}

async function getToken(){
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
}

async function getAllId(draw_id){
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
}

async function getDrawInfo(draw_id){
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

router.post("/publish", upload.single("draw"), (req, resback) => {//draw为field，并没使用fieldname
    console.log("/draw/publish");
    var file = req.file;
    //console.log(req.file);
    //console.log(req.body);
    var draw_id = 'draw-' + uuidv1();

    // agenda.define(draw_id, (job,done) => {
    //     console.log("正在使用agenda");
    //     done();
    // });
    
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
        // var pub = req.body.isPublic;
        // console.log(pub.toString());
        // console.log(new Boolean(pub).valueOf());


        var token = req.body.jwt;
        var publisher = jwt.decode(token,secret).iss;
        console.log("发布者",publisher);
        
        var object = {draw_id: draw_id, name: file.filename, publisher:publisher, award: req.body.award, desc: req.body.desc, date:req.body.date, time: req.body.time, isPublic:req.body.isPublic, joiners: []};
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
    var limitnum = 2;
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

router.post("/fetch/public", (req,resback)=>{
    console.log("/draw/fetch/public");
    console.log(req.body);
    var token = req.body.jwt;
    var publisher = jwt.decode(token,secret).iss;
    //已经拥有的抽奖信息数量
    var skipnum = req.body.num;
    var limitnum = 2;
    console.log("发布者",publisher);

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        //isPublic对所有用户来说是选择条件
        //此处的true可能对与引号有问题
        //优化排序的问题
        //优化一直fetch的问题
        col.find({isPublic: "true"}).skip(skipnum).limit(limitnum).toArray((find_err,find_result)=>{
            if(find_err)  throw find_err;
            console.log(find_result);
            resback.send({arr: find_result});
            db.close();
        });
    });

});

router.post("/join", (req,resback)=>{
    console.log("/draw/join");
    console.log(req.body);
    var token = req.body.jwt;
    var joiner = jwt.decode(token,secret).iss;
    console.log("参与者",joiner);

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");
        
        var col_draw = dbase.collection("draw");
        var col_user = dbase.collection("user");
        var col_joiner = dbase.collection("joiner");

        //addToSet不会添加重复的joiner,
        //upsert在找不到drawid时insert，找不到时update,但是这种情况不可能发送
        col_draw.updateOne({draw_id: req.body.draw_id},{$addToSet:{joiners: joiner}}, (update_err1,update_result1)=>{
            if(update_err1) throw update_err1;
            console.log("抽奖中更新用户成功");
            //...........
            col_user.updateOne({id: joiner},{$addToSet:{draws: req.body.draw_id}}, (update_err2,update_result2)=>{
                if(update_err2) throw update_err2;
                console.log("用户中更新抽奖成功");
                //...........
                col_joiner.insertOne({id: joiner, draw_id: req.body.draw_id, formId: req.body.formId}, (insert_err,insert_result)=>{
                    if(insert_err) throw insert_err;
                    console.log("加入formId成功");
                    resback.send({error: null});
                    db.close();
                });
            });
        });

        //一般find需要通过Toarray，findOne不需要
        // col.findOne({draw_id: req.body.draw_id}, (find_err,find_result)=>{
        //     if(find_err) throw find_err;
        //     console.log(find_result);
        //     console.log(find_result.draw_id);
        //     console.log(find_result.joiners);
        //     resback.send(find_result.joiners);
        //     db.close();
        // })
        
    });
});

router.get("/test",(req,resback)=>{
    console.log("/draw/test");
    //messageSend("draw-34050ce0-94d2-11e9-b85e-f7377ee955d8");

    var draw_id = "draw-34050ce0-94d2-11e9-b85e-f7377ee955d8";
    agenda.define(draw_id,{ priority: 'high', concurrency: 3 },(job,done)=>{
        getAllId(draw_id)
        .then(()=>done())
        .catch((err)=>{throw err});
    })

    //agenda.every("30 seconds",draw_id);
    (async function() {
        await agenda.start();
        await agenda.schedule('0 0 19 24 6 ？2019', draw_id, {}, {timezone: 'Asia/Shanghai'});
        
      })();

    // agenda.on('ready',()=>{
    //     agenda.schedule('0 0 19 24 6 ？2019', draw_id, {}, {timezone: 'Asia/Shanghai'})
    //     console.log('agenda测试开始，启动完毕')
    //     agenda.start();
    // })


    resback.send({error: null});
});

module.exports = router;