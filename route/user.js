var express = require("express");
var router = express.Router();
var fs = require("fs");


router.post("/login", (req, res) => {
    //   console.log(req.method+req.statusCode);
    console.log("/usr/login");
    console.log(req.body);
    // console.log(req.method);
    // console.log(req.protocol);
    var appid = "wx55bd9c881859ddb5";
    var appsecret = fs.readFileSync("AppSecret").toString();
    console.log(appsecret);

    if(req.body.code){
        console.log(req.body.code);
    }
    var url = "https://api.weixin.qq.com/sns/jscode2session?appid="+appid+"&secret="+appsecret+"&js_code="+req.body+"&grant_type=authorization_code";
    res.send("get login message");
});

module.exports = router;