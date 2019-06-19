var express = require("express");
var router = express.Router();
var fs = require("fs");
var https = require("https");
var qs = require("querystring");
var request = require("request");

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
                resback.send(response.openid);
            }else
                console.log("error occured when accesing weixinserver");
        })
    }else
        console.log("no code get");
});

module.exports = router;