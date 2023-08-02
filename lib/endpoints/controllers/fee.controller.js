

const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("./../../utils");
const { feeService, generalServices } = require("./../../services");

/**
 * Get Fees
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAll = async (req, res) => {
	try {
		const data = await feeService.get(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * find and return fee by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getFeeById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await feeService.getById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * search in fee table
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.searchFee = async (req, res) => {
	try {
		const data = await feeService.get(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add Fee
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addFees = async (req, res) => {
	try {
		const data = await feeService.add(req.body);
		return response({ res, statusCode: httpStatus.CREATED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Edit Fee
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editFees = async (req, res) => {
	try {
		const data = await feeService.edit(req.body);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Delete Fee
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteFees = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await feeService.del(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Get manager fee by filter
 * @param {*} req
 * @param {*} res
 */
exports.filter = async (req, res) => {
	try {
		const { filter, sort, page, limit } = req.query;
		const data = await generalServices.getByFilter(filter, sort, page, limit, "Fee");
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
