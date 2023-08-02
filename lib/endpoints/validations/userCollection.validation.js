const Joi = require("joi");

const addUserCollection = {
	body: {
		name: Joi.string().max(256).required(),
		description: Joi.string().allow(null).max(400),
		category: Joi.array().required(),
		links: Joi.string(),
		explicitContent: Joi.boolean().default(false),
	},
};
const likeUnlikeCollection = {
	body: {
		collectionId: Joi.string().required(),
	},
};
const editUserCollection = {
	body: {
		id: Joi.string().required().hex().length(24).messages({
			"string.hex": " invalid",
			"string.length": " invalid",
		}),
		name: Joi.string().max(256),
		description: Joi.string().allow(null).max(400),
		category: Joi.array(),
		links: Joi.string(),
		explicitContent: Joi.boolean().default(false),
	},
};

const getUserCollection = {
	params: {
		id: Joi.number()
	},
};

const getUserCollections = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string(),
		category: Joi.number(),
		user: Joi.number(),
		createdAt: Joi.string(),
	},
};

const getUserCollectionsByManager = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("createdAt"),
		user: Joi.string(),
		name: Joi.string(),
		createdAt: Joi.string(),
		searchQuery: Joi.string(),
		user_name: Joi.string(),
		user_address: Joi.string(),
		isFeatured: Joi.array().items(Joi.string().valid("true", "false")),
		isVerified: Joi.array().items(Joi.string().valid("true", "false")),
		isExplorer: Joi.array().items(Joi.string().valid("true", "false")),
	},
};

const userCollectionSelector = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1),
		name: Joi.string(),
		discription: Joi.string(),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		searchQuery: Joi.string().allow(null, ""),
	},
};

const editUserCollectionByManager = {
	body: {
		id: Joi.string().required().hex().length(24).messages({
			"string.hex": " invalid",
			"string.length": " invalid",
		}),
		isFeatured: Joi.boolean(),
		isVerified: Joi.boolean(),
		isExplorer: Joi.boolean(),
	},
};

const userActivity = {
	query: {
		collectionId: Joi.number(),
		tokenId: Joi.number().required(),
		from: Joi.number(),
		to: Joi.number(),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string(),
	},
};

module.exports = {
	addUserCollection,
	getUserCollections,
	getUserCollection,
	editUserCollection,
	userCollectionSelector,
	likeUnlikeCollection,
	editUserCollectionByManager,
	userActivity,
	getUserCollectionsByManager,
};
