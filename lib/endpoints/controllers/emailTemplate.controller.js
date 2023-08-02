const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../utils");
const { emailTemplateService } = require("../../services");

/**
 * add new email template
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addEmailTemplate = async (req, res) => {
	try {
		const data = await emailTemplateService.addEmailTemplate(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Get email template list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getEmailTemplates = async (req, res) => {
	const data = await emailTemplateService.getEmailTemplates(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Find email template By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getEmailTemplateById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await emailTemplateService.getEmailTemplateById(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * send email
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.sendEmail = async (req, res) => {
	try {
		const data = await emailTemplateService.sendEmail(req.body);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};
