const {
	httpResponse: { response },
	httpStatus,
} = require("../../../utils");
const { subscribeService } = require("../../../services/nftMarketplace");

exports.addSubscribe = async (req, res) => {
	const { email } = req.body;
	const data = await subscribeService.addSubscribe(email);
	return response({ res, statusCode: httpStatus.CREATED, data });
};

exports.deleteSubscribe = async (req, res) => {
	const { id } = req.params;
	const data = await subscribeService.deleteSubscribe(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getOneSubscribe = async (req, res) => {
	const { id } = req.params;
	const data = await subscribeService.getOneSubscribe(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getAllSubscribe = async (req, res) => {
	const data = await subscribeService.getAllSubscribe(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
