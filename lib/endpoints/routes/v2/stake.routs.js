const { authMiddleware, inputValidator } = require("../../../middlewares");
const { financialValidation, nftStakeValidation } = require("../../validations");
const { stakeController, nftStakeController } = require("../../controllers");
const router = require("express").Router();

router
	.route("/styl")
	.get(
		// authMiddleware.userAuthMiddleware,
		stakeController.index,
	)
	.post(authMiddleware.userAuthMiddleware, inputValidator(financialValidation.store), stakeController.store);

router
	.route("/styl/:id")
	.put(authMiddleware.userAuthMiddleware, inputValidator(financialValidation.update), stakeController.update);

router
	.route("/styl-stake-history")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(financialValidation.stylStakeHistory),
		stakeController.stylStakeHistory,
	);

router.route("/styl-statistic").get(stakeController.stylStakeStatistic);

router
	.route("/nft")
	.get(nftStakeController.getAllNftStake)
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(nftStakeValidation.storeNftStake),
		nftStakeController.storeNftStake,
	).delete(
	authMiddleware.userAuthMiddleware,
	inputValidator(nftStakeValidation.deleteNftStake),
	nftStakeController.deleteNftStake);

router.route("/assignedCards").get(authMiddleware.userAuthMiddleware, nftStakeController.getQualifiedAssignedCards);

router
	.route("/nft-stake-history")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(nftStakeValidation.nftStakeHistory),
		nftStakeController.nftStakeHistory,
	);

module.exports = router;
