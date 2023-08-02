const Joi = require("joi");

const imagine = {
	body: {
		prompt: Joi.string().required().max(150),
		negativePrompt: Joi.string().max(100),
		width: Joi.number().default(256).max(512),
		height: Joi.number().default(256).max(512),
		number: Joi.number().default(4).max(4),
		image: Joi.string(),
		method: Joi.string()
			.valid(
				"LMS",
				"DDIM",
				"EULER A",
				"EULER",
				"HEUN",
				"DPM2",
				"DPM2 a",
				"DPM++ 2S a",
				"DPM++ 2M",
				"DPM++ SDE",
				"DPM fast",
				"DPM adaptive",
				"LMS Karras",
				"DPM2 Karras",
				"DPM2 a Karras",
				"DPM++ 2S a Karras",
				"DPM++ 2M Karras",
				"DPM++ SDE Karras",
				"PLMS",
			)
			.default("DPM++ 2M"),
		cfg: Joi.number().min(6).max(12).default(10),
		step: Joi.number().default(60).max(80),
	},
};

const getPlans = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		sort: Joi.string().default("price").valid("price"),
		order: Joi.string().valid("ASC", "DESC").default("ASC"),
	},
};

const upscale = {
	body: {
		scale: Joi.number().required().min(2).max(4),
		image: Joi.string().required(),
		taskId: Joi.string().required()
	},
};

module.exports = {
	imagine,
	getPlans,
	upscale
};
