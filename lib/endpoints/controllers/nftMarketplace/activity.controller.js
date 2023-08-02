const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { activityService } = require("../../../services/nftMarketplace");

exports.getOneActivityByManager = async (req, res) => {
	const { id } = req.params;
	const data = await activityService.getOneActivityByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllActivityByManager = async (req, res) => {
	const data = await activityService.getAllActivityByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.activitySelectorByManager = async (req, res) => {
	const data = await activityService.activitySelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getPriceHistory = async (req, res) => {
	const data = await activityService.getPriceHistory(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
