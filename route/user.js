var router = require("express").Router();

router.get("/login", (req, res) => {
    res.send("get login message");
    console.log(req.baseUrl);
});

module.exports = router;