const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../utils");
const { heatCardService } = require("../../services");

/**
 * get heat card list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getHeatCards = async (req, res) => {
	const data = await heatCardService.getHeatCards(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Find Heat Card By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getHeatCardById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await heatCardService.getHeatCardById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit heat card
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editHeatCard = async (req, res) => {
	try {
		const data = await heatCardService.editHeatCard(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};
