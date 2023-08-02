const {
	httpResponse: { response },
	httpStatus,
} = require("../../utils");
const { lensService } = require("../../services");

/**
 * add lens setting
 */
exports.addLensSetting = async (req, res) => {
	const data = await lensService.addLensSetting(req.body, req.files);
	return response({ res, statusCode: httpStatus.CREATED, data });
};

/**
 * edit lens setting
 */
exports.editLensSetting = async (req, res) => {
	const data = await lensService.editLensSetting(req.body, req.files);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * delete lens setting
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteLensSetting = async (req, res) => {
	try {
		const data = await lensService.deleteLensSetting(req.params);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get lens setting by mananger
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensSettingByManager = async (req, res) => {
	try {
		const data = await lensService.getLensSettingByManager(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get lens settings by mananger
 */
exports.getLensSettingsByManager = async (req, res) => {
	const data = await lensService.getLensSettingsByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * add lens
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addLens = async (req, res) => {
	try {
		const data = await lensService.addLens(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit lens
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editLens = async (req, res) => {
	try {
		const data = await lensService.editLens(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete lens
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteLens = async (req, res) => {
	try {
		const data = await lensService.deleteLens(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get lens by manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensByManager = async (req, res) => {
	try {
		const data = await lensService.getLensByManager(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get lenses by manager
 */
exports.getLensesByManager = async (req, res) => {
	const data = await lensService.getLensesByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get lens auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensAuction = async (req, res) => {
	try {
		const data = await lensService.getLensAuction(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getLensAuctions = async (req, res) => {
	const data = await lensService.getLensAuctions(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get lens auctions by manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensAuctionsByManager = async (req, res) => {
	const data = await lensService.getLensAuctionsByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get lens by manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensAuctionByManager = async (req, res) => {
	try {
		const data = await lensService.getLensAuctionByManager(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getUserLensByManager = async (req, res) => {
	try {
		const data = await lensService.getUserLensByManager(req.params);
		return res.send({
			data: data,
		});
	} catch (e) {
		return res.status(500).json(e.message);
	}
};

exports.getUserLensesByManager = async (req, res) => {
	const data = await lensService.getUserLensesByManager(req.query);
	return res.send({ data: data });
};

exports.createUserLensesByManager = async (req, res) => {
	const data = await lensService.createUserLensesByManager(req.body);
	return res.send({ data: data });
};

/**
 * get user lens
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserLens = async (req, res) => {
	try {
		const data = await lensService.getUserLens(req.params, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user lenses
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserLenses = async (req, res) => {
	try {
		const data = await lensService.getUserLenses(req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get lens trade by manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensTradeByManager = async (req, res) => {
	try {
		const data = await lensService.getLensTradeByManager(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get lenses trades by manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getLensTradesByManager = async (req, res) => {
	const data = await lensService.getLensTradesByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.purchaseLens = async (req, res) => {
	let io = req.app.get("socketIo");

	const data = await lensService.purchaseLens(req.body, req.userEntity.id, io);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getLensType = async (req, res) => {
	const data = await lensService.getLensType();
	return response({ res, statusCode: httpStatus.OK, data });
};
