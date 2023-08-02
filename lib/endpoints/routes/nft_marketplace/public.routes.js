const {
    categoryController,
    userTokenController,
    customController,
    auctionController,
    userCollectionController,
    auctionOfferController,
    userController,
    settingController,
    activityController,
    subscribeController,
    eventController
} = require("../../controllers/nftMarketplace");
const {
    categoryValidation,
    userTokenValidation,
    customValidation,
    auctionValidation,
    userCollectionValidation,
    auctionOfferValidation,
    userValidation,
    settingValidation,
    activityValidation,
    subscribeValidation,
    eventValidation
} = require("../../validations");

const request = require("request");
const https = require("https");

const { signatureUploader } = require("../../../middlewares/nftUploader");
const { eventImageUpload } = require("../../../middlewares/s3Uploader");

const { inputValidator, authMiddleware } = require("../../../middlewares");
const { recaptchaMiddleware } = require("../../../middlewares/recaptchaMiddleware");

const router = require("express").Router();

router
    .route("/collection-search")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(customValidation.collectionSearch),
        customController.collectionSearch
    );

router.route("/category").get(inputValidator(categoryValidation.getCategories), categoryController.getCategories);
router.route("/ranking").get(inputValidator(customValidation.ranking), customController.ranking);

router
    .route("/category/selector")
    .get(inputValidator(categoryValidation.categorySelector), categoryController.categorySelector);
router.route("/category/:id").get(inputValidator(categoryValidation.getCategory), categoryController.getCategory);

// User Collection
router
    .route("/collection")
    .get(inputValidator(userCollectionValidation.getUserCollections), userCollectionController.getUserCollections);
router
    .route("/collection/selector")
    .get(
        inputValidator(userCollectionValidation.userCollectionSelector),
        userCollectionController.userCollectionSelector
    );

router
    .route("/collection/custom")
    .get(inputValidator(userCollectionValidation.userCollectionSelector), userCollectionController.customCollection);

router
    .route("/collection/:id")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(userCollectionValidation.getUserCollection),
        userCollectionController.getUserCollection
    );

// User Tokens
// router.route("/token").get(inputValidator(userTokenValidation.getUserTokens), userTokenController.getTokens);
router
    .route("/token")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(customValidation.customExplore),
        customController.customExplorer
    );

// router
// 	.route("/token/selector")
// 	.get(inputValidator(userTokenValidation.userTokenSelector), userTokenController.tokenSelector);
router
    .route("/token/:id")
    .get(
        authMiddleware.userAuthMiddleware,
        inputValidator(userTokenValidation.getUserToken),
        userTokenController.getToken
    );

router.route("/search-username").get(inputValidator(customValidation.searchUsername), customController.searchUsername);

router.route("/auction").get(inputValidator(auctionValidation.getAllAuction), auctionController.getAllAuction);
router
    .route("/auction/selector")
    .get(inputValidator(auctionValidation.auctionSelector), auctionController.auctionSelector);
router.route("/auction/:id").get(inputValidator(auctionValidation.getOneAuction), auctionController.getOneAuction);

router
    .route("/auction-offer/selector")
    .get(inputValidator(auctionOfferValidation.auctionOfferSelector), auctionOfferController.auctionSelectorOffer);
router
    .route("/auction-offer/:id")
    .get(inputValidator(auctionOfferValidation.getOneAuctionOffer), auctionOfferController.getOneAuctionOffer);

// General Search
router.route("/general-search").get(inputValidator(customValidation.generalSearch), customController.generalSearch);

router
    .route("/assets")
    .get(authMiddleware.userAuthMiddleware, inputValidator(customValidation.assets), customController.assets);

// Explore
router.route("/explore").get(inputValidator(customValidation.explore), customController.explore);

// Top Sellers
router.route("/top-sellers").get(inputValidator(customValidation.topSellers), customController.topSellers);

// Popular Collections
router
    .route("/popular-collections")
    .get(inputValidator(customValidation.popularCollections), customController.popularCollections);


// Featured Users
router.route("/featured-users").get(inputValidator(customValidation.featuredUsers), customController.featuredUsers);

// Trending Arts
router.route("/trending-arts").get(inputValidator(customValidation.trendingArts), customController.trendingArts);

// Featured Collections
router
    .route("/featured-collections")
    .get(inputValidator(customValidation.featuredCollections), customController.featuredCollections);

// Collection


// Slider
router.route("/slider").get(inputValidator(customValidation.slider), customController.slider);

// User
router.route("/user/:id").get(inputValidator(userValidation.findUserById), userController.getUser);

router.route("/auction-fee").get(auctionController.getSettings);


router.route("/setting").get(inputValidator(settingValidation.getSetting), settingController.getSetting);
router.route("/settings").get(inputValidator(settingValidation.getSettings), settingController.getSettings);

router
    .route("/activity")
    .get(inputValidator(userCollectionValidation.userActivity), userCollectionController.userActivity);


router.route("/socket-test").get(customController.socketTest);

router
    .route("/price-history")
    .get(inputValidator(activityValidation.getPriceHistory), activityController.getPriceHistory);
router.route("/gas-price").get(customController.gasPrice);

// Subscribe
// router.route("/subscribe").post(inputValidator(subscribeValidation.addSubscribe), subscribeController.addSubscribe);

// Event
router
    .route("/event")
    .get(inputValidator(eventValidation.getEvents), eventController.getEvents)
    .post(signatureUploader, /* inputValidator(eventValidation.editEvent),*/ eventController.editEvent);

// router.route("/event").get(inputValidator(eventValidation.getEvent), eventController.getEvent);

router.route("/event/all/:code").get(inputValidator(eventValidation.getEventAll), eventController.getEventAll);
router.route("/event/single/:id").get(inputValidator(eventValidation.getEventSingle), eventController.getEventSingle);

router.route("/download-image").get((req, res) => {
/*
    let client = http;
    if (url.toString().indexOf("https") === 0) {
        client = https;
    }
    return new Promise((resolve, reject) => {
        client.get(url, (res) => {
            res.pipe(fs.createWriteStream(filename))
                .on('error', reject)
                .once('close', () => resolve(filename))
        })
    })*/


    const externalReq = https.request({
        hostname: req.query.host,
        path: req.query.path
    }, function(externalRes) {
        res.setHeader("content-disposition", "attachment; filename=stylike-ai.png");
        externalRes.pipe(res);
    });
    externalReq.end();
});


// router.route("/event-upload").post(eventImageUpload.array("event"), eventController.uploadEventPictures);

module.exports = router;
