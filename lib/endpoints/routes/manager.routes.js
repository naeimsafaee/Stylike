const router = require("express").Router();
const {
	managerController,
	auctionController,
	transactionController,
	userController,
	blogController,
	languageController,
	cardController,
	heatCardController,
	managerLogController,
	membershipController,
	holdingController,
	stylStakeController,
	userStylStakeController,
	bonusController,
	competitionController,
	prizeController,
	tokenPrizeController,
	feeController,
	assetNetworkController,
	networkController,
	referralController,
	marketingController,
	ticketController,
	departmentController,
	assetController,
	cardTypeController,
	tokenController,
	matchParticipantController,
	walletController,
	contactUsController,
	emailSubscribeController,
	attributeController,
	boxController,
	lensController,
	emailTemplateController,
	aiController,
} = require("./../controllers");
const {
	managerValidation,
	swapValidation,
	auctionValidation,
	transactionValidation,
	userValidation,
	blogValidation,
	languageValidation,
	cardValidation,
	heatCardValidation,
	managerLogValidation,
	membershipValidation,
	holdingValidation,
	stylStakeValidation,
	userStylStakeValidation,
	bonusValidation,
	competitionValidation,
	prizeValidation,
	feeValidation,
	assetNetworkValidation,
	networkValidation,
	referralValidation,
	marketingValidation,
	ticketValidation,
	departmentValidation,
	assetValidation,
	cardTypeValidation,
	tokenValidation,
	matchParticipantValidation,
	walletValidation,
	contactUsValidation,
	emailSubscribeValidation,
	roleValidation,
	attributeValidation,
	boxValidation,
	lensValidation,
	emailTemplateValidation,
} = require("./../validations");
const { authMiddleware, inputValidator } = require("./../../middlewares");
const {
	avatarUpload,
	blogUpload,
	categoryImageUpload,
	languageUpload,
	gameCardUpload,
	gameCompetitionUpload,
	ticketUpload,
	cardTypeUpload,
	competitionTaskUpload,
	attributeUpload,
} = require("../../middlewares/s3Uploader");

const { permissionMiddleware } = require("../../middlewares/permissionMiddleware");
const { managerLog } = require("../../middlewares/managerLog");
const { assign_to_users, decrease_competition_reward } = require("../controllers/auction.controller");
const { swapController } = require("../controllers");
const getGiveawayController = require("../controllers/manager/giveaway/giveaway.controller");
const { getAllPlansForManager, getAllUserPlans } = require("../controllers/manager/Ai/plan.controller");
const { getAllAi } = require("../controllers/manager/Ai/ai.controller");
const { roleBackCompetitionPrize } = require("../controllers/competition.controller");

router.route("/").get(authMiddleware.managerAuthMiddleware, managerController.info);

//get list admins

router.route("/manager").get(authMiddleware.managerAuthMiddleware, managerController.getManagers);

router.route("/login").post(inputValidator(managerValidation.login), managerController.login);
router
	.route("/login_checkcode")
	.post(inputValidator(managerValidation.checkManagerLoginCode), managerController.checkManagerLoginCode);

router.route("/logout").get(authMiddleware.managerAuthMiddleware, managerController.logout);

router
	.route("/password")
	.post(
		//	rateLimit.rateLimitMiddleware,
		inputValidator(managerValidation.forgetPassword),
		managerController.forgetPassword,
	)
	.patch(inputValidator(managerValidation.resetPassword), managerController.resetPassword);

router.route("/verify").post(inputValidator(managerValidation.verify), managerController.verify);

router.route("/refresh-token").get(authMiddleware.managerAuthRefreshMiddleware, managerController.refreshToken);

router
	.route("/auction")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction read"),
		inputValidator(auctionValidation.getAuctions),
		managerLog("auction read"),
		auctionController.getAuctions,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction create"),
		inputValidator(auctionValidation.addAuctionManager),
		managerLog("auction create"),
		auctionController.addAuctionManager,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction update"),
		inputValidator(auctionValidation.editAuction),
		managerLog("auction update"),
		auctionController.editAuctionManager,
	);
router
	.route("/auction/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction read"),
		inputValidator(auctionValidation.getAuction),
		managerLog("auction read"),
		auctionController.getAuction,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction delete"),
		inputValidator(auctionValidation.deleteAuction),
		managerLog("auction delete"),
		auctionController.delAuctionManager,
	);

router
	.route("/auction-offer/")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction read"),
		inputValidator(auctionValidation.getOffersManager),
		managerLog("auction read"),
		auctionController.getOffersManager,
	);

router
	.route("/auction-offer/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auctionOffer read"),
		inputValidator(auctionValidation.getOffer),
		managerLog("auctionOffer read"),
		auctionController.getOffer,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auctionOffer delete"),
		inputValidator(auctionValidation.deleteOffers),
		managerLog("auctionOffer delete"),
		auctionController.deleteOffersManager,
	);

router
	.route("/auction-trades")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auctionTrade read"),
		inputValidator(auctionValidation.getAuctionTradesManager),
		managerLog("auctionTrade read"),
		auctionController.getAuctionTradesManager,
	);
router
	.route("/auction-trades/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auctionTrade read"),
		inputValidator(auctionValidation.getAuctionTradeManager),
		managerLog("auctionTrade read"),
		auctionController.getAuctionTradeManager,
	);

///////////////////////////////// User CRUD /////////////////////////////////////////////////
router
	.route("/users")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		inputValidator(userValidation.getUsers),
		managerLog("user read"),
		userController.getUsers,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		avatarUpload.fields([{ name: "avatar", maxCount: 1 }]),
		permissionMiddleware("user create"),
		inputValidator(userValidation.addUsers),
		managerLog("user create"),
		userController.addUsers,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		avatarUpload.fields([{ name: "avatar", maxCount: 1 }]),
		permissionMiddleware("user update"),
		inputValidator(userValidation.editUsers),
		managerLog("user update"),
		userController.editUsers,
	);

router
	.route("/users/excel")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		managerLog("user read"),
		userController.excelExport,
	);

router
	.route("/user/regerrals")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		inputValidator(userValidation.getUsers),
		managerLog("user read"),
		userController.getUsers,
	);

router.route("/users/seed").get(userController.seed_cards);

router
	.route("/users/selector")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		inputValidator(userValidation.getSelector),
		managerLog("user read"),
		userController.getUsersSelector,
	);

