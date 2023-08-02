const Joi = require("joi");

const signup = {
	body: {
		name: Joi.string().trim().required(),
		mobile: Joi.string().min(8).max(20),
		email: Joi.string().email().required(),
		countryId: Joi.number().required(),
		password: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
		referredCode: Joi.string(),
		gRecaptchaResponse: Joi.string(),
		link: Joi.string(),
	},
};

const WalletCardList = {
	body: {
		addressWallet: Joi.string().required(),
		signer: Joi.string().required(),
		message: Joi.string(),
	},
};

const damageAttribute = {
	body: {
		cardId: Joi.string().required(),
	},
};

const importCard = {
	body: {
		addressWallet: Joi.string().required(),
		cardId: Joi.string().required(),
		signer: Joi.string().required(),
	},
};

const importCustomCard = {
	body: {
		addressWallet: Joi.string().required(),
		cardName: Joi.string().required(),
		signer: Joi.string().required(),
	},
};

const updateCred = {
	body: {
		mobile: Joi.string().min(8).max(20),
		email: Joi.string().email().required(),
	},
};

const editProfile = {
	body: {
		name: Joi.string().trim().min(3).max(15),
		countryId: Joi.string(),
	},
};

const addAddress = {
	body: {
		address: Joi.string()
			.regex(/^0x[a-fA-F0-9]{40}$/)
			.message(" is not valid")
			.required(),
	},
};

const login = {
	body: {
		mobile: Joi.string().min(8).max(20),
		email: Joi.string()
			.regex(/^[a-zA-Z0-9](\.?[a-zA-Z0-9]){5,}@g(oogle)?mail\.com$/)
			.email(),
		password: Joi.string()
			// .regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
		gRecaptchaResponse: Joi.string(),
	},
};

const forgetPassword = {
	body: {
		mobile: Joi.string().min(8).max(20),
		email: Joi.string().email(),
		gRecaptchaResponse: Joi.string(),
	},
};

const resetPassword = {
	body: {
		token: Joi.string().max(500).required(),
		password: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
		gRecaptchaResponse: Joi.string(),
	},
};

const changePassword = {
	body: {
		oldPassword: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
		newPassword: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
	},
};

const verify = {
	body: {
		token: Joi.string().max(300).required(),
		code: Joi.string().length(4).required(),
		pushToken: Joi.string(),
		gRecaptchaResponse: Joi.string(),
	},
};

const notification = {
	query: {
		type: Joi.string().valid("public", "private").allow(null),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		status: Joi.boolean(),
	},
};

const updateNotification = {
	body: {
		fcm_token: Joi.string().required(),
	},
};

const readNotification = {
	body: {
		notification_id: Joi.array().required(),
	},
};

const getReferral = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
	},
};

const getAuctions = {
	query: {
		status: Joi.string().valid("ACTIVE", "INACTIVE"),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().valid("price", "start", "end", "createdAt").default("createdAt"),
		minPrice: Joi.number(),
		maxPrice: Joi.number(),
		cardType: Joi.number(),
	},
};

const getAuction = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

const addAuction = {
	body: {
		assignedCardId: Joi.number().min(1).required(),
		start: Joi.date().required(),
		end: Joi.date().required(),
		basePrice: Joi.number().min(0),
		immediatePrice: Joi.number().min(0),
		bookingPrice: Joi.number().min(0),
		auctionType: Joi.valid("CHALLENGE").required(),
	},
};

const editAuction = {
	body: {
		id: Joi.number().min(1).required(),
		start: Joi.date(),
		end: Joi.date(),
		basePrice: Joi.number().min(0),
		immediatePrice: Joi.number().min(0),
		bookingPrice: Joi.number().min(0),
	},
};

const deleteAuction = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

const getOffers = {
	query: {
		auctionId: Joi.number().min(1),
		status: Joi.array().valid(Joi.string().valid("CANCELED", "REGISTERED", "WON")),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
	},
};

const getOffer = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

const addOffers = {
	body: {
		auctionId: Joi.number().min(1).required(),
		amount: Joi.number().greater(0).required(),
	},
};

const editOffers = {
	body: {
		id: Joi.number().min(1),
		amount: Joi.number().greater(0),
	},
};

const deleteOffers = {
	params: {
		id: Joi.number().min(1).required(),
	},
};

