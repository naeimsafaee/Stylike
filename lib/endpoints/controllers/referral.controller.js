const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("./../../utils");
const { referralService } = require("./../../services");

exports.getReferralRewards = async (req, res) => {
	try {
		const data = await referralService.getReferralRewards(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
