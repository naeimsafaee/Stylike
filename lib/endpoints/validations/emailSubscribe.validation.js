const Joi = require("joi");

const addEmailSubscribe = {
	body: {
		email: Joi.string().email().required(),
		gRecaptchaResponse: Joi.string().required(),
	},
};

const getOneEmailSubscribe = {
	params: {
		id: Joi.number().required(),
	},
};

const getAllEmailSubscribes = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(50).min(1),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("createdAt"),
		search: Joi.string(),
	},
};

const getAllEmailSubscribesByManager = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(50).min(1),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("createdAt"),
		searchQuery: Joi.string(),
		email: Joi.string(),
	},
};

module.exports = {
	addEmailSubscribe,
	getOneEmailSubscribe,
	getAllEmailSubscribes,
	getAllEmailSubscribesByManager,
};
