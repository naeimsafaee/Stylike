const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("./../../utils");
const { marketingService } = require("./../../services");

/**
 * create email marketing
 * @param {*} req
 * @param {*} res
 */
exports.createEmailMarketing = async (req, res) => {
	try {
		const data = await marketingService.createEmailMarketing(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
