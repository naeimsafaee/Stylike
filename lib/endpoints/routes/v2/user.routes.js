const { authMiddleware, inputValidator } = require("../../../middlewares");
const { competitionValidation, userValidation, swapValidation } = require("../../validations");
const { competitionController, swapV2Controller } = require("../../controllers");
const UserController = require("../../controllers/v2/user.controller");
const router = require("express").Router();

router.route("/").get(authMiddleware.userAuthMiddleware, UserController.info);

router.route("/card").get(authMiddleware.userAuthMiddleware, UserController.getUserCard);

router
	.route("/user-competition-images")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(competitionValidation.getUserCompetitionImage),
		competitionController.getUserCompetitionImage,
	);

router
	.route("/user-swap-transactions")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(swapValidation.getUserSwapTransactions),
		swapV2Controller.getUserSwapTransactions,
	);

router
	.route("/nft-wallet-list")
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.WalletCardList),
		UserController.WalletCardList,
	);

router
	.route("/import")
	.post(authMiddleware.userAuthMiddleware, inputValidator(userValidation.importCard), UserController.importCard);

router
	.route("/import-custom")
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.importCustomCard),
		UserController.importCustomCard,
	);

/*router
	.route("/plan/purchase")
	.post(authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.purchasePlan),
		UserController.purchasePlan);*/

router.route("/plan").get(
	authMiddleware.userAuthMiddleware,
	// inputValidator(userValidation.getPlans),
	UserController.getPlan,
);


module.exports = router;
