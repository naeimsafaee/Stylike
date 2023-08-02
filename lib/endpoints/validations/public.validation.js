const Joi = require("joi");

const getBlog = {
	params: {
		id: Joi.number().positive().max(1000000),
	},
	query: {
		lang: Joi.string().default("en"),
	},
};

const getBlogs = {
	query: {
		categoryId: Joi.number(),
		sortBy: Joi.string().valid("id", "title"),
		sortDirection: Joi.string().valid("asc", "desc"),
		lang: Joi.string().default("en"),
		page: Joi.number().positive().max(1000),
	},
};

const categorySelector = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		searchQuery: Joi.string().allow(null, ""),
		service: Joi.string().valid("EXCHANGE", "ALGOTREX").default("EXCHANGE"),
		type: Joi.valid("FAQ", "ARTICLE").default("ARTICLE"),
	},
};

const getCategories = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		service: Joi.string().valid("EXCHANGE", "ALGOTREX"),
		parent: Joi.number().allow(null),
		type: Joi.valid("FAQ", "ARTICLE"),
		lang: Joi.string().default("en"),
	},
};

const getLanguages = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
	},
};

const getCategory = {
	params: {
		id: Joi.number().required(),
	},
	query: {
		lang: Joi.string().default("en"),
	},
};

const relatedBlogs = {
	query: {
		id: Joi.number().required(),
		lang: Joi.string().default("en"),
	},
};

const blogLists = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		type: Joi.valid("RECENT", "LIKE").required(),
		lang: Joi.string().default("en"),
	},
};

const getAsset = {
	query: {
		type: Joi.string().valid("TOKEN", "COIN", "FIAT"),
	},
};

const addSocket = {
	body: {
		roomId: Joi.string().required(),
		eventName: Joi.string().required(),
		data: Joi.string().required(),
	},
};

const calculator = {
	body: {
		cardTypeId: Joi.number().required(),
		rankPosition: Joi.number().required(),
		cameraLevel: Joi.number().required(),
		lensSettingId: Joi.array().max(4),
		days: Joi.number().required().min(1)
	}
};

module.exports = {
	getBlog,
	getBlogs,
	categorySelector,
	getCategories,
	getCategory,
	blogLists,
	relatedBlogs,
	getLanguages,
	getAsset,
	addSocket,
	calculator
};
