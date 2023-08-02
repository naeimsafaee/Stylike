const { httpStatus } = require("../../../../utils");
const giveawayService = require("../../../../services/manager/giveaway/giveaway.service");
const {response} = require("../../../../utils/httpResponse");


/**
 * get giveaway list
 */
exports.getGiveaways = async (req, res) => {

    const { page, limit, order, sort , assetId , userId} = req.query;
    const data = await giveawayService.getGiveaways(
        page,
        limit,
        order,
        sort,
        assetId,
        userId,
    );
    return response({res, statusCode: httpStatus.OK, data});

};


/**
 * get giveaway
 */
exports.getGiveaway = async (req, res) => {
    const {id} = req.params;
    const data = await giveawayService.getGiveaway(id);
    return response({res, statusCode: httpStatus.OK, data});

};


/**
 * add giveaway
 */
exports.addGiveaway = async (req, res) => {
    const data = await giveawayService.addGiveaway(req.body);
    return response({res, statusCode: httpStatus.OK, data});

};


/**
 * edit giveaway
 */
exports.editGiveaway = async (req, res) => {
    const {id} = req.params;
    const {assetId, userId, amount, reason, isDeposit} = req.body;
    const data = await giveawayService.editGiveaway(id, assetId, userId, amount, reason, isDeposit);
    return response({res, statusCode: httpStatus.OK, data});

};


/**
 * delete giveaway
 */
exports.delGiveaway = async (req, res) => {
    const {id} = req.params;
    const data = await giveawayService.delGiveaway(id);
    return response({res, statusCode: httpStatus.OK, data});

};