router
	.route("/users/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		inputValidator(userValidation.findUserById),
		managerLog("user read"),
		userController.findUserById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user delete"),
		inputValidator(userValidation.findUserById),
		managerLog("user delete"),
		userController.deleteUsers,
	);

///////////////////////////////// Setting CRUD /////////////////////////////////////////////////
router
	.route("/setting")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("setting read"),
		inputValidator(managerValidation.getSettings),
		managerLog("setting read"),
		managerController.getSettings,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("setting create"),
		inputValidator(managerValidation.addSetting),
		managerLog("setting create"),
		managerController.addSetting,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("setting update"),
		inputValidator(managerValidation.editSetting),
		managerLog("setting update"),
		managerController.editSetting,
	);

router
	.route("/setting/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("setting read"),
		inputValidator(managerValidation.findSettingById),
		managerLog("setting read"),
		managerController.findSettingById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("setting delete"),
		inputValidator(managerValidation.findSettingById),
		managerLog("setting delete"),
		managerController.deleteSetting,
	);
///////////////////////////////// Wallet RU /////////////////////////////////////////////////
router
	.route("/wallet")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("wallet read"),
		inputValidator(managerValidation.getWallets),
		managerLog("wallet read"),
		managerController.getWallets,
	);

router
	.route("/wallet/total")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(managerValidation.getTotalWallets),
		managerLog("transaction update"),
		managerController.getTotalWallets,
	);
// .put(
// 	authMiddleware.managerAuthMiddleware,
// 	permissionMiddleware("wallet update"),
// 	inputValidator(managerValidation.editWallet),
// 	managerController.editWallet,
// );

router
	.route("/wallet/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("wallet read"),
		inputValidator(managerValidation.findWalletById),
		managerLog("wallet read"),
		managerController.findWalletById,
	);

///////////////////////////////// Transaction CRUD /////////////////////////////////////////////////
router
	.route("/transactions")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(transactionValidation.get),
		managerLog("transaction read"),
		transactionController.get,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(transactionValidation.edit),
		managerLog("transaction update"),
		transactionController.edit,
	);
router
	.route("/transactions/finantial-report")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(transactionValidation.getFinancialReport),
		managerLog("transaction read"),
		transactionController.getFinancialReport,
	);
router
	.route("/transactions/:id(\\d+)")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(transactionValidation.getById),
		managerLog("transaction read"),
		transactionController.getById,
	);

router
	.route("/transactions/balances")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		managerLog("transaction read"),
		transactionController.getBalances,
	);
///////////////////////////////// BLOG /////////////////////////////////////////////////

// Blog Translation
router
	.route("/blogs/translation")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement read"),
		inputValidator(blogValidation.getBlogsTranslation),
		managerLog("announcement read"),
		blogController.getBlogsTranslation,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement create"),
		blogUpload.fields([
			{ name: "images", maxCount: 1 },
			{ name: "thumbnails", maxCount: 1 },
		]),
		inputValidator(blogValidation.addBlogTranslation),
		managerLog("announcement create"),
		blogController.addBlogsTranslation,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement update"),
		blogUpload.fields([
			{ name: "images", maxCount: 1 },
			{ name: "thumbnails", maxCount: 1 },
		]),
		inputValidator(blogValidation.editBlogTranslation),
		managerLog("announcement update"),
		blogController.editBlogTranslation,
	);

router
	.route("/blogs/translation/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement read"),
		inputValidator(blogValidation.findById),
		managerLog("announcement read"),
		blogController.findByIBlogTransaltion,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement delete"),
		inputValidator(blogValidation.findById),
		managerLog("announcement delete"),
		blogController.deleteBlogTranslation,
	);

//Blog
router.route("/blogs/uploader").patch(
	authMiddleware.managerAuthMiddleware,
	// blogControler,
	blogUpload.single("file"),
	blogController.blogUploadImage,
);
router
	.route("/blogs")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement read"),
		inputValidator(blogValidation.getBlogs),
		managerLog("announcement read"),
		blogController.getBlogsManager,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement create"),
		blogUpload.fields([
			{ name: "images", maxCount: 1 },
			{ name: "thumbnails", maxCount: 1 },
		]),
		inputValidator(blogValidation.addBlogs),
		managerLog("announcement create"),
		blogController.addBlogs,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement update"),
		blogUpload.fields([
			{ name: "images", maxCount: 1 },
			{ name: "thumbnails", maxCount: 1 },
		]),
		inputValidator(blogValidation.editBlogs),
		managerLog("announcement update"),
		blogController.editBlogs,
	);

router
	.route("/blogs/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement read"),
		inputValidator(blogValidation.findById),
		managerLog("announcement read"),
		blogController.findById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("announcement delete"),
		inputValidator(blogValidation.findById),
		managerLog("announcement delete"),
		blogController.deleteBlogs,
	);

///////////////////////////////// Category /////////////////////////////////////////////////

// Category Translation
router
	.route("/category/translation")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category create"),
		categoryImageUpload.fields([{ name: "images", maxCount: 1 }]),
		inputValidator(managerValidation.addCategoryTranslation),
		managerLog("category create"),
		managerController.addCategoryTranslation,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category read"),
		inputValidator(managerValidation.getCategoriesTranslation),
		managerLog("category read"),
		managerController.getCategoriesTranslation,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category update"),
		categoryImageUpload.fields([{ name: "images", maxCount: 1 }]),
		inputValidator(managerValidation.editCategoryTranslation),
		managerLog("category update"),
		managerController.editCategoryTranslation,
	);
router
	.route("/category/translation/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category read"),
		inputValidator(managerValidation.getCategory),
		managerLog("category read"),
		managerController.getCategoryTranslation,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category delete"),
		inputValidator(managerValidation.deleteCategory),
		managerLog("category delete"),
		managerController.deleteCategoryTranslation,
	);

//Category
router
	.route("/category")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category create"),
		categoryImageUpload.fields([{ name: "images", maxCount: 1 }]),
		inputValidator(managerValidation.addCategory),
		managerLog("category create"),
		managerController.addCategory,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category read"),
		inputValidator(managerValidation.getCategories),
		managerLog("category read"),
		managerController.getCategories,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category update"),
		categoryImageUpload.fields([{ name: "images", maxCount: 1 }]),
		inputValidator(managerValidation.editCategory),
		managerLog("category update"),
		managerController.editCategory,
	);

router
	.route("/category/selector")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category read"),
		inputValidator(managerValidation.categorySelector),
		managerLog("category read"),
		managerController.categorySelector,
	);

