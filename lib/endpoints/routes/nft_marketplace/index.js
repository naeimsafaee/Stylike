const router = require("express").Router();

router.use("/user", require("./user.routes"));
router.use("/public", require("./public.routes"));

// router.use("/seeder", require("./seeder"));

module.exports = router;
