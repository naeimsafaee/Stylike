const {
	httpResponse: { response },
	httpStatus,
} = require("../../utils");
const { emailSubscribeService } = require("../../services");

exports.addEmailSubscribe = async (req, res) => {
	try {
		const { email } = req.body;
		const data = await emailSubscribeService.addEmailSubscribe(email);
		return response({ res, statusCode: httpStatus.CREATED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.deleteEmailSubscribe = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await emailSubscribeService.deleteEmailSubscribe(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.getOneEmailSubscribe = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await emailSubscribeService.getOneEmailSubscribe(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.getAllEmailSubscribe = async (req, res) => {
	try {
		const data = await emailSubscribeService.getAllEmailSubscribe(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};