///////////////////////////////// Manager's User CRUD /////////////////////////////////////////////////
const getUsers = {
	query: {
		id: Joi.number().min(1),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		name: Joi.string(),
		mobile: Joi.string(),
		email: Joi.string(),
		isVerified: Joi.boolean(),
		status: Joi.array().items(Joi.valid("ACTIVE", "INACTIVE", "BLOCK")),
		level: Joi.array().items(Joi.valid("NORMAL", "AGENT")),
		referralCode: Joi.string(),
		referredCode: Joi.string(),
		sort: Joi.string().default("id"),
		searchQuery: Joi.string().allow(null, ""),
		createdAt: Joi.date(),
		//filter
		orderOtherField: Joi.valid("DESC", "ASC"),
		sortOtherField: Joi.string(),
		country: Joi.string(),
	},
};

const findUserById = {
	params: {
		id: Joi.number().required(),
	},
};

const getSelector = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		searchQuery: Joi.string().allow(null, ""),
	},
};

// const searchUsers = {
//     body: {
//         id: Joi.number(),
//         page: Joi.number().default(1).min(1),
//         limit: Joi.number().default(10).min(1).max(100),
//         order: Joi.valid('DESC', 'ASC').default('DESC'),
//         name: Joi.string(),
//         mobile: Joi.string(),
//         email: Joi.string(),
//         isVerified: Joi.boolean(),
//         status: Joi.array().items(Joi.valid(1, 2, 3)),
//         level: Joi.array().items(Joi.valid(1, 2)),
//         referralCode: Joi.string(),
//         referredCode: Joi.string()
//     }
// }

const addUsers = {
	body: {
		name: Joi.string()
			.regex(/^(?=.{2,32}$)(?![ ])(?!.*[ ]{2})[a-zA-Z\u0600-\u06FF ]+(?<![ ])$/)
			.required(),
		mobile: Joi.string().min(8).max(20),
		email: Joi.string().email(),
		password: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
		referralCode: Joi.string(),
		referredCode: Joi.string(),
		isVerified: Joi.boolean(),
		status: Joi.valid("ACTIVE", "BLOCK", "INACTIVE").default("ACTIVE"),
		level: Joi.valid("NORMAL", "AGENT").default("NORMAL"),
		fee: Joi.number(),
	},
};

const editUsers = {
	body: {
		id: Joi.number().required(),
		name: Joi.string(),
		mobile: Joi.string().min(8).max(20),
		email: Joi.string().email(),
		password: Joi.string().regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/),
		referralCode: Joi.string(),
		referredCode: Joi.string(),
		isVerified: Joi.boolean(),
		status: Joi.valid("ACTIVE", "BLOCK", "INACTIVE").default("ACTIVE"),
		level: Joi.valid("NORMAL", "AGENT").default("NORMAL"),
		fee: Joi.number(),
	},
};

const getUserActivity = {
	query: {
		id: Joi.number().min(1),
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		searchQuery: Joi.string().allow(null, ""),
		createdAt: Joi.date(),
		userId: Joi.number(),
		name: Joi.string(),
		tag: Joi.string(),
		//filter
		orderOtherField: Joi.valid("DESC", "ASC"),
		sortOtherField: Joi.string(),
	},
};

const getUserCompetition = {
	params: {
		id: Joi.number().required(),
	},
};

const inviteLink = {
	params: {
		code: Joi.string().length(6).required(),
	},
};

const deleteAccount = {
	body: {
		password: Joi.string()
			.regex(/^(?=.*?[a-z])(?=.*?[0-9]).{8,64}$/)
			.required(),
	},
};

const UserAttribute = {
	params: {
		userId: Joi.string().required(),
	},
};

const getUserReferrals = {
	params: {
		userId: Joi.string().required(),
	},
};

const EditUserAttribute = {
	params: {
		attributeId: Joi.number().required(),
	},
	body: {
		amount: Joi.number().required(),
		text: Joi.string(),
	},
};

const getUserDamageHistory = {
	query: {
		page: Joi.number().min(1).default(1),
		limit: Joi.number().min(1).max(100).default(10),
		fromDate: Joi.date(),
		toDate: Joi.date(),
	},
};

const purchasePlan = {
	body: {
		planId: Joi.number().min(1).required(),
	},
};

module.exports = {
	signup,
	UserAttribute,
	updateCred,
	login,
	editProfile,
	forgetPassword,
	resetPassword,
	changePassword,
	verify,
	notification,
	getReferral,
	getAuctions,
	getAuction,
	addAuction,
	editAuction,
	deleteAuction,
	getOffers,
	getOffer,
	addOffers,
	editOffers,
	deleteOffers,
	WalletCardList,
	importCard,
	getUsers,
	getSelector,
	addUsers,
	editUsers,
	findUserById,
	importCustomCard,
	addAddress,
	damageAttribute,
	getUserActivity,
	updateNotification,
	getUserCompetition,
	inviteLink,
	deleteAccount,
	readNotification,
	EditUserAttribute,
	getUserDamageHistory,
	purchasePlan,
	getUserReferrals,
};
