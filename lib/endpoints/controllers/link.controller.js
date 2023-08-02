const {
	httpResponse: { response },
	httpStatus,
} = require("../../utils");
const { linkService } = require("../../services");

exports.createLink = async (req, res) => {
	try {
		const data = await linkService.createLink(req.body, req.userEntity);
		return response({ res, statusCode: httpStatus.CREATED, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.editLink = async (req, res) => {
	try {
		const data = await linkService.editLink(req.body, req.userEntity);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.deleteLink = async (req, res) => {
	try {
		const data = await linkService.deleteLink(req.params, req.userEntity);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getLinkByManager = async (req, res) => {
	try {
		const data = await linkService.getLinkByManager(req.params);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getLinksByManager = async (req, res) => {
	try {
		const data = await linkService.getLinksByManager(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getLink = async (req, res) => {
	try {
		const data = await linkService.getLink(req.params, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getLinks = async (req, res) => {
	try {
		const data = await linkService.getLinks(req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getStatistics = async (req, res) => {
	try {
		const data = await linkService.getStatistics(req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getLinkStatistics = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await linkService.getLinkStatistics(id, req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getCommissionsChart = async (req, res) => {
	try {
		const data = await linkService.getCommissionsChart(req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getRegisterChart = async (req, res) => {
	const data = await linkService.getRegisterChart(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getClickChart = async (req, res) => {
	try {
		const data = await linkService.getClickChart(req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.directReferral = async (req, res) => {
	const data = await linkService.directReferral(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.totals = async (req, res) => {
	try {
		const data = await linkService.totals(req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.clientCommission = async (req, res) => {
	try {
		const data = await linkService.clientCommission(req.query, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};
