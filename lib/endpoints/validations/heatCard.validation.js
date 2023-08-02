const Joi = require("joi");

const getHeatCards = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		cardId: Joi.number().min(1),
		userId: Joi.number().min(1),
		userName: Joi.string(),
		createdAt: Joi.date(),
		updatedAt: Joi.date(),
		amount: Joi.number().min(0),
	},
};

const getHeatCardById = {
	params: {
		id: Joi.number().required(),
	},
};

const editHeatCard = {
	body: {
		id: Joi.number().min(1).required(),
		amount: Joi.number().min(0),
	},
};

module.exports = {
	getHeatCards,
	getHeatCardById,
	editHeatCard,
};
