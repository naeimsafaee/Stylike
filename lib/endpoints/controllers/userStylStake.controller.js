const {
	httpResponse: { response },
	httpStatus,
} = require("../../utils");
const { userStylStakeService } = require("../../services");

/**
 * get User Styl Stake list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserStylStakes = async (req, res) => {
	const data = await userStylStakeService.getUserStylStakes(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Find User Styl Stake By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserStylStakeById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await userStylStakeService.getUserStylStakeById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
