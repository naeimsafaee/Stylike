const Joi = require("joi");

const getMemberships = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		days: Joi.number().min(1),
		amount: Joi.number().min(0),
	},
};

const getMembershipById = {
	params: {
		id: Joi.number().required(),
	},
};

const addMembership = {
	body: {
		days: Joi.number().min(1).required(),
		amount: Joi.number().min(0).required(),
	},
};

const editMembership = {
	body: {
		id: Joi.number().min(1).required(),
		days: Joi.number().min(1),
		amount: Joi.number().min(0),
	},
};

module.exports = {
	getMemberships,
	getMembershipById,
	addMembership,
	editMembership,
};
