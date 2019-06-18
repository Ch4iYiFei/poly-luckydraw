var router = require("express").Router();

router.get("/login", (req, res) => {
    res.send("get login message");
});

module.exports = router;