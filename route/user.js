var router = require("express").Router();
var fs = require("fs");

router.get("/login", (req, res) => {
    res.send("get login message");
 //   console.log(req.method+req.statusCode);
  //  console.log(req);
    console.log(req.body);
    var appid = "wx55bd9c881859ddb5";
    var appsecret = fs.readFileSync("AppSecret");
    console.log(appsecret);
    var url = "https://api.weixin.qq.com/sns/jscode2session?appid="+appid+"&secret="+appsecret+"&js_code="+req.body+"&grant_type=authorization_code";
});

module.exports = router;