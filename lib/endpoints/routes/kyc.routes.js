const router = require("express").Router();
const throttle = require("express-throttle");

const { managerController , kycController } = require("./../controllers");
const { managerValidation } = require("./../validations");

const { authMiddleware, inputValidator } = require("./../../middlewares");
const { UploadPhoto } = require("../../middlewares/s3Uploader");

router.route("/request")
    .get(
        authMiddleware.managerAuthMiddleware,
        inputValidator(managerValidation.allRequest),
        managerController.allRequest
    );

router.route("/request")
    .post(
        authMiddleware.userAuthMiddleware,
        throttle({ rate: "3/s" }),
        // inputValidator(userValidation.request),
        kycController.request
    );

router.route("/request/:id")
    .put(
        authMiddleware.managerAuthMiddleware,
        inputValidator(managerValidation.editRequest),
        managerController.editRequest
    )
    .get(
        authMiddleware.managerAuthMiddleware,
        managerController.getRequest
    );

router.route("/flow/:eventId")
    .get(
        throttle({ rate: "3/s" }),
        kycController.getFlow
    );

router.route("/submit/:eventId")
    .post(
        throttle({ rate: "3/s" }),
        UploadPhoto.fields([{ name: "file", maxCount: 1 }]),
        inputValidator(managerValidation.submitRequest),
        kycController.submit
    );

router.route("/result/:eventId?")
    .get(
        authMiddleware.userAuthMiddlewareNotForce,
        throttle({ rate: "3/s" }),
        kycController.result
    );



module.exports = router;
