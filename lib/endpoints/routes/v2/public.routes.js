const { inputValidator, authMiddleware } = require("../../../middlewares");
const { boxValidation, lensValidation, aiValidation } = require("../../validations");
const { boxV2Controller, lensV2Controller, aiPlanController } = require("../../controllers");
const router = require("express").Router();

router.route("/box/auction").get(
    authMiddleware.userAuthMiddlewareNotForce,
    inputValidator(boxValidation.getBoxAuctions),
    boxV2Controller.getBoxAuctions);

router.route("/lens/auction").get(inputValidator(lensValidation.getLensAuctions), lensV2Controller.getLensAuctions);

router.route("/box-level").get(
    authMiddleware.userAuthMiddlewareNotForce,
    boxV2Controller.getBoxLevel
);

router.route("/plans").get(
    authMiddleware.userAuthMiddleware,
    inputValidator(aiValidation.getPlans),
    aiPlanController.getPlans
);

module.exports = router;
