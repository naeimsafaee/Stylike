const Joi = require("joi");

const getHoldings = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		assetId: Joi.number().min(1),
		minimum: Joi.number().min(0),
		amount: Joi.number().min(0),
	},
};

const getHoldingById = {
	params: {
		id: Joi.number().required(),
	},
};

const addHolding = {
	body: {
		assetId: Joi.number().required().min(1),
		minimum: Joi.number().required().min(0),
		amount: Joi.number().required().min(0),
	},
};

const editHolding = {
	body: {
		id: Joi.number().min(1).required(),
		assetId: Joi.number().min(1),
		minimum: Joi.number().min(1),
		amount: Joi.number().min(0),
	},
};

module.exports = {
	getHoldings,
	getHoldingById,
	addHolding,
	editHolding,
};
