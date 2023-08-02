const Joi = require("joi");

const getStylStakes = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		lensSettingId: Joi.number().min(1),
		stylAmount: Joi.number().min(0),
		title: Joi.string(),
		percent: Joi.number().min(0),
		days: Joi.number().min(0),
	},
};

const getStylStakeById = {
	params: {
		id: Joi.number().required(),
	},
};

const addStylStake = {
	body: {
		title: Joi.string().required(),
		lensSettingId: Joi.number().required().min(1),
		stylAmount: Joi.number().required().min(0),
		percent: Joi.number().min(0),
		days: Joi.number().required().min(0),
	},
};

const editStylStake = {
	body: {
		id: Joi.number().min(1).required(),
		title: Joi.string(),
		lensSettingId: Joi.number().min(1),
		stylAmount: Joi.number().min(0),
		percent: Joi.number().min(0),
		days: Joi.number().min(0),
	},
};

const deleteStylStake = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

module.exports = {
	getStylStakes,
	getStylStakeById,
	addStylStake,
	editStylStake,
	deleteStylStake,
};
