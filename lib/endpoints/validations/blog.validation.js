
const Joi = require("joi");

const getBlogs = {
	query: {
		id: Joi.number().min(1),
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		title: Joi.string(),
		// description: Joi.string(),
		// text: Joi.string(),
		category: Joi.string(),
		status: Joi.array().items(Joi.number()),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		categoryId: Joi.number().min(1),
		createdAt: Joi.date(),
		searchQuery: Joi.string().allow(null, ""),
		sort: Joi.string().default("id"),
	},
};

const getBlogsTranslation = {
	query: {
		id: Joi.number().min(1),
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		title: Joi.string(),
		description: Joi.string(),
		text: Joi.string(),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		blogId: Joi.number().min(1),
		languageId: Joi.number().min(1),
		createdAt: Joi.date(),
	},
};

const searchBlogs = {
	query: {
		id: Joi.number().min(1),
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		title: Joi.string(),
		description: Joi.string(),
		text: Joi.string(),
		category: Joi.array().items(Joi.number()),
		status: Joi.number(),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		fromDate: Joi.date().timestamp(),
		toDate: Joi.date().timestamp(),
		searchText: Joi.string(),
		lang: Joi.string().default("en"),
	},
};

const addBlogs = {
	body: {
		status: Joi.number(),
		title: Joi.string(),
		text: Joi.string(),
		link: Joi.string(),
		video: Joi.string().allow(null),
		description: Joi.string().allow(null),
		categoryId: Joi.number().allow(null),
		tag: Joi.string(),
	},
};
const addBlogTranslation = {
	body: {
		title: Joi.string(),
		description: Joi.string(),
		text: Joi.string(),
		blogId: Joi.number().min(1),
		languageId: Joi.number().min(1),
	},
};

const editBlogs = {
	body: {
		id: Joi.number().required(),
		status: Joi.number(),
		title: Joi.string(),
		text: Joi.string(),
		link: Joi.string().allow(""),
		video: Joi.string().allow(""),
		description: Joi.string().allow(null),
		categoryId: Joi.number().allow(null),
		tag: Joi.string(),
	},
};
const editBlogTranslation = {
	body: {
		id: Joi.number().required(),
		title: Joi.string(),
		description: Joi.string(),
		text: Joi.string(),
		blogId: Joi.number().min(1),
		languageId: Joi.number().min(1),
		images: Joi.valid(null),
		thumbnails: Joi.valid(null),
	},
};
const findById = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

module.exports = {
	getBlogs,
	getBlogsTranslation,
	addBlogs,
	editBlogTranslation,
	addBlogTranslation,
	editBlogs,
	findById,
	searchBlogs,
};
