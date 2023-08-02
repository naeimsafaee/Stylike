const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../utils");
const { membershipService } = require("../../services");

/**
 * get membership list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getMemberships = async (req, res) => {
	const data = await membershipService.getMemberships(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Find Membership By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getMembershipById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await membershipService.getMembershipById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add new membership
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addMembership = async (req, res) => {
	try {
		const data = await membershipService.addMembership(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit membership
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editMembership = async (req, res) => {
	try {
		const data = await membershipService.editMembership(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};
