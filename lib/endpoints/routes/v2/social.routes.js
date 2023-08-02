const { authMiddleware, inputValidator } = require("../../../middlewares");
const { socialValidation } = require("../../validations");
const { postController, feedController, userProfileController } = require("../../controllers");
const { userPostUpload } = require("../../../middlewares/s3Uploader");
const router = require("express").Router();

//post
router
	.route("/post")
	.get(authMiddleware.userAuthMiddleware, inputValidator(socialValidation.index), postController.index)

	.post(
		authMiddleware.userAuthMiddleware,
		userPostUpload.fields([{ name: "file", maxCount: 1 }]),
		inputValidator(socialValidation.store),
		postController.store,
	);

router
	.route("/post/:id")
	.get(authMiddleware.userAuthMiddleware, postController.show)
	.put(authMiddleware.userAuthMiddleware, inputValidator(socialValidation.store), postController.update)
	.delete(authMiddleware.userAuthMiddleware, postController.delete);

router
	.route("/feed")
	.get(authMiddleware.userAuthMiddleware, inputValidator(socialValidation.feed), feedController.index);

router.route("/importTrueCamera").get(userProfileController.index2);

router
	.route("/profile")
	.get(authMiddleware.userAuthMiddleware, inputValidator(socialValidation.profile), userProfileController.show);

module.exports = router;