router
	.route("/category/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category read"),
		inputValidator(managerValidation.getCategory),
		managerLog("category read"),
		managerController.getCategory,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("category delete"),
		inputValidator(managerValidation.deleteCategory),
		managerLog("category delete"),
		managerController.deleteCategory,
	);

router
	.route("/language")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("language create"),
		languageUpload.fields([{ name: "flag", maxCount: 1 }]),
		inputValidator(languageValidation.addLanguage),
		managerLog("language create"),
		languageController.addLanguage,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("language update"),
		languageUpload.fields([{ name: "flag", maxCount: 1 }]),
		inputValidator(languageValidation.editLanguage),
		managerLog("language update"),
		languageController.editLangauge,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("language read"),
		inputValidator(languageValidation.getLanguages),
		managerLog("language read"),
		languageController.getAllLanguages,
	);

router
	.route("/language/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("language read"),
		inputValidator(languageValidation.findLanguageById),
		managerLog("language read"),
		languageController.getLanguageById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("language delete"),
		inputValidator(languageValidation.findLanguageById),
		managerLog("language delete"),
		languageController.deleteLanguage,
	);

///////////////////////////////// Card CRUD /////////////////////////////////////////////////
router
	.route("/card")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(cardValidation.getCards),
		managerLog("card read"),
		cardController.getCards,
	)
	// .post(
	// 	authMiddleware.managerAuthMiddleware,
	// 	gameCardUpload.fields([{ name: "image", maxCount: 1 }]),
	// 	inputValidator(cardValidation.addCard),
	// 	cardController.addCard,
	// )
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		inputValidator(cardValidation.editCard),
		managerLog("card update"),
		cardController.editCard,
	);
router
	.route("/card/selector")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(cardValidation.cardSelector),
		managerLog("card read"),
		cardController.cardSelector,
	);
router
	.route("/card/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(cardValidation.getCard),
		managerLog("card read"),
		cardController.getCard,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card delete"),
		inputValidator(cardValidation.deleteCard),
		managerLog("card delete"),
		cardController.deleteCard,
	);

router
	.route("/attribute_to_users")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		managerLog("card read"),
		assign_to_users,
	);

router
	.route("/decrease_competition_reward")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		managerLog("card read"),
		decrease_competition_reward,
	);

/////////////card count///////

// router
// 	.route("/card-count")
// 	.get(authMiddleware.managerAuthMiddleware, inputValidator(cardValidation.cardCount), cardController.cardCount);

///////////////////////////////// Heat Card CRUD /////////////////////////////////////////////////
router
	.route("/heat-card")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(heatCardValidation.getHeatCards),
		managerLog("card read"),
		heatCardController.getHeatCards,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		inputValidator(heatCardValidation.editHeatCard),
		managerLog("card read"),
		heatCardController.editHeatCard,
	);

router
	.route("/heat-card/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(heatCardValidation.getHeatCardById),
		managerLog("card read"),
		heatCardController.getHeatCardById,
	);

///////////////////////////////// Membership CRUD /////////////////////////////////////////////////
router
	.route("/membership")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(membershipValidation.getMemberships),
		managerLog("transaction read"),
		membershipController.getMemberships,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction add"),
		inputValidator(membershipValidation.addMembership),
		managerLog("transaction read"),
		membershipController.addMembership,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(membershipValidation.editMembership),
		managerLog("transaction update"),
		membershipController.editMembership,
	);

router
	.route("/membership/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(membershipValidation.getMembershipById),
		managerLog("transaction read"),
		membershipController.getMembershipById,
	);

///////////////////////////////// Holding CRUD /////////////////////////////////////////////////
router
	.route("/holding")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(holdingValidation.getHoldings),
		managerLog("transaction read"),
		holdingController.getHoldings,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction add"),
		inputValidator(holdingValidation.addHolding),
		managerLog("transaction add"),
		holdingController.addHolding,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(holdingValidation.editHolding),
		managerLog("transaction update"),
		holdingController.editHolding,
	);

router
	.route("/holding/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(holdingValidation.getHoldingById),
		managerLog("transaction read"),
		holdingController.getHoldingById,
	);
///////////////////////////////// Styl Stake CRUD /////////////////////////////////////////////////
router
	.route("/styl-stake")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("stake browse"),
		inputValidator(stylStakeValidation.getStylStakes),
		managerLog("stake browse"),
		stylStakeController.getStylStakes,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("stake create"),
		inputValidator(stylStakeValidation.addStylStake),
		managerLog("stake create"),
		stylStakeController.addStylStake,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("stake update"),
		inputValidator(stylStakeValidation.editStylStake),
		managerLog("stake update"),
		stylStakeController.editStylStake,
	);

router
	.route("/styl-stake/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("stake read"),
		inputValidator(stylStakeValidation.getStylStakeById),
		managerLog("stake read"),
		stylStakeController.getStylStakeById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("stake delete"),
		inputValidator(stylStakeValidation.deleteStylStake),
		managerLog("stake delete"),
		stylStakeController.deleteStylStake,
	);

///////////////////////////////// Styl Stake CRUD /////////////////////////////////////////////////
router
	.route("/user-styl-stake")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(userStylStakeValidation.getUserStylStakes),
		managerLog("transaction update"),
		userStylStakeController.getUserStylStakes,
	);

router
	.route("/user-styl-stake/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(userStylStakeValidation.getUserStylStakeById),
		managerLog("transaction update"),
		userStylStakeController.getUserStylStakeById,
	);

///////////////////////////////// Manager Log CRUD /////////////////////////////////////////////////
router
	.route("/manager-log")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(managerLogValidation.getManagerLogs),
		managerLog("transaction update"),
		managerLogController.getManagerLogs,
	);

router
	.route("/manager-log/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(managerLogValidation.getManagerLogById),
		managerLog("transaction update"),
		managerLogController.getManagerLogById,
	);

///////////////////////////////// bonus CRUD /////////////////////////////////////////////////
router
	.route("/bonus")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("bonus read"),
		inputValidator(bonusValidation.getBonuses),
		managerLog("bonus read"),
		bonusController.getBonuses,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("bonus create"),
		inputValidator(bonusValidation.addBonus),
		managerLog("bonus create"),
		bonusController.addBonus,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("bonus update"),
		inputValidator(bonusValidation.editBonus),
		managerLog("bonus update"),
		bonusController.editBonus,
	);
