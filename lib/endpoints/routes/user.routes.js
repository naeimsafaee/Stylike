const router = require("express").Router();
const {
	userController,
	auctionController,
	cardController,
	ticketController,
	departmentController,
	competitionController,
	contactUsController,
	emailSubscribeController,
	attributeController,
	boxController,
	lensController,
} = require("./../controllers");
const {
	userValidation,
	auctionValidation,
	cardValidation,
	ticketValidation,
	departmentValidation,
	competitionValidation,
	contactUsValidation,
	emailSubscribeValidation,
	attributeValidation,
	boxValidation,
	lensValidation,
} = require("./../validations");
const { authMiddleware, inputValidator, recaptcha } = require("./../../middlewares");
const { avatarUpload, ticketUpload, matchParticipant } = require("../../middlewares/s3Uploader");
const throttle = require("express-throttle");
const {authController} = require("./../controllers/nftMarketplace");

router.route("/detect").get(userController.detect);

router
	.route("/")
	.get(authMiddleware.userAuthMiddleware, userController.info)
	.put(
		authMiddleware.userAuthMiddleware,
		avatarUpload.fields([{ name: "avatar", maxCount: 1 }]),
		inputValidator(userValidation.editProfile),
		userController.editProfile,
	);

router.route("/me").get(authMiddleware.userAuthMiddleware, authController.getUserInfo);

router
	.route("/address")
	.post(authMiddleware.userAuthMiddleware, inputValidator(userValidation.addAddress), userController.addAddress);

router
	.route("/signup")
	.post(
		//rateLimit.rateLimitMiddleware,
		throttle({ rate: "3/s" }),
		recaptcha.recaptchaMiddleware,
		inputValidator(userValidation.signup),
		userController.signUp,
	)
	.patch(
		//	rateLimit.rateLimitMiddleware,
		throttle({ rate: "3/s" }),
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.updateCred),
		userController.updateCred,
	);

router.route("/login").post(
	//rateLimit.rateLimitMiddleware,
	throttle({ rate: "3/s" }),
	recaptcha.recaptchaMiddleware,
	inputValidator(userValidation.login),
	userController.login,
);

router.route("/logout").get(
	//rateLimit.rateLimitMiddleware,
	authMiddleware.userAuthMiddleware,
	userController.logout,
);

router
	.route("/delete-account")
	.put(authMiddleware.userAuthMiddleware, inputValidator(userValidation.deleteAccount), userController.deleteAccount);

router
	.route("/password")
	.post(
		//	rateLimit.rateLimitMiddleware,
		recaptcha.recaptchaMiddleware,
		inputValidator(userValidation.forgetPassword),
		userController.forgetPassword,
	)
	.patch(
		//	rateLimit.rateLimitMiddleware,
		recaptcha.recaptchaMiddleware,
		inputValidator(userValidation.resetPassword),
		userController.resetPassword,
	)
	.put(
		//	rateLimit.rateLimitMiddleware,
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.changePassword),
		userController.changePassword,
	);

router.route("/verify").post(
	//	rateLimit.rateLimitMiddleware,
	recaptcha.recaptchaMiddleware,
	inputValidator(userValidation.verify),
	userController.verify,
);

router.route("/refresh-token").get(authMiddleware.userAuthRefreshMiddleware, userController.refreshToken);

//todo
router
	.route("/notifications")
	.get(authMiddleware.userAuthMiddleware, inputValidator(userValidation.notification), userController.notification)
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.updateNotification),
		userController.updateNotification,
	);

router
	.route("/notifications/:notification_id?")
	.patch(authMiddleware.userAuthMiddleware, userController.notificationStatus);

router
	.route("/read_notifications")
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.readNotification),
		userController.readNotification,
	);

router.route("/referral").get(authMiddleware.userAuthMiddleware, userController.referral);

router
	.route("/referral/history")
	.get(authMiddleware.userAuthMiddleware, inputValidator(userValidation.getReferral), userController.referralHistory);

