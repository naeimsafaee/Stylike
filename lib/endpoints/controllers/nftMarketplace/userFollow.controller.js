const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { userFollowService } = require("../../../services/nftMarketplace");

exports.getOneUserFollowByManager = async (req, res) => {
	const { id } = req.params;
	const data = await userFollowService.getOneUserFollowByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllUserFollowByManager = async (req, res) => {
	const data = await userFollowService.getAllUserFollowByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.userFollowSelectorByManager = async (req, res) => {
	const data = await userFollowService.userFollowSelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