router
	.route("/bonus/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("bonus read"),
		inputValidator(bonusValidation.getBonus),
		managerLog("bonus read"),
		bonusController.getBonus,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("bonus delete"),
		inputValidator(bonusValidation.delBonus),
		managerLog("bonus delete"),
		bonusController.delBonus,
	);
///////////////////////////////// ??? CRUD /////////////////////////////////////////////////
router
	.route("/user-bonus")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("userBonus read"),
		inputValidator(bonusValidation.getUserBonus),
		managerLog("userBonus read"),
		bonusController.getUserBonus,
	);

router
	.route("/assigned-card")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(cardValidation.createAssignedCard),
		managerLog("card create"),
		cardController.createAssignedCard,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(cardValidation.getAssignedCard),
		managerLog("card read"),
		cardController.getAssignedCard,
	);

///////////////////////////////// SWAP CRUD /////////////////////////////////////////////////
router
	.route("/swaps")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction read"),
		inputValidator(transactionValidation.getSwaps),
		managerLog("transaction read"),
		transactionController.getSwaps,
	);

router
	.route("/user/attributes/:userId")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		inputValidator(userValidation.UserAttribute),
		managerLog("user read"),
		userController.getAttributes,
	);

router
	.route("/user/attributes/:attributeId")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user update"),
		inputValidator(userValidation.EditUserAttribute),
		managerLog("user update"),
		userController.editAttribute,
	);

router
	.route("/user/referred/:userId")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		inputValidator(userValidation.getUserReferrals),
		managerLog("user read"),
		userController.getUserReferrals,
	);
// .search(
//   authMiddleware.managerAuthMiddleware,
//   inputValidator(transactionValidation.search),
//   transactionController.search
// )
// .put(
// 	authMiddleware.managerAuthMiddleware,
// 	// permissionMiddleware("transaction update"),
// 	inputValidator(transactionValidation.edit),
// 	transactionController.edit,
// );

router
	.route("/count_competition_participant")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.countCompetitionParticipant),
		managerLog("competition read"),
		competitionController.countCompetitionParticipant,
	);
router
	.route("/competition_rank")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.competitionRank),
		managerLog("competition read"),
		competitionController.competitionRank,
	);

router
	.route("/competition")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getCompetitions),
		managerLog("competition read"),
		competitionController.getCompetitions,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition create"),
		inputValidator(competitionValidation.addCompetition),
		managerLog("competition create"),
		competitionController.addCompetition,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition update"),
		inputValidator(competitionValidation.editCompetition),
		managerLog("competition update"),
		competitionController.editCompetition,
	);

router
	.route("/competition/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getCompetition),
		managerLog("competition read"),
		competitionController.getCompetition,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition delete"),
		inputValidator(competitionValidation.delCompetition),
		managerLog("competition delete"),
		competitionController.delCompetition,
	);

router
	.route("/competition-league")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getCompetitionLeagues),
		managerLog("competition read"),
		competitionController.getCompetitionLeagues,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition create"),
		gameCompetitionUpload.fields([{ name: "image", maxCount: 1 }]),
		inputValidator(competitionValidation.addCompetitionLeague),
		managerLog("competition create"),
		competitionController.addCompetitionLeague,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition update"),
		gameCompetitionUpload.fields([{ name: "image", maxCount: 1 }]),
		inputValidator(competitionValidation.editCompetitionLeague),
		managerLog("competition update"),
		competitionController.editCompetitionLeague,
	);

router
	.route("/competition-league/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getCompetitionLeague),
		managerLog("competition read"),
		competitionController.getCompetitionLeague,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition delete"),
		inputValidator(competitionValidation.delCompetitionLeague),
		managerLog("competition delete"),
		competitionController.delCompetitionLeague,
	);

// Competition Task
router
	.route("/competition-task")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getCompetitionTasksByManager),
		managerLog("competition read"),
		competitionController.getCompetitionTasksByManager,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition create"),
		competitionTaskUpload.fields([{ name: "image", maxCount: 1 }]),
		inputValidator(competitionValidation.addCompetitionTask),
		managerLog("competition create"),
		competitionController.addCompetitionTask,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition update"),
		competitionTaskUpload.fields([{ name: "image", maxCount: 1 }]),
		inputValidator(competitionValidation.editCompetitionTask),
		managerLog("competition update"),
		competitionController.editCompetitionTask,
	);

router
	.route("/competition-task/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getCompetitionTaskByManager),
		managerLog("competition read"),
		competitionController.getCompetitionTaskByManager,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition delete"),
		inputValidator(competitionValidation.delCompetitionTask),
		managerLog("competition delete"),
		competitionController.delCompetitionTask,
	);

///////////////////////////////// Prize /////////////////////////////////////////////////

router
	.route("/prize")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("prize read"),
		inputValidator(prizeValidation.getPrizes),
		managerLog("prize read"),
		prizeController.getPrizes,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("prize create"),
		inputValidator(prizeValidation.addPrize),
		managerLog("prize create"),
		prizeController.addPrize,
	);

router
	.route("/prize/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("prize read"),
		inputValidator(prizeValidation.getPrize),
		managerLog("prize read"),
		prizeController.getPrize,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("prize update"),
		inputValidator(prizeValidation.editPrize),
		managerLog("prize update"),
		prizeController.editPrize,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("prize delete"),
		inputValidator(prizeValidation.delPrize),
		managerLog("prize delete"),
		prizeController.delPrize,
	);

router
	.route("/prize-user/")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("prizeUser read"),
		inputValidator(prizeValidation.getUserPrizeManager),
		managerLog("prizeUser read"),
		prizeController.getUserPrizeManager,
	);
////////////////////////////////// Token Prize //////////////////////////////////
router
	.route("/token-prize")
	.get(
		authMiddleware.managerAuthMiddleware,
		inputValidator(prizeValidation.getTokenPrizes),
		tokenPrizeController.getTokenPrizes,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		inputValidator(prizeValidation.addTokenPrize),
		tokenPrizeController.addTokenPrize,
	);

router
	.route("/token-prize/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		inputValidator(prizeValidation.getTokenPrize),
		tokenPrizeController.getTokenPrize,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		inputValidator(prizeValidation.editTokenPrize),
		tokenPrizeController.editTokenPrize,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		inputValidator(prizeValidation.getTokenPrize),
		tokenPrizeController.delTokenPrize,
	);

////////////////////////////////// Giveaway //////////////////////////////////

router
	.route("/giveaway")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("wallet update"),
		inputValidator(prizeValidation.getGiveaways),
		managerLog("wallet update"),
		getGiveawayController.getGiveaways,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("wallet update"),
		inputValidator(prizeValidation.addGiveaway),
		managerLog("wallet update"),
		getGiveawayController.addGiveaway,
	);