// router
// 	.route("/auction")
// 	.get(authMiddleware.userAuthMiddleware, inputValidator(userValidation.getAuctions), userController.getUserAuctions)
// 	.post(authMiddleware.userAuthMiddleware, inputValidator(userValidation.addAuction), userController.addAuction)
// 	.put(authMiddleware.userAuthMiddleware, inputValidator(userValidation.editAuction), userController.editAuction);

// router
// 	.route("/auction/:id")
// 	.get(authMiddleware.userAuthMiddleware, inputValidator(userValidation.getAuction), userController.getUserAuction)
// 	.delete(
// 		authMiddleware.userAuthMiddleware,
// 		inputValidator(userValidation.deleteAuction),
// 		userController.deleteAuction,
// 	);

// router
// 	.route("/auction-offer")
// 	.get(authMiddleware.userAuthMiddleware, inputValidator(userValidation.getOffers), userController.getOffers)
// 	.post(authMiddleware.userAuthMiddleware, inputValidator(userValidation.addOffers), userController.addOffers);
// // .put(authMiddleware.userAuthMiddleware, inputValidator(userValidation.editOffers), userController.editOffers)
// router
// 	.route("/auction-offer/:id")
// 	// .get(authMiddleware.userAuthMiddleware, inputValidator(userValidation.getOffer), userController.getOffer)
// 	.delete(
// 		authMiddleware.userAuthMiddleware,
// 		inputValidator(userValidation.deleteOffers),
// 		userController.deleteOffers,
// 	);

router
	.route("/auction-trades")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(auctionValidation.getAuctionTradesUser),
		auctionController.getAuctionTradesUser,
	);
router
	.route("/auction-trades/:id")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(auctionValidation.getAuctionTradeUser),
		auctionController.getAuctionTradeUser,
	);

router.route("/auction-list").get(
	// authMiddleware.userAuthMiddleware,
	inputValidator(auctionValidation.getAuctionList),
	auctionController.getAuctionList,
);

router.route("/auction-list/:id").get(
	// authMiddleware.userAuthMiddleware,
	inputValidator(auctionValidation.getSingleAuction),
	auctionController.getSingleAuction,
);

// router.route("/auction-offer-list").get(
// 	// authMiddleware.userAuthMiddleware,
// 	inputValidator(auctionValidation.getAuctionOfferList),
// 	auctionController.getAuctionOfferList,
// );

router
	.route("/card")
	.get(authMiddleware.userAuthMiddleware, inputValidator(cardValidation.getUserCard), cardController.getUserCard);

///////////////////////// Ticket ///////////////////////////

router
	.route("/ticket")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(ticketValidation.userGetTickets),
		ticketController.userGetTickets,
	)
	.post(
		authMiddleware.userAuthMiddleware,
		ticketUpload.fields([{ name: "files", maxCount: 5 }]),
		inputValidator(ticketValidation.userAddTicket),
		ticketController.userAddTicket,
	);

///signle

router
	.route("/ticket/:id")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(ticketValidation.userGetTicket),
		ticketController.userGetTicket,
	);

//reply

router
	.route("/reply")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(ticketValidation.userGetReplies),
		ticketController.userGetReplies,
	)
	.post(
		authMiddleware.userAuthMiddleware,
		ticketUpload.fields([{ name: "files", maxCount: 5 }]),
		inputValidator(ticketValidation.userAddReply),
		ticketController.userAddReply,
	);

//single reply

router
	.route("/reply/:id")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(ticketValidation.userGetReply),
		ticketController.userGetReply,
	);

//////department

router
	.route("/department/selector")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(departmentValidation.departmentSelector),
		departmentController.departmentSelector,
	);

router
	.route("/card/check")
	.get(authMiddleware.userAuthMiddleware, inputValidator(cardValidation.check), cardController.check);

router
	.route("/card/purchase")
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(auctionValidation.purchaseCard),
		auctionController.purchaseCard,
	);

router
	.route("/prizes/:id")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.getUserCompetition),
		userController.getPrizeCompetition,
	);

