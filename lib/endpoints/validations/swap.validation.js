const Joi = require("joi");

const swap = {
	body: {
		fromToken: Joi.string().required(),
		toToken: Joi.string().required(),
		balanceIn: Joi.number().positive().required(),
		agent: Joi.string().required(),
		cardId: Joi.number().required(),
	},
};

const swapFee = {
	body: {
		fromTokenId: Joi.string().required(),
		toTokenId: Joi.string().required(),
	},
};

const swapPrice = {
	body: {
		fromToken: Joi.string().required(),
		toToken: Joi.string().required(),
		slippage: Joi.number().min(0).max(50),
		balanceIn: Joi.number().positive().required(),
		origin: Joi.string().required(),
	},
};

const activeSwapByManager = {
	params: {
		id: Joi.number().required(),
	},
};

const getUserSwapTransactions = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		sort: Joi.string().default("createdAt"),
		order: Joi.string().valid("ASC", "DESC").default("DESC"),
		fromDate: Joi.date(),
		toDate: Joi.date(),
		fromAsset: Joi.string(),
		toAsset: Joi.string(),
	},
};

module.exports = {
	swap,
	swapPrice,
	activeSwapByManager,
	swapFee,
	getUserSwapTransactions,
};