router
	.route("/giveaway/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("wallet update"),
		inputValidator(prizeValidation.getGiveaway),
		managerLog("wallet update"),
		getGiveawayController.getGiveaway,
	);
// .put(
//     authMiddleware.managerAuthMiddleware,
//     permissionMiddleware("wallet update"),
//     inputValidator(prizeValidation.editGiveaway),
//     getGiveawayController.editGiveaway
// )
// .delete(
//     authMiddleware.managerAuthMiddleware,
//     permissionMiddleware("wallet update"),
//     inputValidator(prizeValidation.getGiveaway),
//     getGiveawayController.delGiveaway
// );

router
	.route("/fees")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("fee read"),
		inputValidator(feeValidation.getAll),
		managerLog("fee read"),
		feeController.getAll,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("fee create"),
		inputValidator(feeValidation.addFees),
		managerLog("fee create"),
		feeController.addFees,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("fee update"),
		inputValidator(feeValidation.editFees),
		managerLog("fee update"),
		feeController.editFees,
	);

router
	.route("/fees/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("fee read"),
		inputValidator(feeValidation.feeById),
		managerLog("fee read"),
		feeController.getFeeById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("fee delete"),
		inputValidator(feeValidation.feeById),
		managerLog("fee delete"),
		feeController.deleteFees,
	);

router
	.route("/assetNetwork")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("assetNetwork read"),
		inputValidator(assetNetworkValidation.assetNetwork),
		managerLog("assetNetwork read"),
		assetNetworkController.assetNetwork,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("assetNetwork create"),
		inputValidator(assetNetworkValidation.addAssetNetwork),
		managerLog("assetNetwork create"),
		assetNetworkController.addAssetNetwork,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("assetNetwork update"),
		inputValidator(assetNetworkValidation.editAssetNetwork),
		managerLog("assetNetwork update"),
		assetNetworkController.editAssetNetwork,
	);

router
	.route("/assetNetwork/selector")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("assetNetwork read"),
		inputValidator(assetNetworkValidation.assetNetworkSelector),
		managerLog("assetNetwork read"),
		assetNetworkController.assetNetworkSelector,
	);

router
	.route("/assetNetwork/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("assetNetwork read"),
		inputValidator(assetNetworkValidation.findById),
		managerLog("assetNetwork read"),
		assetNetworkController.findById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("assetNetwork delete"),
		inputValidator(assetNetworkValidation.findById),
		managerLog("assetNetwork delete"),
		assetNetworkController.deleteAssetNetwork,
	);

router
	.route("/network")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("network read"),
		inputValidator(networkValidation.network),
		managerLog("network read"),
		networkController.network,
	);

///////////////////////////////// CHARTS /////////////////////////////////////////////////

router
	.route("/chart/user")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user chart"),
		managerLog("user chart"),
		managerController.UserChart,
	);

router
	.route("/chart/competition")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition chart"),
		managerLog("competition chart"),
		managerController.CompetitionChart,
	);

router
	.route("/chart/auction-trade")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("trade chart"),
		managerLog("trade chart"),
		managerController.AuctionTradesChart,
	);

router
	.route("/chart/withdrawPayment")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("WithdrawPayment chart"),
		managerLog("WithdrawPayment chart"),
		managerController.WithDrawAndPaymentChart,
	);

router
	.route("/counts")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("dashboard count"),
		managerLog("dashboard count"),
		managerController.getModelCounts,
	);

///////////////////////////////// NOTIFICATIONS /////////////////////////////////////////////////

router
	.route("/notifications")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("notification read"),
		managerLog("notification read"),
		managerController.notification,
	);

router
	.route("/notifications/:id?")
	.patch(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("notification update"),
		managerLog("notification update"),
		managerController.notificationStatus,
	);

//////////////referral///////////

router
	.route("/referral-rewards")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("referralReward read"),
		inputValidator(referralValidation.referralRewards),
		managerLog("referralReward read"),
		referralController.getReferralRewards,
	);

//////////marketing//////////

router
	.route("/marketing/email/create")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailMarketing create"),
		inputValidator(marketingValidation.createEmailMarketing),
		managerLog("emailMarketing create"),
		marketingController.createEmailMarketing,
	);

////////// ticket ////////

router
	.route("/ticket")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket read"),
		inputValidator(ticketValidation.managerGetTickets),
		managerLog("ticket read"),
		ticketController.managerGetTickets,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket create"),
		inputValidator(ticketValidation.managerAddTicket),
		ticketUpload.fields([{ name: "files", maxCount: 5 }]),
		managerLog("ticket create"),
		ticketController.managerAddTicket,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket update"),
		ticketUpload.fields([{ name: "files", maxCount: 5 }]),
		inputValidator(ticketValidation.managerEditTicket),
		managerLog("ticket update"),
		ticketController.managerEditTicket,
	);

//single

router
	.route("/ticket/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket read"),
		inputValidator(ticketValidation.managerGetTicket),
		managerLog("ticket read"),
		ticketController.managerGetTicket,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket delete"),
		inputValidator(ticketValidation.managerDeleteTicket),
		managerLog("ticket delete"),
		ticketController.managerDeleteTicket,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket update"),
		inputValidator(ticketValidation.managerChangeTicketStatus),
		managerLog("ticket update"),
		ticketController.managerChangeTicketStatus,
	)
	.patch(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket update"),
		inputValidator(ticketValidation.managerAcceptTicket),
		managerLog("ticket update"),
		ticketController.managerAcceptTicket,
	);

router
	.route("/ticket/department/:id")
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ticket update"),
		inputValidator(ticketValidation.managerChangeTicketDepartment),
		managerLog("ticket update"),
		ticketController.managerChangeTicketDepartment,
	);
///// ticket template ////

router
	.route("/reply/template")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply read"),
		inputValidator(ticketValidation.managerGetReplyTemplates),
		managerLog("reply read"),
		ticketController.managerGetReplyTemplates,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply create"),
		inputValidator(ticketValidation.managerAddReplyTemplate),
		managerLog("reply create"),
		ticketController.managerAddReplyTemplate,
	);

router
	.route("/reply/template/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply read"),
		inputValidator(ticketValidation.managerGetReplyTemplateById),
		managerLog("reply read"),
		ticketController.managerGetReplyTemplateById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply delete"),
		inputValidator(ticketValidation.managerDeleteReplyTemplate),
		managerLog("reply delete"),
		ticketController.managerDeleteReplyTemplate,
	);

