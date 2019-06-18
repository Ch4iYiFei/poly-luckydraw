var express = require("express");
var router = express.Router();
var fs = require("fs");
var https = require("https");

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
        console.log("https://api.weixin.qq.com/sns/jscode2session?appid="+appid+"&secret="+appsecret+"&js_code="+req.body.code+"&grant_type=authorization_code");
        var options = new URL("https://api.weixin.qq.com/sns/jscode2session?appid="+appid+"&secret="+appsecret+"&js_code="+req.body.code+"&grant_type=authorization_code");
        
        https.request(options, (res) => {
            console.log(res.statusCode);
            console.log(res);
        });
    }
    res.send("get login message");
});

module.exports = router;