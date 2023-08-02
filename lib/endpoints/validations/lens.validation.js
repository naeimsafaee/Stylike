const Joi = require("joi");

const addLensSetting = {
	body: {
		name: Joi.string().required(),
		allowedUsageNumber: Joi.number().min(1).required(),
		amount: Joi.number().required(),
		price: Joi.number().required(),
		type: Joi.string()
			.valid("FISHEYE", "WIDEANGLE", "STANDARD", "SHORTTELEPHOTO", "MEDIUMTELEPHOTO", "SUPERTELEPHOTO", "MACRO")
			.required(),
	},
};

const editLensSetting = {
	body: {
		id: Joi.number().required(),
		name: Joi.string().required(),
		allowedUsageNumber: Joi.number().min(1).required(),
		amount: Joi.number().required(),
		price: Joi.number().required(),
		type: Joi.string()
			.valid("FISHEYE", "WIDEANGLE", "STANDARD", "SHORTTELEPHOTO", "MEDIUMTELEPHOTO", "SUPERTELEPHOTO", "MACRO")
			.required(),
	},
};

const deleteLensSetting = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensSettingByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensSettingsByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		allowedUsageNumber: Joi.string(),
		amount: Joi.string(),
		type: Joi.array().items(
			Joi.valid(
				"FISHEYE",
				"WIDEANGLE",
				"STANDARD",
				"SHORTTELEPHOTO",
				"MEDIUMTELEPHOTO",
				"SUPERTELEPHOTO",
				"MACRO",
			),
		),
	},
};

const addLens = {
	body: {
		name: Joi.string().required(),
		initialNumber: Joi.number().required(),
		price: Joi.number().required(),
		lensSettingId: Joi.number().required(),
		assetId: Joi.number().required(),
	},
};

const editLens = {
	body: {
		id: Joi.number().required(),
		name: Joi.string(),
		price: Joi.number(),
		lensSettingId: Joi.number(),
		assetId: Joi.number(),
	},
};

const deleteLens = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensesByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		price: Joi.string(),
		type: Joi.array(),
		lensSettingId: Joi.array(),
		status: Joi.array().items(Joi.valid("IN_AUCTION", "IN_BOX", "SOLD")),
	},
};

const getLensAuction = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensAuctions = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("price").valid("price"),
		order: Joi.string().valid("ASC", "DESC").default("ASC"),
		lensSettingId: Joi.string(),
		type: Joi.string(),
		min: Joi.number().default(0),
		max: Joi.number().default(Number.MAX_VALUE),
	},
};

const getLensAuctionByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensAuctionsByManager = {
	query: {
		status: Joi.array().items(Joi.valid("ACTIVE", "INACTIVE", "FINISHED")),
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		asset: Joi.string(),
		price: Joi.number(),
	},
};

const getUserLensByManager = {
	params: {
		userId: Joi.string().required(),
	},
};

const getUserLensesByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		type: Joi.array(),
		userId: Joi.string(),
		userName: Joi.string(),
		lens: Joi.string(),
	},
};

const getUserLens = {
	params: {
		id: Joi.number().required(),
	},
};

const getUserLenses = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		type: Joi.string(),
	},
};

const getLensTradeByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getLensTradesByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		userName: Joi.string(),
		lens: Joi.string(),
		lensAuction: Joi.string(),
		amount: Joi.number(),
		price: Joi.string(),
		type: Joi.string(),
	},
};

const purchaseLens = {
	body: {
		lensAuctionId: Joi.number().required(),
	},
};

module.exports = {
	// Lens Setting
	addLensSetting,
	editLensSetting,
	deleteLensSetting,
	getLensSettingByManager,
	getLensSettingsByManager,

	// Lens
	addLens,
	editLens,
	deleteLens,
	getLensByManager,
	getLensesByManager,

	// Lens Auction
	getLensAuction,
	getLensAuctions,
	getLensAuctionByManager,
	getLensAuctionsByManager,

	// User Lens
	getUserLensByManager,
	getUserLensesByManager,
	getUserLens,
	getUserLenses,

	// Lens Trade
	getLensTradeByManager,
	getLensTradesByManager,

	purchaseLens,
};
