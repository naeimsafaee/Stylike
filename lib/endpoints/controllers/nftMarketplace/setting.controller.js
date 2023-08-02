const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { settingService } = require("../../../services/nftMarketplace");

exports.addSetting = async (req, res) => {
	const data = await settingService.addSetting(req.body);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.editSetting = async (req, res) => {
	const data = await settingService.editSetting(req.body);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * get fee by type and chain
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getSetting = async (req, res) => {
	const { type, chain } = req.query;
	const data = await settingService.getSetting(type, chain);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getSettings = async (req, res) => {
	const data = await settingService.getSettings(req.query);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};
