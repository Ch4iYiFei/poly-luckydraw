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
var task = require("./task");

router.post("/publish", upload.single("draw"), (req, resback) => {//draw为field，并没使用fieldname
    console.log("/draw/publish");
    var file = req.file;
    //console.log(req.file);
    //console.log(req.body);
    var draw_id = 'draw-' + uuidv1();

    var date_arr = req.body.date.split("-");
    var time_arr = req.body.time.split(":");
    var date = new Date(date_arr[0],date_arr[1]-1,date_arr[2],time_arr[0],time_arr[1]);
    console.log(date.toLocaleString());
    console.log("在这个时间点大概会执行");
    schedule.scheduleJob(date,()=>{
        task.messagesend(draw_id);
    });
    
    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        console.log("文件类型",file.mimetype);
        console.log("文件保存路径", file.path);
        console.log("文件名称",file.filename);
        console.log(req.body.awards);
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
        var awards = JSON.parse(req.body.awards);
        
        var object = {draw_id: draw_id, name: file.filename, publisher:publisher, awards: awards, desc: req.body.desc, date:req.body.date, time: req.body.time, isPublic:req.body.isPublic, joiners: []};
        console.log(object);
        col.insertOne(object, (insert_err,insert_result)=>{
            if(insert_err) throw insert_err;
            console.log("插入抽奖成功");
            //...........
            resback.send({error: null,draw_id: draw_id});
            db.close();
        })
    });
});

router.post("/fetch/public", (req,resback)=>{
    console.log("/draw/fetch/public");
    console.log(req.body);
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;
    //已经拥有的抽奖信息数量
    //var skipnum = req.body.num;
    var limitnum = 2;
    console.log("使用者:",user);

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        //isPublic对所有用户来说是选择条件
        //此处的true可能对与引号有问题
        //优化排序的问题
        //优化一直fetch的问题
        col.find({isPublic: "true", draw_id: {$nin: req.body.owned}}).limit(limitnum).toArray((find_err,find_result)=>{
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

    MongoClient.connect(db_url,{ useNewUrlParser: true }, async (db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");
        
        var col_draw = dbase.collection("draw");
        var col_user = dbase.collection("user");
        var col_joiner = dbase.collection("joiner");


        //addToSet不会添加重复的joiner,
        //upsert在找不到drawid时insert，找不到时update,但是这种情况不可能发送

        var info = await new Promise((resolve,reject)=>{
            col_draw.findOne({draw_id: req.body.draw_id},(find_err,find_result)=>{
                if(find_err) reject(find_err);
                console.log("不得已只能去查询一下draw表，updateResult太垃圾了");
                resolve(find_result);
            })
        }).catch((err)=>{throw err});

        if(info == null){
            console.log("没找到这个抽奖，却还有人想抽奖");
            resback.status(404).send({error: "该抽奖不存在或已被删除"});
            db.close();
        }else if(!timeCheck(info)){
            console.log("时间过le还抽奖？？？");
            resback.status(404).send({error: "该抽奖已经已开奖，去看看别的吧"});
            db.close();
        }else{
            await new Promise((resolve,reject)=>{
                col_draw.updateOne({draw_id: req.body.draw_id},{$addToSet:{joiners: joiner}},(update_err,update_result)=>{
                    if(update_err) reject(update_err);
                    console.log("抽奖中更新用户成功");
                    resolve(update_result);
                })
            })
            await new Promise((resolve,reject)=>{
                col_joiner.insertOne({id: joiner, draw_id: req.body.draw_id, formId: req.body.formId, result: null}, (insert_err,insert_result)=>{
                    if(insert_err) reject(insert_err);
                    console.log("加入formId成功");
                    resolve(insert_result);
                });
            })
            resback.send({error: null});
            db.close();
        }

        //一般find需要通过Toarray，findOne不需要
        
    });
});


router.post("/delete",(req,resback)=>{
    console.log("/draw/delete");
    console.log(req.body);
    var token = req.body.jwt;
    var deleter = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col_draw = dbase.collection("draw");
        var col_joiner = dbase.collection("joiner");
        col_draw.findOne({draw_id: req.body.draw_id}, (find_err,find_result)=>{
            if(find_err) throw find_err;
            console.log(find_result);
            if(find_result == null){
                console.log("删除了一个已经不存在的抽奖");
                resback.status(404).send({error: "删除了不存在的抽奖"});
                db.close();
            }else if(!timeCheck(find_result)){
                console.log("时间已经过了，不能删除");
                resback.status(404).send({error:"不能删除已经开奖的抽奖"});
                db.close();
            }else if(deleter == find_result.publisher){
                console.log("是发布者发来的删除");
                col_draw.deleteOne({draw_id: req.body.draw_id},(delete_err1, delete_result1)=>{
                    if(delete_err1) throw delete_err1;
                    console.log("删除draw表抽奖成功");
                    col_joiner.deleteMany({draw_id: req.body.draw_id},(delete_err2, delete_result2)=>{
                        if(delete_err2) throw delete_err2;
                        console.log("formid全灭");
                        resback.send({error: null});
                        db.close();
                    })
                    
                })
            }else
                console.log("未知的删除者");
        })
    });

});

