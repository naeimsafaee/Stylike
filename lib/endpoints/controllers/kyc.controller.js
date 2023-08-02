const { requestService, docService } = require("../../services");
const { response } = require("../../utils/httpResponse");
const config = require("config");
const { HumanError } = require("../../services/errorhandler");
const { postgres } = require("../../databases");
const moment = require("moment");

function getFlow(req, res) {
    return res.send({
        data: [
            {
                title: "Basic Information",
                field: "Full name",
                type: "STRING",
                order: 1,
                description: "please enter your full name written on your documents"
            }, {
                title: "Upload documents",
                field: "ID card front",
                type: "IMAGE",
                order: 2,
                description: "please upload front of your id card"
            }, {
                title: "Upload documents",
                field: "ID card back",
                type: "IMAGE",
                order: 2,
                description: "please upload back of your id card"
            }, {
                title: "Live kyc",
                field: "Video",
                type: "VIDEO",
                order: 3,
                description: "please take a video from yourself while reading text below: <br/>" +
                    "I am {your full name} and want to proceed kyc on stylike.io <br/>Date: " + moment().format("YYYY-MM-DD")
            }, {
                title: "Live kyc",
                field: "your image",
                type: "IMAGE",
                order: 3,
                description: "please take a image from yourself with a paper with text below: <br/>" +
                    "I am {your name} and want to complete kyc on stylike.io <br/>Date: " + moment().format("YYYY-MM-DD")
            }
        ]
    });
}

async function submit(req, res) {

    const request = await postgres.Request.findOne({
        where: { eventId: req.params.eventId }
    });

    if (!request)
        throw new HumanError("request not found!", 400);

    if (request.status === "APPROVED")
        throw new HumanError("This request has been APPROVED", 400);

    if (request.status === "REJECTED")
        throw new HumanError("This request has been REJECTED, please start a new one", 400);

    if (request.status === "PENDING")
        throw new HumanError("This request is under checking, please wait", 400);

    const requestId = request.id;

    let value = req.body?.value;
    let files = req.files;

    if (req.body.type === "COMPLETE") {
        request.status = "PENDING";
        await request.save();

        return res.send({
            message: "Thank you for submitting kyc"
        });
    }

    if (req.body.type === "IMAGE" || req.body.type === "VIDEO") {
        if (files && Object.keys(files).length) {
            for (let key in files) {
                let file = files[key].shift();

                value = file.location;
            }
        }
    }

    await docService.create({
        field: req.body.field,
        value: value,
        requestId: requestId,
        status: req.body.type
    });

    request.status = "DOING";
    await request.save();

    return res.send({
        message: "Your request submitted successfully"
    });
}

async function request(req, res) {

    const userId = req.userEntity.id;

    const userPendingRequest = await requestService.find({
        userId: userId,
        status: "PENDING"
    });

    if (userPendingRequest)
        throw new HumanError("You have a pending kyc , we are checking your docs", 400);

    const userRequest = await requestService.find({
        userId: userId
    });

    if (userRequest && (userRequest.status === "DOING" || userRequest.status === "REQUESTED")) {
        return {
            url: `${config.get("base.frontUrl")}/kyc/${userRequest.eventId}`,
            eventId: userRequest.eventId,
            message: "You have an incomplete kyc, you have to start it again."
        };
    }

    if (userRequest && userRequest.status === "APPROVED") {
        return {
            url: null,
            eventId: null,
            message: "Your identity has been APPROVED"
        };
    }

    const createdRequest = await requestService.create(req.body.userId);

    return response({
        res, data: {
            url: `${config.get("base.frontUrl")}/kyc/${createdRequest.eventId}`,
            eventId: createdRequest.eventId
        }
    });
}

async function result(req, res) {

    let request;

    if (req.params.eventId) {
        const eventId = req.params.eventId;
        request = await requestService.find({
            eventId: eventId
        });

        if (!request)
            throw new HumanError("Kyc not found!", 400);

    } else {

        request = await requestService.find({
            userId: req.userEntity.id
        }, [["createdAt", "desc"]]);

        if (!request)
            return response({
                res, data: {
                    status: "NOT_REQUESTED",
                    userId: req.userEntity.id,
                    eventId: "",
                    url: ""
                }
            });

        if (req.userEntity.id !== request.userId)
            throw new HumanError("This kyc doesn't belongs to you.", 400);
    }


    return response({
        res,
        data: { ...request.dataValues, url: `${config.get("base.frontUrl")}/kyc/${request.eventId}` }
    });
}


module.exports = {
    getFlow,
    submit,
    request,
    result
};