router
	.route("/reply")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply read"),
		inputValidator(ticketValidation.managerGetReplies),
		managerLog("reply read"),
		ticketController.managerGetReplies,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply create"),
		ticketUpload.fields([{ name: "files", maxCount: 5 }]),
		inputValidator(ticketValidation.managerAddReply),
		managerLog("reply create"),
		ticketController.managerAddReply,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply update"),
		ticketUpload.fields([{ name: "files", maxCount: 5 }]),
		inputValidator(ticketValidation.managerEditReply),
		managerLog("reply update"),
		ticketController.managerEditReply,
	);

////single

router
	.route("/reply/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply read"),
		inputValidator(ticketValidation.managerGetReply),
		managerLog("reply read"),
		ticketController.managerGetReply,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply delete"),
		inputValidator(ticketValidation.managerDeleteReply),
		managerLog("reply delete"),
		ticketController.managerDeleteReply,
	);

router
	.route("/reply/approve/:id")
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("reply update"),
		inputValidator(ticketValidation.managerApproveReply),
		managerLog("reply update"),
		ticketController.managerApproveReply,
	);
////////Department//////////////////

router
	.route("/department")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("department update"),
		inputValidator(departmentValidation.getDepartments),
		managerLog("department update"),
		departmentController.getDepartments,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("department update"),
		inputValidator(departmentValidation.addDepartment),
		managerLog("department update"),
		departmentController.addDepartment,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("department update"),
		inputValidator(departmentValidation.editDepartment),
		managerLog("department update"),
		departmentController.editDepartment,
	);

//selctor
router
	.route("/department/selector")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("department update"),
		inputValidator(departmentValidation.departmentSelector),
		managerLog("department update"),
		departmentController.departmentSelector,
	);

//single

router
	.route("/department/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("department update"),
		inputValidator(departmentValidation.getDepartment),
		managerLog("department update"),
		departmentController.getDepartment,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("department update"),
		inputValidator(departmentValidation.deleteDepartment),
		managerLog("department update"),
		departmentController.deleteDepartment,
	);

///// asset /////////

router
	.route("/asset")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("asset read"),
		managerLog("asset read"),
		assetController.getAssets,
	);

router
	.route("/asset/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("asset read"),
		inputValidator(assetValidation.getAssetSingle),
		managerLog("asset read"),
		assetController.getAssetSingle,
	);

router
	.route("/asset/create-users-wallet")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("asset read"),
		inputValidator(assetValidation.createUsersWallet),
		managerLog("asset read"),
		assetController.createUsersWallet,
	);

// Card Type
router
	.route("/card-type")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		cardTypeUpload.fields([
			{ name: "image", maxCount: 1 },
			{ name: "calculator_image", maxCount: 1 },
		]),
		inputValidator(cardTypeValidation.addCardType),
		managerLog("card create"),
		cardTypeController.addCardType,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		cardTypeUpload.fields([
			{ name: "image", maxCount: 1 },
			{ name: "calculator_image", maxCount: 1 },
		]),
		inputValidator(cardTypeValidation.editCardType),
		managerLog("card update"),
		cardTypeController.editCardType,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(cardTypeValidation.getCardTypesByManager),
		managerLog("card read"),
		cardTypeController.getCardTypesByManager,
	);

router
	.route("/card-type/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(cardTypeValidation.getCardTypeByManager),
		managerLog("card read"),
		cardTypeController.getCardTypeByManager,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card delete"),
		inputValidator(cardTypeValidation.deleteCardType),
		managerLog("card delete"),
		cardTypeController.deleteCardType,
	);

// Tokens
router
	.route("/tokens")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("token read"),
		inputValidator(tokenValidation.getTokensByManager),
		managerLog("token read"),
		tokenController.getTokensByManager,
	);

router
	.route("/tokens/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("token read"),
		inputValidator(tokenValidation.getTokenByManager),
		managerLog("token read"),
		tokenController.getTokenByManager,
	);

router
	.route("/statistic/cards")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("cardsStatistics read"),
		managerLog("cardsStatistics read"),
		cardController.cardStatistic,
	);

router
	.route("/match-participant-team")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(matchParticipantValidation.getMatchParticipantTeam),
		managerLog("competition read"),
		matchParticipantController.getMatchParticipantTeam,
	);

router
	.route("/match-participant-team/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(matchParticipantValidation.getSingleMatchParticipantTeam),
		managerLog("competition read"),
		matchParticipantController.getSingleMatchParticipantTeam,
	);

router
	.route("/match-participant")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(matchParticipantValidation.getMatchParticipant),
		managerLog("competition read"),
		matchParticipantController.getMatchParticipant,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition update"),
		inputValidator(matchParticipantValidation.updateMatchParticipant),
		managerLog("competition update"),
		matchParticipantController.updateMatchParticipant,
	);

router
	.route("/match-participant/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(matchParticipantValidation.getMatchParticipantSingle),
		managerLog("competition read"),
		matchParticipantController.getMatchParticipantSingle,
	);

router
	.route("/statistics")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user chart"),
		managerLog("user chart"),
		managerController.getStatistics,
	);

// System Wallets
router
	.route("/system/wallets")
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("systemWallet update"),
		inputValidator(walletValidation.editSystemWallet),
		managerLog("systemWallet update"),
		walletController.editSystemWallet,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("systemWallet read"),
		inputValidator(walletValidation.getSystemWallets),
		managerLog("systemWallet read"),
		walletController.getSystemWallets,
	);

router.route("/system/wallets/real").get(
	authMiddleware.managerAuthMiddleware,
	permissionMiddleware("systemWallet read"),
	// inputValidator(walletValidation.getSystemWalletsReal),
	managerLog("systemWallet read"),
	walletController.getSystemWalletsReal,
);

router
	.route("/system/wallets/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("systemWallet read"),
		inputValidator(walletValidation.getSystemWallet),
		managerLog("systemWallet read"),
		walletController.getSystemWallet,
	);

// Contact Us
router
	.route("/contact-us/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("contactUs read"),
		inputValidator(contactUsValidation.getOneContactUs),
		managerLog("contactUs read"),
		contactUsController.getOneContactUs,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("contactUs delete"),
		inputValidator(contactUsValidation.getOneContactUs),
		managerLog("contactUs delete"),
		contactUsController.deleteContactUs,
	);
