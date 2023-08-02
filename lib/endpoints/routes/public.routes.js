const router = require("express").Router();
const { inputValidator, authMiddleware } = require("../../middlewares");
const {
	blogValidation,
	publicValidation,
	cardValidation,
	signalValidation,
	planValidation,
	cardTypeValidation,
	chartValidation,
	auctionValidation,
	countryValidation,
	competitionValidation,
	attributeValidation,
	boxValidation,
	lensValidation,
} = require("../validations");
const {
	blogController,
	publicController,
	cardController,
	signalController,
	planController,
	cardTypeController,
	gatewayController,
	chartController,
	auctionController,
	countryController,
	competitionController,
	attributeController,
	managerController,
	boxController,
	lensController,
} = require("../controllers");
const { prizeValidation } = require("./../validations");
const { tokenPrizeController, prizeController } = require("./../controllers");
const { permissionMiddleware } = require("../../middlewares/permissionMiddleware");
const { getAllCurrency } = require("../controllers/Financial/CurrencyController");

router.route("/blog").get(inputValidator(publicValidation.getBlogs), publicController.getBlogs);

router.route("/blog/search").get(inputValidator(blogValidation.searchBlogs), blogController.searchBlogs);

router.route("/blog/lists").get(inputValidator(publicValidation.blogLists), blogController.blogLists);

router.route("/blog/relatedBlogs").get(inputValidator(publicValidation.relatedBlogs), blogController.relatedBlogs);

router.route("/blog/:id").get(inputValidator(publicValidation.getBlog), blogController.findById);
// .put(inputValidator(publicValidation.getBlog), blogController.likeBlog);

router.route("/category").get(inputValidator(publicValidation.getCategories), publicController.getCategories);

router.route("/category/:id").get(inputValidator(publicValidation.getCategory), publicController.getCategory);

router
	.route("/category/selector")
	.get(inputValidator(publicValidation.categorySelector), publicController.categorySelector);

router.route("/languages").get(inputValidator(publicValidation.getLanguages), publicController.getLanguages);

router.route("/asset").get(inputValidator(publicValidation.getAsset), publicController.getAsset);

router
	.route("/socket")
	.post(authMiddleware.checkAccess, inputValidator(publicValidation.addSocket), publicController.addSocket);

router.route("/card/:id").get(inputValidator(cardValidation.delCardTier), cardController.getSingleCard);
router.route("/notices").get(publicController.getNotices);

// Card Type
router.route("/card-type").get(inputValidator(cardTypeValidation.getCardTypes), cardTypeController.getCardTypes);
router.route("/card-type/:id").get(inputValidator(cardTypeValidation.getCardType), cardTypeController.getCardType);

// Lens Type
router.route("/lens-type").get(lensController.getLensType);

// Card
router.route("/card").get(inputValidator(cardValidation.getCards), cardController.getCards);
router.route("/card/:id").get(inputValidator(cardValidation.getCard), cardController.getCard);

router.route("/auction").get(inputValidator(auctionValidation.getAuctionList), auctionController.getAllAuctions);

// Country
router.route("/country").get(inputValidator(countryValidation.getAllCountry), countryController.getAllCountry);
router.route("/country/:id").get(inputValidator(countryValidation.getOneCountry), countryController.getOneCountry);

//maintenance
router.route("/system/status").get(publicController.checkSystemStatus);

router.route("/currencies").get(getAllCurrency);

router.route("/tickets").get(cardController.tickets);

router.route("/system/health").get(publicController.checkSystemHealth);

// Competition Task
router
	.route("/competition-task")
	.get(inputValidator(competitionValidation.getCompetitionTasks), competitionController.getCompetitionTasks);
router
	.route("/competition-task/:id")
	.get(inputValidator(competitionValidation.getCompetitionTask), competitionController.getCompetitionTask);

// Attributes
router.route("/attributes").get(inputValidator(attributeValidation.getAttributes), attributeController.getAttributes);
router.route("/attributes/:id").get(inputValidator(attributeValidation.getAttribute), attributeController.getAttribute);

router.route("/app/versions").get(publicController.getAppVersion);

// Box Auction
router.route("/box/auction").get(inputValidator(boxValidation.getBoxAuctions), boxController.getBoxAuctions);
router.route("/box/auction/:id").get(inputValidator(boxValidation.getBoxAuction), boxController.getBoxAuction);

// Lens Auction
router.route("/lens/auction").get(inputValidator(lensValidation.getLensAuctions), lensController.getLensAuctions);
router.route("/lens/auction/:id").get(inputValidator(lensValidation.getLensAuction), lensController.getLensAuction);

//Calculator
router.route("/calculator").post(inputValidator(publicValidation.calculator), publicController.calculator);

router.route("/token-prize").get(inputValidator(prizeValidation.getTokenPrizes), tokenPrizeController.getTokenPrizes);
router.route("/prize").get(inputValidator(prizeValidation.getPrizes), prizeController.getPrizes);
router
	.route("/lens-settings")
	.get(inputValidator(lensValidation.getLensSettingsByManager), lensController.getLensSettingsByManager);

module.exports = router;
