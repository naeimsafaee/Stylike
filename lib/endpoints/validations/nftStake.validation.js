const Joi = require("joi");

const storeNftStake = {
	body: {
		nftStakeId: Joi.number().required(),
		assignedCardId: Joi.number().required(),
	},
};

const nftStakeHistory = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1),
	},
};

const deleteNftStake = {
	body: {
		id: Joi.number().required(),
	}
}

module.exports = {
	storeNftStake,
	nftStakeHistory,
	deleteNftStake
};
