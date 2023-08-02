const Joi = require("joi");

const store = {
	body: {
		stakeId: Joi.number().required(),
		userAmount: Joi.number().required(),
	},
};
const update = {
	params: {
		id: Joi.number().required(),
	},
};
const stylStakeHistory = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
	},
};

module.exports = {
	store,
	update,
	stylStakeHistory,
};