router.post("/findOne",(req,resback)=>{
    console.log("/draw/findOne");
    console.log(req.body);
    var token = req.body.jwt;
    var finder = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        var col_joiner = dbase.collection("joiner");
        col.findOne({draw_id: req.body.draw_id}, (find_err,find_result_in_draw)=>{
            if(find_err) throw find_err;
            console.log(find_result_in_draw);
            if(!find_result_in_draw){
                console.log("查询了一个已经不存在的抽奖");
                resback.status(404).send({error: "该抽奖不存在或已被删除"});
                db.close();
            }else{
                console.log("查询抽奖成功");
                col_joiner.findOne({id: finder, draw_id: req.body.draw_id},{projection:{'result': 1,'_id': 0}},(find_err,find_result_in_joiner)=>{
                    if(find_err) throw find_err;
                
                    console.log(find_result_in_joiner);
                    resback.send(Object.assign(find_result_in_draw,find_result_in_joiner));
                    db.close();
                })
            }
            
        })
    });
})

router.post("/findResult",(req,resback)=>{
    console.log("/draw/findResult");
    console.log(req.body);
    var token = req.body.jwt;
    var finder = jwt.decode(token,secret).iss;

    MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        var col_joiner = dbase.collection("joiner");
        col_joiner.findOne({id: finder, draw_id: req.body.draw_id},{projection:{'result': 1,'_id': 0}},(find_err,find_result)=>{
            if(find_err) throw find_err;

            console.log(find_result);
            resback.send(find_result);
            db.close();
        })
    });
})




router.post("/fetch/userDraw", (req,resback)=>{
    console.log("/draw/fetch/userDraw");
    console.log(req.body);
    var token = req.body.jwt;
    var user = jwt.decode(token,secret).iss;
    //已经拥有的抽奖信息数量
    //var skipnum = req.body.num;
    //var limitnum = 2;
    console.log("用户",user);

        MongoClient.connect(db_url,{ useNewUrlParser: true }, async (db_err,db) => {
            if(db_err) throw db_err;
            var dbase = db.db("lucky");
            console.log("db connected");

            var col_draw = dbase.collection("draw");
            var col_joiner = dbase.collection("joiner");
            
            var joinedDraw = await new Promise((resolve,reject)=>{
                col_draw.find({"joiners":{$all:[user]}}).toArray((find_err,find_result)=>{
                    if(find_err) reject(find_err);
                    //可能没参与过
                    resolve(find_result);
                })
            }).catch((err)=>{throw err});

            var publishedDraw = await new Promise((reslove,reject)=>{
                col_draw.find({publisher: user}).toArray((find_err,find_result)=>{
                    if(find_err) reject(find_err);
                    reslove(find_result);
                })
            }).catch((err)=>{throw err});

            var awardList = await new Promise((reslove,reject)=>{
                col_joiner.aggregate([
                    {$match:
                        {
                            id: user,
                            result: {$gte: 0}
                        }
        
                    },
                    {$lookup:
                        {
                            from: "draw",
                            localField: "draw_id",
                            foreignField: "draw_id",
                            as: "detached"
                        }
                    }
                ]).toArray((agg_err,agg_result)=>{
                    if(agg_err) reject(agg_err);
                    //console.log(JSON.stringify(agg_result));
                    reslove(agg_result)
                })
            }).catch((err)=>{throw err});


            //可能会对一个空的数组map
            let luckyArr = awardList.map((val, index, arr) => {
                return Object.assign(val.detached[0],val.result);
            })

            db.close();
            var sendObj = {joinArr: joinedDraw,publishArr: publishedDraw,luckyArr: luckyArr};
            
            console.log("送了一大堆出去");
            resback.send(sendObj);
        });
    

    // MongoClient.connect(db_url,{ useNewUrlParser: true },(db_err,db) => {
    //     if(db_err) throw db_err;
    //     var dbase = db.db("lucky");
    //     console.log("db connected");

    //     var col = dbase.collection("draw");
    //     //isPublic对发布者不是限制
    //     col.find({publisher: publisher}).skip(skipnum).limit(limitnum).toArray((find_err,find_result)=>{
    //         if(find_err)  throw find_err;
    //         console.log(find_result);
    //         resback.send(find_result);
    //         db.close();
    //     });
    // });

});


