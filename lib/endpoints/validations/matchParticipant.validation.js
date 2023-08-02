

const Joi = require("joi");

const getMatchParticipant = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		createdAt: Joi.date(),
		searchQuery: Joi.string().allow(null, ""),
		userId: Joi.number(),
		competitionId: Joi.number(),
		user: Joi.string(),
		status: Joi.array().items(Joi.valid("OPEN", "CLOSE")),
		score: Joi.string(),
		competitionName: Joi.string(),
		id: Joi.number(),
	},
};

const getMatchParticipantSingle = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

const updateMatchParticipant = {
	body: {
		match_participant_id: Joi.number().required(),
		score: Joi.number().max(10),
		status: Joi.valid("OPEN", "CLOSE").default("CLOSE"),
		inFeed: Joi.boolean().required(),
	},
};

const getMatchParticipantTeam = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.string().valid("DESC", "ASC").insensitive().default("ASC"),
		sort: Joi.string().default("id"),
		status: Joi.string().valid("LIVE", "OPEN", "COMPLETED", "INACTIVE").insensitive(),
		createdAt: Joi.string(),
		startAt: Joi.string(),
		endtAt: Joi.string(),
		id: Joi.string(),
		leagueName: Joi.string(),
		user: Joi.string(),
		score: Joi.string(),
		title: Joi.string(),
	},
};

const getSingleMatchParticipantTeam = {
	params: {
		id: Joi.number().min(1).required(),
	},
};
module.exports = {
	getMatchParticipant,
	getMatchParticipantTeam,
	getSingleMatchParticipantTeam,
	updateMatchParticipant,
	getMatchParticipantSingle,
};
