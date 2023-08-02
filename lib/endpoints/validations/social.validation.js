const Joi = require("joi");

const index = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(20).default(10),
		order: Joi.valid("DESC", "ASC", "asc", "desc").default("DESC"),
		sort: Joi.string(),
	},
};

const store = {
	body: {
		caption: Joi.string().required(),
		// file: Joi.required()
	},
};

const feed = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(20).default(10),
		searchQuery: Joi.string(),
		type: Joi.string().valid("task", "post", "user").required().default("post"),
	},
};

const profile = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(20).default(10),
		userId: Joi.number().min(1).required(),
		competitionId: Joi.number().min(1),
		type: Joi.string().valid("camera", "post", "task").required().default("post"),
	},
};

module.exports = {
	index,
	store,
	feed,
	profile,
};
