const Joi = require("joi");

const addEmailTemplate = {
	body: {
		templateId: Joi.string(),
		name: Joi.string().required(),
	},
};

const getEmailTemplates = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		templateId: Joi.string(),
		name: Joi.string(),
	},
};

const getEmailTemplateById = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

const sendEmail = {
	body: {
		id: Joi.number().min(1).required(),
		countries: Joi.array(),
		title: Joi.string(),
		text: Joi.string(),
	},
};

module.exports = {
	addEmailTemplate,
	getEmailTemplates,
	getEmailTemplateById,
	sendEmail,
};