// user competitions
router
	.get(
		"/competitions",
		authMiddleware.userAuthMiddleware,
		inputValidator(competitionValidation.listCompetition),
		competitionController.listCompetition,
	)
	.get(
		"/competitions/:id/:cardTypeId/:assign_card_id",
		authMiddleware.userAuthMiddleware,
		inputValidator(competitionValidation.detailsCompetition),
		competitionController.detailsCompetition,
	)
	.post(
		"/competitions",
		authMiddleware.userAuthMiddleware,
		matchParticipant.fields([{ name: "image", maxCount: 1 }]),
		inputValidator(competitionValidation.addUserCompetition),
		competitionController.addUserCompetition,
	)
	.put(
		"/competitions",
		authMiddleware.userAuthMiddleware,
		matchParticipant.fields([{ name: "image", maxCount: 1 }]),
		inputValidator(competitionValidation.editUserCompetition),
		competitionController.editUserCompetition,
	);

router
	.route("/leaderboards")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(competitionValidation.getUserLeaderBoards),
		competitionController.getLeaderBoards,
	);

router
	.route("/results/:id")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(competitionValidation.getCompetitionById),
		competitionController.getResults,
	);

router
	.route("/ranking-details")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(competitionValidation.getUserRankingDetails),
		competitionController.getRankingDetails,
	);

router.route("/pictures-count").get(authMiddleware.userAuthMiddleware, competitionController.picturesCount);

// Contact Us
router
	.route("/contact-us")
	.post(
		recaptcha.recaptchaMiddleware,
		inputValidator(contactUsValidation.addContactUs),
		contactUsController.addContactUs,
	);

// Email Subscribe
router
	.route("/email-subscribe")
	.post(
		recaptcha.recaptchaMiddleware,
		inputValidator(emailSubscribeValidation.addEmailSubscribe),
		emailSubscribeController.addEmailSubscribe,
	);

// Invite Link Handler
router.route("/links/go/:code").get(
	// recaptcha.recaptchaMiddleware,
	inputValidator(userValidation.inviteLink),
	userController.inviteLinkHandler,
);

// Test Notif
router.route("/notif/test").get(/*authMiddleware.userAuthMiddleware, */ userController.testNotif);

// Attributes
router
	.route("/attributes")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(attributeValidation.getUserAttributes),
		attributeController.getUserAttributes,
	);
router
	.route("/attributes/:id")
	.get(
		authMiddleware.userAuthMiddleware,
		inputValidator(attributeValidation.getUserAttribute),
		attributeController.getUserAttribute,
	);

// Box
router
	.route("/box")
	.get(authMiddleware.userAuthMiddleware, inputValidator(boxValidation.getUserBoxes), boxController.getUserBoxes);
router
	.route("/box/:id")
	.get(authMiddleware.userAuthMiddleware, inputValidator(boxValidation.getUserBox), boxController.getUserBox);

// Box Purchase
router
	.route("/box/purchase")
	.post(authMiddleware.userAuthMiddleware, inputValidator(boxValidation.purchaseBox), boxController.purchaseBox);

// Box Purchase
router
	.route("/box/OpenGiftBox")
	.post(authMiddleware.userAuthMiddleware, inputValidator(boxValidation.openPurchaseBox), boxController.OpenGiftBox);

// Box NFT Confirm
router
	.route("/box/confirm-nft")
	.post(authMiddleware.userAuthMiddleware, inputValidator(boxValidation.boxConfirmNft), boxController.boxConfirmNft);

// Reserved Cards by Box Purchase
router
	.route("/box/cards/reserved")
	.get(authMiddleware.userAuthMiddleware, inputValidator(boxValidation.reservedCards), boxController.reservedCards);

// Lens
router
	.route("/lens")
	.get(authMiddleware.userAuthMiddleware, inputValidator(lensValidation.getUserLenses), lensController.getUserLenses);
router
	.route("/lens/:id")
	.get(authMiddleware.userAuthMiddleware, inputValidator(lensValidation.getUserLens), lensController.getUserLens);

// Lens Purchase
router
	.route("/lens/purchase")
	.post(authMiddleware.userAuthMiddleware, inputValidator(lensValidation.purchaseLens), lensController.purchaseLens);

router
	.route("/damageAttribute")
	.post(
		authMiddleware.userAuthMiddleware,
		inputValidator(userValidation.damageAttribute),
		userController.damageAttribute,
	);

router
	.route("/test")
	.get(
		userController.test,
	);

module.exports = router;
