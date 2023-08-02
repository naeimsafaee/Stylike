const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { assignedTokenService } = require("../../../services/nftMarketplace");

exports.getOneAssignedTokenByManager = async (req, res) => {
	const { id } = req.para;
	const data = await assignedTokenService.getOneAssignedTokenByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllAssignedTokenByManager = async (req, res) => {
	const data = await assignedTokenService.getAllAssignedTokenByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.assignedTokenSelectorByManager = async (req, res) => {
	const data = await assignedTokenService.assignedTokenSelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