router
	.route("/contact-us")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("contactUs read"),
		inputValidator(contactUsValidation.getAllContactUsByManager),
		managerLog("contactUs read"),
		contactUsController.getAllContactUs,
	);

// Email Subscribe
router
	.route("/email-subscribes/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailSubscribe read"),
		inputValidator(emailSubscribeValidation.getOneEmailSubscribe),
		managerLog("emailSubscribe read"),
		emailSubscribeController.getOneEmailSubscribe,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailSubscribe delete"),
		inputValidator(emailSubscribeValidation.getOneEmailSubscribe),
		managerLog("emailSubscribe delete"),
		emailSubscribeController.deleteEmailSubscribe,
	);
router
	.route("/email-subscribes")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailSubscribe read"),
		inputValidator(emailSubscribeValidation.getAllEmailSubscribesByManager),
		managerLog("emailSubscribe read"),
		emailSubscribeController.getAllEmailSubscribe,
	);

// Create Permissions
router.route("/permission/bulkCreate").get(managerController.bulk);

// Role
router
	.route("/role")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("role read"),
		inputValidator(roleValidation.getRoles),
		managerLog("role read"),
		managerController.getRoles,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("role create"),
		inputValidator(roleValidation.addRole),
		managerLog("role create"),
		managerController.createRole,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("role update"),
		inputValidator(roleValidation.editRole),
		managerLog("role update"),
		managerController.updateRole,
	);

router
	.route("/role/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("role read"),
		inputValidator(roleValidation.findRoleById),
		managerLog("role read"),
		managerController.findRoleById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("role delete"),
		inputValidator(roleValidation.findRoleById),
		managerLog("role delete"),
		managerController.deleteRole,
	);

// Managers
router
	.route("/list")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("manager read"),
		inputValidator(managerValidation.getManagers),
		managerLog("manager read"),
		managerController.getManagers,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("manager create"),
		avatarUpload.fields([{ name: "avatar", maxCount: 1 }]),
		inputValidator(managerValidation.addManagers),
		managerLog("manager create"),
		managerController.addManagers,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("manager update"),
		avatarUpload.fields([{ name: "avatar", maxCount: 1 }]),
		inputValidator(managerValidation.editManagers),
		managerLog("manager update"),
		managerController.editManagers,
	);

router
	.route("/list/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("manager read"),
		inputValidator(managerValidation.findManagerById),
		managerLog("manager read"),
		managerController.findManagerById,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("manager delete"),
		inputValidator(managerValidation.findManagerById),
		managerLog("manager delete"),
		managerController.deleteManagers,
	);

// Permissions
router
	.route("/permission")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("permission read"),
		inputValidator(managerValidation.getAllPermissions),
		managerLog("permission read"),
		managerController.getAllPermissions,
	);

// Affiliate (Agents)
router
	.route("/affiliates")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("agent read"),
		inputValidator(managerValidation.getAffiliates),
		managerLog("agent read"),
		managerController.getAffiliates,
	);

router
	.route("/affiliates/statistics/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("agent read"),
		inputValidator(managerValidation.getAffiliateStatistics),
		managerLog("agent read"),
		managerController.getAffiliateStatistics,
	);

router
	.route("/affiliates/rewards/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("agent read"),
		inputValidator(managerValidation.getAffiliateRewards),
		managerLog("agent read"),
		managerController.getAffiliateRewards,
	);

// Auction Log
router
	.route("/auction-log")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction read"),
		inputValidator(auctionValidation.getAuctionLogs),
		managerLog("auction read"),
		auctionController.getAuctionLogs,
	);

router
	.route("/auction-log/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("auction read"),
		inputValidator(auctionValidation.getAuctionLog),
		managerLog("auction read"),
		auctionController.getAuctionLog,
	);

router
	.route("/leaderboards")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("competition read"),
		inputValidator(competitionValidation.getUserLeaderBoardsByManager),
		managerLog("competition read"),
		competitionController.getLeaderBoardsByManager,
	);

// Attributes
router
	.route("/attributes")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(attributeValidation.getAttributesByManager),
		managerLog("card read"),
		attributeController.getAttributesByManager,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		attributeUpload.fields([{ name: "icon", maxCount: 1 }]),
		inputValidator(attributeValidation.addAttribute),
		managerLog("card create"),
		attributeController.createAttribute,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		attributeUpload.fields([{ name: "icon", maxCount: 1 }]),
		inputValidator(attributeValidation.editAttribute),
		managerLog("card update"),
		attributeController.editAttribute,
	);

router
	.route("/attributes/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(attributeValidation.getAttributeByManager),
		managerLog("card read"),
		attributeController.getAttributeByManager,
	);
// .delete(
// 	authMiddleware.managerAuthMiddleware,
// 	permissionMiddleware("card delete"),
// 	inputValidator(attributeValidation.deleteAttribute),
// 	attributeController.deleteAttribute,
// );

router
	.route("/user-attributes")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(attributeValidation.getUserAttributesByManager),
		managerLog("card read"),
		attributeController.getUserAttributesByManager,
	);

router
	.route("/user-attributes/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(attributeValidation.getUserAttributeByManager),
		managerLog("card read"),
		attributeController.getUserAttributeByManager,
	);

// Boxes
router
	.route("/box")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(boxValidation.addBox),
		managerLog("card create"),
		boxController.addBox,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		inputValidator(boxValidation.editBox),
		managerLog("card update"),
		boxController.editBox,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxesByManager),
		managerLog("card read"),
		boxController.getBoxesByManager,
	);

router
	.route("/box/:id")
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card delete"),
		inputValidator(boxValidation.deleteBox),
		managerLog("card delete"),
		boxController.deleteBox,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxByManager),
		managerLog("card read"),
		boxController.getBoxByManager,
	);

// Box Auction
router
	.route("/box-auction")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxAuctionsByManager),
		managerLog("card read"),
		boxController.getBoxAuctionsByManager,
	);

router
	.route("/box-auction/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxAuctionByManager),
		managerLog("card read"),
		boxController.getBoxAuctionByManager,
	);

// Box Setting
router
	.route("/box-settings")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxSettingsByManager),
		managerLog("card read"),
		boxController.getBoxSettingsByManager,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(boxValidation.addBoxSetting),
		managerLog("card create"),
		boxController.addBoxSetting,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		inputValidator(boxValidation.editBoxSetting),
		managerLog("card update"),
		boxController.editBoxSetting,
	);

