

const Joi = require("joi");

const getBonuses = {
	query: {
		id: Joi.number().min(1),
		title: Joi.string(),
		description: Joi.string(),
		firstMember: Joi.number(),
		type: Joi.string(),
		tier: Joi.string(),
		cardNumber: Joi.number(),
		tokenAmount: Joi.number(),
		startAt: Joi.date(),
		endAT: Joi.date(),
		status: Joi.array().items(Joi.valid("ACTIVE", "INACTIVE")),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		q: Joi.string().allow(null, ""),
		createdAt: Joi.date(),
		orderCardTier: Joi.valid("DESC", "ASC"),
		sortCardTier: Joi.string(),
	},
};

const getBonus = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

const getUserBonus = {
	query: {
		user: Joi.string(),
		id: Joi.number(),
		type: Joi.string(),
		tier: Joi.string(),
		cardNumber: Joi.number(),
		tokenAmount: Joi.number(),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		createdAt: Joi.date(),
		q: Joi.string().allow(null, ""),
	},
};

const addBonus = {
	body: {
		title: Joi.string().required(),
		description: Joi.string(),
		firstMember: Joi.number(),
		cardTypeId: Joi.number().required(),
		cardTierId: Joi.number().required(),
		cardNumber: Joi.number(),
		tokenAmount: Joi.number(),
		startAt: Joi.date().required(),
		endAt: Joi.date().required(),
		status: Joi.valid("ACTIVE", "INACTIVE").default("ACTIVE"),
		type: Joi.valid("REGISTER", "CHALLENGE").default("REGISTER"),
	},
};

const editBonus = {
	body: {
		id: Joi.number().required(),
		title: Joi.string(),
		description: Joi.string(),
		firstMember: Joi.number(),
		cardTypeId: Joi.number(),
		cardTierId: Joi.number(),
		cardNumber: Joi.number(),
		tokenAmount: Joi.number(),
		startAt: Joi.date(),
		endAt: Joi.date(),
		status: Joi.valid("ACTIVE", "INACTIVE"),
		type: Joi.valid("REGISTER", "CHALLENGE"),
	},
};

const delBonus = {
	params: {
		id: Joi.number().required(),
	},
};

module.exports = {
	getBonuses,
	getBonus,
	addBonus,
	editBonus,
	delBonus,
	getUserBonus,
};
