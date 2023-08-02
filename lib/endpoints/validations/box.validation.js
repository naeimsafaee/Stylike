const Joi = require("joi");

const addBox = {
	body: {
		name: Joi.string().required(),
		initialNumber: Joi.number().default(1),
		price: Joi.number().required(),
		assetId: Joi.number().required(),
		level: Joi.number().min(0).max(5).allow(10, 20).required(),
	},
};

const editBox = {
	body: {
		id: Joi.number().required(),
		name: Joi.string(),
		price: Joi.number(),
		assetId: Joi.number().required(),
	},
};

const deleteBox = {
	params: {
		id: Joi.number().required(),
	},
};

const addBoxSetting = {
	body: {
		name: Joi.string().required(),
		amounts: Joi.array().min(1).max(3).required(),
		type: Joi.string().valid("MEGAPIXEL", "BATTERY", "NEGATIVE", "DAMAGE").required(),
		level: Joi.number().min(0).max(5).allow(10, 20).required(),
	},
};

const editBoxSetting = {
	body: {
		id: Joi.string().required(),
		name: Joi.string(),
		amounts: Joi.array().min(1),
		type: Joi.string().valid("MEGAPIXEL", "BATTERY", "NEGATIVE", "DAMAGE"),
		level: Joi.number().min(0).max(5).allow(10, 20).required(),
	},
};

const deleteBoxSetting = {
	params: {
		id: Joi.number().required(),
	},
};

const getBoxSettingByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getBoxSettingsByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		type: Joi.array().items(Joi.valid("MEGAPIXEL", "BATTERY", "NEGATIVE", "DAMAGE")),
		cardTypeId: Joi.array(),
		cardType: Joi.string(),
		level: Joi.number().min(0).max(5).allow(10, 20),
	},
};

const getUserBoxByManager = {
	params: {
		userId: Joi.string().required(),
	},
};

const getUserBoxesByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("createdAt"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		type: Joi.array().items(Joi.valid("MEGAPIXEL", "BATTERY", "NEGATIVE", "DAMAGE")),
		cardTypeId: Joi.string(),
		cardType: Joi.string(),
		userId: Joi.string(),
	},
};

const createUserBox = {
	body: {
		userId: Joi.number().required(),
		level: Joi.number().required(),
	},
};
const createUserLensesByManager = {
	body: {
		userId: Joi.number().required(),
		lensSettingId: Joi.number().required(),
	},
};

const createUserBoxByCameraType = {
	body: {
		cardTypeId: Joi.number().required(),
		level: Joi.number().required(),
	},
};

const getUserBox = {
	params: {
		id: Joi.number().required(),
	},
};

const getUserBoxes = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		type: Joi.array().items(Joi.valid("MEGAPIXEL", "BATTERY", "NEGATIVE", "DAMAGE")),
		level: Joi.string(),
		cardType: Joi.string(),
	},
};

const getBoxAuction = {
	params: {
		id: Joi.number().required(),
	},
};

const getBoxAuctions = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(8),
		sort: Joi.string().default("price").valid("price"),
		order: Joi.string().valid("ASC", "DESC").default("ASC"),
		cardTypeId: Joi.string(),
		level: Joi.number().min(0).max(5).allow(10, 20),
		min: Joi.number().default(0.1),
		max: Joi.number().default(10000),
		os: Joi.string().valid("app"),
	},
};

const getBoxAuctionByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getBoxAuctionsByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		cardTypeId: Joi.string(),
		cardType: Joi.string(),
		level: Joi.number().min(0).max(5).allow(10, 20),
		status: Joi.array().items(Joi.valid("ACTIVE", "INACTIVE", "FINISHED")),
		asset: Joi.string(),
		price: Joi.number(),
	},
};

const getBoxByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getBoxesByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		status: Joi.array(),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		price: Joi.string(),
		cardTypeId: Joi.array(),
		cardType: Joi.array(),
		batteryAmount: Joi.string(),
		negativeAmount: Joi.string(),
		referralCount: Joi.string(),
		stlReward: Joi.number(),
		levelUp: Joi.number(),
		level: Joi.array(),
		damageCoolDown: Joi.number(),
	},
};

const getBoxTradeByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getBoxTradesByManager = {
	query: {
		userName: Joi.string(),

		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		id: Joi.string(),
		name: Joi.string(),
		price: Joi.string(),
		cardTypeId: Joi.string(),
		cardType: Joi.string(),
		amount: Joi.string(),
	},
};

const purchaseBox = {
	body: {
		boxAuctionId: Joi.number().required(),
	},
};

const openPurchaseBox = {
	body: {
		boxAuctionId: Joi.number().required(),
		cardId: Joi.number().required(),
	},
};

const boxConfirmNft = {
	body: {
		cardId: Joi.number().required(),
		address: Joi.string()
			.regex(/^0x[a-fA-F0-9]{40}$/)
			.message(" is not valid")
			.required(),
	},
};

const reservedCards = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
	},
};

const reservedCardsByManager = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("id"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		createdAt: Joi.date(),
		searchQuery: Joi.string(),
		userId: Joi.number(),
		userName: Joi.string(),
	},
};

module.exports = {
	// Box
	addBox,
	editBox,
	deleteBox,
	getBoxByManager,
	getBoxesByManager,
	createUserLensesByManager,

	// Box Setting
	addBoxSetting,
	editBoxSetting,
	deleteBoxSetting,
	getBoxSettingByManager,
	getBoxSettingsByManager,

	// User Box
	getUserBox,
	getUserBoxes,
	getUserBoxByManager,
	getUserBoxesByManager,

	// Box Auction
	getBoxAuction,
	getBoxAuctions,
	getBoxAuctionByManager,
	getBoxAuctionsByManager,
	openPurchaseBox,
	// Box Trade
	getBoxTradeByManager,
	getBoxTradesByManager,
	createUserBoxByCameraType,
	purchaseBox,
	boxConfirmNft,
	reservedCards,
	reservedCardsByManager,
	createUserBox,
};