router
	.route("/box-settings/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxSettingByManager),
		managerLog("card read"),
		boxController.getBoxSettingByManager,
	)
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card delete"),
		inputValidator(boxValidation.deleteBoxSetting),
		managerLog("card delete"),
		boxController.deleteBoxSetting,
	);

router
	.route("/user/box")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(boxValidation.createUserBox),
		managerLog("card create"),
		boxController.createUserBoxesByManager,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getUserBoxesByManager),
		managerLog("card read"),
		boxController.getUserBoxesByManager,
	);

router
	.route("/user/box/:userId")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getUserBoxByManager),
		managerLog("card read"),
		boxController.getUserBoxByManager,
	);

router
	.route("/cameraType/box")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(boxValidation.createUserBoxByCameraType),
		managerLog("card create"),
		boxController.createCameraTypeBoxesByManager,
	);

router
	.route("/box-trade")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxTradesByManager),
		managerLog("card read"),
		boxController.getBoxTradesByManager,
	);

router
	.route("/box-trade/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(boxValidation.getBoxTradeByManager),
		managerLog("card read"),
		boxController.getBoxTradeByManager,
	);

// Reserved Cards by Box Purchase
router
	.route("/box/card/reserved")
	.get(
		authMiddleware.managerAuthMiddleware,
		inputValidator(boxValidation.reservedCardsByManager),
		boxController.reservedCardsByManager,
	);

// Lens Setting
router
	.route("/lens-settings")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensSettingsByManager),
		managerLog("card read"),
		lensController.getLensSettingsByManager,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		cardTypeUpload.fields([{ name: "calculator_image", maxCount: 1 }]),
		inputValidator(lensValidation.addLensSetting),
		managerLog("card create"),
		lensController.addLensSetting,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		cardTypeUpload.fields([{ name: "calculator_image", maxCount: 1 }]),
		inputValidator(lensValidation.editLensSetting),
		managerLog("card update"),
		lensController.editLensSetting,
	);

router
	.route("/lens-settings/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensSettingByManager),
		managerLog("card read"),
		lensController.getLensSettingByManager,
	);

// Lens
router
	.route("/lens")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(lensValidation.addLens),
		managerLog("card create"),
		lensController.addLens,
	)
	.put(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card update"),
		inputValidator(lensValidation.editLens),
		managerLog("card update"),
		lensController.editLens,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensesByManager),
		managerLog("card read"),
		lensController.getLensesByManager,
	);

router
	.route("/lens/:id")
	.delete(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card delete"),
		inputValidator(lensValidation.deleteLens),
		managerLog("card delete"),
		lensController.deleteLens,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensByManager),
		managerLog("card read"),
		lensController.getLensByManager,
	);

// Lens Auction
router
	.route("/lens-auction")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensAuctionsByManager),
		managerLog("card read"),
		lensController.getLensAuctionsByManager,
	);

router
	.route("/lens-auction/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensAuctionByManager),
		managerLog("card read"),
		lensController.getLensAuctionByManager,
	);

router
	.route("/user/lens")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card create"),
		inputValidator(boxValidation.createUserLensesByManager),
		managerLog("card create"),
		lensController.createUserLensesByManager,
	)
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getUserLensesByManager),
		managerLog("card read"),
		lensController.getUserLensesByManager,
	);

router
	.route("/user/lens/:userId")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getUserLensByManager),
		managerLog("card read"),
		lensController.getUserLensByManager,
	);

router
	.route("/lens-trade")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensTradesByManager),
		managerLog("card read"),
		lensController.getLensTradesByManager,
	);

router
	.route("/lens-trade/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(lensValidation.getLensTradeByManager),
		managerLog("card read"),
		lensController.getLensTradeByManager,
	);

//swap
router
	.route("/swap/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("setting update"),
		inputValidator(swapValidation.activeSwapByManager),
		managerLog("setting update"),
		swapController.activation,
	);

router
	.route("/transfer")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("transaction update"),
		inputValidator(managerValidation.transferValidation),
		managerLog("transaction update"),
		managerController.transfer,
	);

router
	.route("/user-referral/:userId")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("user read"),
		managerLog("user read"),
		managerController.userReferral,
	);

// Email Template Routes
router
	.route("/marketing/email")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailMarketing read"),
		inputValidator(emailTemplateValidation.getEmailTemplates),
		managerLog("emailMarketing read"),
		emailTemplateController.getEmailTemplates,
	)
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailMarketing add"),
		inputValidator(emailTemplateValidation.addEmailTemplate),
		managerLog("emailMarketing add"),
		emailTemplateController.addEmailTemplate,
	);

router
	.route("/marketing/email/:id")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailMarketing read"),
		inputValidator(emailTemplateValidation.getEmailTemplateById),
		managerLog("emailMarketing read"),
		emailTemplateController.getEmailTemplateById,
	);

router
	.route("/marketing/email/send")
	.post(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("emailMarketing update"),
		inputValidator(emailTemplateValidation.sendEmail),
		managerLog("emailMarketing update"),
		emailTemplateController.sendEmail,
	);

// Demage History
router
	.route("/user/damage-history/:userId")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("card read"),
		inputValidator(userValidation.getUserDamageHistory),
		managerLog("card read"),
		userController.getUserDamageHistory,
	);

router
	.route("/ai-plan")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ai read"),
		managerLog("ai read"),
		getAllPlansForManager,
	);

router
	.route("/ai-user-plan")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ai read"),
		inputValidator(managerValidation.userAiPlans),
		managerLog("ai read"),
		getAllUserPlans,
	);

router
	.route("/ai-samples")
	.get(
		authMiddleware.managerAuthMiddleware,
		permissionMiddleware("ai read"),
		inputValidator(managerValidation.aiSamples),
		managerLog("ai read"),
		getAllAi,
	);

router
	.route("/ai-samples")
	.post(authMiddleware.managerAuthMiddleware, permissionMiddleware("ai read"), roleBackCompetitionPrize);

// Script to create eth wallet for all the users
router.route("/wallet/eth").post(
	authMiddleware.managerAuthMiddleware,
	// permissionMiddleware("ai read"),
	walletController.createEth,
);

// Script to change wallets to usd
router.route("/wallet/usd").post(
	authMiddleware.managerAuthMiddleware,
	// permissionMiddleware("ai read"),
	walletController.updateWallets,
);

// Script to fix ai credit
router.route("/ai/credit").post(
	authMiddleware.managerAuthMiddleware,
	// permissionMiddleware("ai read"),
	aiController.fixCredit,
);

module.exports = router;
