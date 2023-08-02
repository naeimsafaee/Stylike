const Joi = require("joi");

const login = {
	body: {
		mobile: Joi.string().min(8).max(20),
		email: Joi.string().email(),
		password: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
	},
};

const statistic = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
	},
};

const statisticDetails = {
	query: {
		userId: Joi.number().min(1).required(),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
	},
};

const stlReport = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(10).max(100).default(10),
		order: Joi.valid("DESC", "ASC").default("DESC"),
	},
};

module.exports = {
	login,
	statistic,
	statisticDetails,
	stlReport,
};
