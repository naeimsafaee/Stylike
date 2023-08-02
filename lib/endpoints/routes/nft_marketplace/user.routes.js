const { authMiddleware, inputValidator } = require("../../../middlewares");
const {
    userValidation,
    userCollectionValidation,
    userTokenValidation,
    customValidation,
    auctionValidation,
    auctionOfferValidation,
    competitionValidation,
    ticketValidation,
    departmentValidation
} = require("../../validations");
const {
    userController,
    userCollectionController,
    userTokenController,
    customController,
    authController,
    auctionController,
    auctionOfferController,
    userFollowLikeController,
    competitionController,
    purchaseController,
    ticketController,
    departmentController
} = require("../../controllers/nftMarketplace");

const {
    userCollectionImageUpload,
    NftImageUpload,
    ticketUpload,
    MainNftFileUpload
} = require("../../../middlewares/s3Uploader");

const { uploadNftFile } = require("../../../middlewares/nftUploader");
const { recaptchaMiddleware } = require("../../../middlewares/recaptchaMiddleware");
const { diamondController } = require("../../controllers");
const { diamondValidation } = require("../../validations");

const router = require("express").Router();

router
    .route("/collection")
    .post(
        authMiddleware.userAuthMiddleware,
        userCollectionImageUpload.fields([
            { name: "image", maxCount: 1 },
            { name: "background", maxCount: 1 },
            { name: "featured", maxCount: 1 }
        ]),
        inputValidator(userCollectionValidation.addUserCollection),
        userCollectionController.addUserCollection
    )
    .get(inputValidator(userCollectionValidation.getUserCollections), userCollectionController.getUserCollections)
    .put(
        authMiddleware.userAuthMiddleware,
        userCollectionImageUpload.fields([
            { name: "image", maxCount: 1 },
            { name: "background", maxCount: 1 },
            { name: "featured", maxCount: 1 }
        ]),
        inputValidator(userCollectionValidation.editUserCollection),
        userCollectionController.editUserCollection
    );
router
    .route("/collection/:id")
    .get(inputValidator(userCollectionValidation.getUserCollection), userCollectionController.getUserCollection)
    .delete(
        authMiddleware.userAuthMiddleware,
        inputValidator(userCollectionValidation.getUserCollection),
        userCollectionController.deleteUserCollection
    );

// User Token
router.route("/token").post(
    // recaptchaMiddleware,
    authMiddleware.userAuthMiddleware,
    uploadNftFile,
    // NftImageUpload,
    MainNftFileUpload,
    inputValidator(userTokenValidation.addUserToken),
    userTokenController.addToken
);

router.route("/token/status").post(
    // recaptchaMiddleware,
    authMiddleware.userAuthMiddleware,
    inputValidator(userTokenValidation.updateUserToken),
    userTokenController.updateToken
);

router
    .route("/search-username")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(customValidation.searchUsername),
        customController.searchUsername
    );

router
    .route("/auction")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(auctionValidation.addAuction2),
        auctionController.addAuction
    );

router
    .route("/auction/:id")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(auctionValidation.getOneAuction),
        auctionController.getAuction
    )
    .delete(
        authMiddleware.userAuthMiddleware,
        inputValidator(auctionValidation.getOneAuction),
        auctionController.deleteAuction
    );

// Auction Offer
router
    .route("/auction-offer")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(auctionOfferValidation.addAuctionOffer),
        auctionOfferController.addAuctionOffer
    );

router
    .route("/auction-offer/:id")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(auctionOfferValidation.getOneAuctionOffer),
        auctionOfferController.getOneAuctionOffer
    )
    .delete(
        authMiddleware.userAuthMiddleware,
        inputValidator(auctionOfferValidation.getOneAuctionOffer),
        auctionOfferController.deleteAuctionOffer
    );

// Follow
router
    .route("/follow")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userValidation.userFollowUnfollow),
        userFollowLikeController.followUser
    );

router
    .route("/unfollow")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userValidation.userFollowUnfollow),
        userFollowLikeController.unFollowUser
    );

router
    .route("/followers")
    .get(inputValidator(userValidation.getUserFollowing), userFollowLikeController.getUserFollowers);
router
    .route("/following")
    .get(inputValidator(userValidation.getUserFollowing), userFollowLikeController.getUserFollowing);
// Favorites
router
    .route("/favorites/token/like")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userTokenValidation.likeUnlikeToken),
        userFollowLikeController.likeToken
    );

router
    .route("/favorites/token/unlike")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userTokenValidation.likeUnlikeToken),
        userFollowLikeController.unLikeToken
    );

router
    .route("/favorites/collection/like")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userCollectionValidation.likeUnlikeCollection),
        userFollowLikeController.likeCollection
    );

router
    .route("/favorites/collection/unlike")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userCollectionValidation.likeUnlikeCollection),
        userFollowLikeController.unLikeCollection
    );

router
    .route("/favorites/token")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(userValidation.getUserFavouriteToken),
        userFollowLikeController.getUserFavoriteToken
    );

router
    .route("/favorites/collection")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(userValidation.getUserFavouriteToken),
        userFollowLikeController.getUserFavoriteCollection
    );

router.route("/diamonds").get(
    // authMiddleware.userAuthMiddleware,
    inputValidator(userTokenValidation.userDiamond),
    userTokenController.userDiamonds
);

router
    .route("/tabs-info")
    .get(authMiddleware.userAuthMiddleware, inputValidator(customValidation.tabsInfo), userController.tabsInfo);

router.route("/me").get(authMiddleware.userAuthMiddleware, authController.getUserInfo);

router
    .route("/me/offers")
    .get(
        inputValidator(auctionOfferValidation.getUserOffers),
        authMiddleware.userAuthMiddleware,
        auctionOfferController.getUserOffers
    );

router
    .route("/me/offers-others")
    .get(
        inputValidator(auctionOfferValidation.getUserOffers),
        authMiddleware.userAuthMiddleware,
        auctionOfferController.getUserOffersOthers
    );

router
    .route("/me/token/pending")
    .get(
        inputValidator(userTokenValidation.getUserPendingTokens),
        authMiddleware.userAuthMiddleware,
        userTokenController.getUserPendingTokens
    );

router
    .route("/me/token/unblockable-content/:id")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(userTokenValidation.getTokenUnblockableContent),
        userTokenController.getTokenUnblockableContent
    );

router.route("/me/token/count").get(authMiddleware.userAuthMiddleware, userTokenController.getTokensCount);

router
    .route("/token/import")
    .post(
        authMiddleware.userAuthMiddleware,
        inputValidator(userTokenValidation.importToken),
        userTokenController.importToken
    );

router.route("/register").post(
    authMiddleware.userAuthMiddleware,
    authController.userRegister
);

module.exports = router;
