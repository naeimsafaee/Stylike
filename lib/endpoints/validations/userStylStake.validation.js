const Joi = require("joi");

const getUserStylStakes = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		lensId: Joi.number().min(1),
		stylStakeId: Joi.number().min(1),
		userAmount: Joi.number().min(0),
		profit: Joi.number().min(0),
		days: Joi.number().min(0),
		userName: Joi.string(),
	},
};

const getUserStylStakeById = {
	params: {
		id: Joi.number().required(),
	},
};

module.exports = {
	getUserStylStakes,
	getUserStylStakeById,
};
