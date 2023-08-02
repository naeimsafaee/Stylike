const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");

const { customService } = require("../../../services/nftMarketplace");

exports.generalSearch = async (req, res) => {
	const { page, limit, order, sort, searchQuery } = req.query;
	const data = await customService.generalSearch(page, limit, order, sort, searchQuery);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.searchUsername = async (req, res) => {
	const { username } = req.query;
	const data = await customService.searchUsername(username, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.explore = async (req, res) => {
	const { page, limit, order, sort, category, user, collection } = req.query;
	const data = await customService.explore(page, limit, order, sort, category, user, collection);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.topSellers = async (req, res) => {
	const { page, limit, order, sort } = req.query;
	const data = await customService.topSellers(page, limit, order, sort);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.popularCollections = async (req, res) => {
	const data = await customService.popularCollections(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.assets = async (req, res) => {
	const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

	const data = await customService.assets(req.query, req.userEntity?.id, ip);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.featuredUsers = async (req, res) => {
	const data = await customService.featuredUsers(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.featuredCollections = async (req, res) => {
	const data = await customService.featuredCollections(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.trendingArts = async (req, res) => {
	const data = await customService.trendingArts(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.collectionSearch = async (req, res) => {
	const data = await customService.collectionSearch(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.slider = async (req, res) => {
	const data = await customService.slider(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.customExplorer = async (req, res) => {
	const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

	const data = await customService.customExplorer(req.query, req.userEntity?.id, ip);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.ranking = async (req, res) => {
	const data = await customService.ranking(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.socketTest = async (req, res) => {
	const data = await customService.socketTest();
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * return polygon gas price;
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.gasPrice = async (req, res) => {
	return response({ res, statusCode: httpStatus.OK, data: PolygonGasPrice });
};

exports.calculator = async (req, res) => {
	const data = await customService.calculator(req.body);
	return response({ res, statusCode: httpStatus.OK, data });
};
