const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { auctionOfferService } = require("../../../services/nftMarketplace");

exports.addAuctionOffer = async (req, res) => {
	const data = await auctionOfferService.addAuctionOffer(req.body, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.editAuctionOffer = async (req, res) => {
	const { id, auctionId, amount } = req.body;
	const data = await auctionOfferService.editAuctionOffer(id, auctionId, amount, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * delete auction offers
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteAuctionOffer = async (req, res) => {
	const { id } = req.params;
	const data = await auctionOfferService.deleteAuctionOffer(id, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get offer signature
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getOneAuctionOffer = async (req, res) => {
	const data = await auctionOfferService.getOneAuctionOffer(req.params.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.auctionSelectorOffer = async (req, res) => {
	const data = await auctionOfferService.auctionSelector(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getOneAuctionOfferByManager = async (req, res) => {
	const { id } = req.params;
	const data = await auctionOfferService.getOneAuctionOfferByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllAuctionOfferByManager = async (req, res) => {
	const data = await auctionOfferService.getAllAuctionOfferByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.auctionOfferSelectorByManager = async (req, res) => {
	const data = await auctionOfferService.auctionOfferSelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserOffers = async (req, res) => {
	const data = await auctionOfferService.getUserOffers(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserOffersOthers = async (req, res) => {
	const data = await auctionOfferService.getUserOffersOthers(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};
