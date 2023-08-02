const {
	httpResponse: { response },
	httpStatus,
} = require("../../utils");
const { holdingService } = require("../../services");

/**
 * get holding list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getHoldings = async (req, res) => {
	const data = await holdingService.getHoldings(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Find Holding By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getHoldingById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await holdingService.getHoldingById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add new holding
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addHolding = async (req, res) => {
	try {
		const data = await holdingService.addHolding(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit holding
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editHolding = async (req, res) => {
	try {
		const data = await holdingService.editHolding(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};
