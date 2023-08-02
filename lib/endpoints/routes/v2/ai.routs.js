const { authMiddleware, inputValidator } = require("../../../middlewares");
const { aiValidation } = require("../../validations");
const { aiController } = require("../../controllers");
const { aiPlanController } = require("../../controllers");
const router = require("express").Router();

router
	.route("/imagine")
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(aiValidation.imagine),
		aiController.imagine);

router
	.route("/upscale")
	.post(authMiddleware.userAuthMiddleware,
		inputValidator(aiValidation.upscale),
		aiController.upscale);

router.route("/progress/:taskId").get(
	authMiddleware.userAuthMiddleware,
	// inputValidator(aiValidation.imagine),
	aiController.progress
);

router.route("/styles").get(authMiddleware.userAuthMiddleware, aiPlanController.styles);

router.route("/give").post(aiPlanController.give);

module.exports = router;