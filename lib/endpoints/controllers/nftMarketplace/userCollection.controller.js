const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { userService } = require("../../../services/nftMarketplace");
const { userCollectionService } =require("../../../services/nftMarketplace");

exports.addUserCollection = async (req, res) => {
	const { name, description, category, links, explicitContent } = req.body;
	const data = await userCollectionService.addUserCollection(
		name,
		description,
		category,
		links,
		explicitContent,
		req.files,
		req.userEntity,
		req.fileValidationError,
	);

	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserCollections = async (req, res) => {
	const data = await userCollectionService.getUserCollections(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserCollection = async (req, res) => {
	const { id } = req.params;
	const data = await userCollectionService.getUserCollection(id, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.editUserCollection = async (req, res) => {
	const { id, name, description, category, links, explicitContent } = req.body;
	const data = await userCollectionService.editUserCollection(
		id,
		name,
		description,
		category,
		links,
		explicitContent,
		req.files,
		req.userEntity,
		req.fileValidationError,
	);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.deleteUserCollection = async (req, res) => {
	const { id } = req.params;
	const data = await userCollectionService.deleteUserCollection(id, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.userCollectionSelector = async (req, res) => {
	const { page, limit, order, sort, searchQuery } = req.query;
	const data = await userCollectionService.userCollectionSelector(page, limit, order, sort, searchQuery);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserCollectionsByManager = async (req, res) => {
	const data = await userCollectionService.getUserCollectionsByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserCollectionByManager = async (req, res) => {
	const { id } = req.params;
	const data = await userCollectionService.getUserCollectionByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.userCollectionSelectorByManager = async (req, res) => {
	const data = await userCollectionService.userCollectionSelector(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.customCollection = async (req, res) => {
	const { page, limit, order, sort, searchQuery } = req.query;
	const data = await userCollectionService.customCollection(page, limit, order, sort, searchQuery);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.editUserCollectionByManager = async (req, res) => {
	const { id, isFeatured, isVerified, isExplorer } = req.body;
	const data = await userCollectionService.editUserCollectionByManager(id, isFeatured, isVerified, isExplorer);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get token or colection user activity
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.userActivity = async (req, res) => {
	const data = await userCollectionService.userActivity(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
