const router = require("express").Router();

router.use("/user", require("./user.routes"));
router.use("/social", require("./social.routes"));
router.use("/swap", require("./swap.routes"));
router.use("/public", require("./public.routes"));
router.use("/stake", require("./stake.routs"));
router.use("/ai", require("./ai.routs"));

// router.use("/seeder", require("./seeder"));

module.exports = router;