function timeCheck(result){
    var date_arr = result.date.split("-");
    var time_arr = result.time.split(":");
    var date = new Date(date_arr[0],date_arr[1]-1,date_arr[2],time_arr[0],time_arr[1]);
    var dateNow = new Date();
    if(date.getTime()<dateNow.getTime()){
        return false;
    }else{
        return true;
    }
}

router.get("/test",(req,resback)=>{
    console.log("/draw/test");
    var draw_id = "draw-34050ce0-94d2-11e9-b85e-f7377ee955d8";
    //messageSend(draw_id);
    //var date = new Date(2019, 5, 24, 19, 42, 0);
    //var date2 = new Date(2019, 6, 24, 19, 45, 0);


    // var j = schedule.scheduleJob(date,()=>{
    //     // getAllId(draw_id).then(()=>{
    //     //     console.log("执行完毕");
    //     // })
    //     console.log("真的想执行一次");
    // })
    // var k = schedule.scheduleJob(date2,()=>{
    //     // getAllId(draw_id).then(()=>{
    //     //     console.log("执行完毕");
    //     // })
    //     console.log("真的想执行一次");
    // })
    MongoClient.connect(db_url,{ useNewUrlParser: true },async (db_err,db) => {
        if(db_err) throw db_err;
        var dbase = db.db("lucky");
        console.log("db connected");

        var col = dbase.collection("draw");
        var col_joiner = dbase.collection("joiner");

        var awardList = await new Promise((reslove,reject)=>{
            col_joiner.aggregate([
                {$match:
                    {
                        id: "oSv7E5EDu4PRZnVkUhbwGIG5uR6c",
                        result: {$gte: 0}
                    }
    
                },
                {$lookup:
                    {
                        from: "draw",
                        localField: "draw_id",
                        foreignField: "draw_id",
                        as: "detached"
                    }
                }
            ]).toArray((agg_err,agg_result)=>{
                if(agg_err) reject(agg_err);
                //console.log(JSON.stringify(agg_result));
                reslove(agg_result)
            })
        }).catch((err)=>{throw err});

        console.log(awardList);

        //可能会对一个空的数组map
        let luckyArr = awardList.map((val, index, arr) => {
            console.log(val.result);
            console.log(val.detached[0]);
            var res = Object.assign(val.detached[0],{"result:": val.result});
            console.log(res);
            return res;
        })


        resback.send(luckyArr);
        // col.find({draw_id: {$nin:[]}}).toArray((find_err,find_result)=>{
        //     if(find_err) throw find_err;
        //     console.log("sgffdggdgf");
        //     resback.send(find_result);
        //     db.close();
        // });
        //isPublic对发布者不是限制
        // col.find({"joiners":{$all:["oSv7E5EDu4PRZnVkUhbwGIG5uR6c"]}}).toArray((find_err,find_result)=>{
        //     if(find_err)  throw find_err;
        //     console.log(find_result);
        //     resback.send(find_result);
        //     db.close();
        // });
        

    });
    
    //resback.send({error: null});
});

module.exports = router;