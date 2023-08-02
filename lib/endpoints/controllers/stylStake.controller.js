const {
	httpResponse: { response },
	httpStatus,
} = require("../../utils");
const { stylStakeService } = require("../../services");

/**
 * get stylStake list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getStylStakes = async (req, res) => {
	const data = await stylStakeService.getStylStakes(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Find Styl Stake By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getStylStakeById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await stylStakeService.getStylStakeById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add new Styl Stake
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addStylStake = async (req, res) => {
	try {
		const data = await stylStakeService.addStylStake(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit Styl Stake
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editStylStake = async (req, res) => {
	try {
		const data = await stylStakeService.editStylStake(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete Styl Stake
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteStylStake = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await stylStakeService.deleteStylStake(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
