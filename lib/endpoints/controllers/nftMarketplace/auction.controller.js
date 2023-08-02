const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { auctionService } = require("../../../services/nftMarketplace");

/**
 * add user auction
 */
exports.addAuction = async (req, res) => {
	const data = await auctionService.addAuction(req.body, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get auction signature
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuction = async (req, res) => {
	const data = await auctionService.getAuction(req.params.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * delete user auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteAuction = async (req, res) => {
	const { id } = req.params;
	const data = await auctionService.deleteAuction(id, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getOneAuction = async (req, res) => {
	const { id } = req.params;
	const data = await auctionService.getOneAuction(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllAuction = async (req, res) => {
	const data = await auctionService.getAllAuction(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.auctionSelector = async (req, res) => {
	const data = await auctionService.auctionSelector(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getOneAuctionByManager = async (req, res) => {
	const { id } = req.params;
	const data = await auctionService.getOneAuctionByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllAuctionByManager = async (req, res) => {
	const data = await auctionService.getAllAuctionByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.auctionSelectorByManager = async (req, res) => {
	const data = await auctionService.auctionSelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get auction settings
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getSettings = async (req, res) => {
	const data = await auctionService.getSettings();
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get auction trades list Manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionTradesManager = async (req, res) => {
	const data = await auctionService.getAuctionTradesManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get auction trade Manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionTradeManager = async (req, res) => {
	const { id } = req.params;
	const data = await auctionService.getAuctionTradeManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};
