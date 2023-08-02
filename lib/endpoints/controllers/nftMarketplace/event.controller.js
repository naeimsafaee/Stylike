const {
    httpResponse: {response, apiError},
    httpStatus,
} = require("../../../utils");
const {eventService} = require("../../../services/nftMarketplace");

exports.getEvent = async (req, res) => {
    const {id} = req.params;
    const {specificCode} = req.query;
    const data = await eventService.getEvent(id, specificCode);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getEvents = async (req, res) => {
    const data = await eventService.getEvents(req.query);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.editEvent = async (req, res) => {
    const {id} = req.params;
    const {specificCode} = req.query;
    const data = await eventService.editEvent(id, specificCode, req.files);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.uploadEventPictures = async (req, res) => {
    const data = await eventService.uploadEventPictures(req.files);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getEventSingle = async (req, res) => {
    const {id} = req.params;
    const data = await eventService.getEventSingle(id);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getEventAll = async (req, res) => {
    const {code} = req.params;
    const data = await eventService.getEventsAll(req.query, code);
    return response({res, statusCode: httpStatus.OK, data});
};
