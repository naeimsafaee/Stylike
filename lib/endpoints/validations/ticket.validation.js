const Joi = require("joi");

const userAddTicket = {
	body: {
		title: Joi.string(),
		text: Joi.string(),
		priority: Joi.string().valid("LOW", "MEDIUM", "HIGH").default("LOW"),
		departmentId: Joi.number(),
		deviceInfo: Joi.string()
	},
};
const userEditTicket = {
	body: {
		id: Joi.number(),
		title: Joi.string(),
		text: Joi.string(),
		priority: Joi.string().valid("LOW", "MEDIUM", "HIGH"),
		departmentId: Joi.number(),
	},
};
const userGetTickets = {
	query: {
		priority: Joi.string().valid("LOW", "MEDIUM", "HIGH"),
		departmentId: Joi.number(),
		status: Joi.string().valid("CREATED", "REPLIED", "CLOSED"),
		page: Joi.string().default(1),
		limit: Joi.string().default(10),
		sortDirection: Joi.valid("asc", "desc").default("desc"),
	},
};
const userGetTicket = {
	params: {
		id: Joi.number(),
	},
};
const userDeleteTicket = {
	params: {
		id: Joi.number(),
	},
};
const userChangeTicketStatus = {
	params: {
		id: Joi.number(),
	},
	query: {
		status: Joi.string().valid("CREATED", "REPLIED", "CLOSED"),
	},
};
const managerAddTicket = {
	body: {
		userId: Joi.number().min(1),
		title: Joi.string(),
		text: Joi.string(),
		priority: Joi.string().valid("LOW", "MEDIUM", "HIGH").default("LOW"),
		managerId: Joi.number().min(1),
		departmentId: Joi.number().min(1),
	},
};
const managerEditTicket = {
	body: {
		id: Joi.number(),
		title: Joi.string(),
		text: Joi.string(),
		priority: Joi.string().valid("LOW", "MEDIUM", "HIGH"),
		departmentId: Joi.number(),
		managerId: Joi.number(),
		note: Joi.string(),
		tag: Joi.string(),
		status: Joi.string(),
	},
};
const managerGetTickets = {
	query: {
		userId: Joi.string(),
		type: Joi.string().valid("MANAGER", "USER").default("MANAGER"),
		priority: Joi.array().items(Joi.valid("LOW", "MEDIUM", "HIGH")),
		departmentId: Joi.number(),
		status: Joi.array().items(Joi.valid("CREATED", "REPLIED", "CLOSED", "PENDING")),
		page: Joi.string().default(1),
		limit: Joi.string().default(10),
		sortDirection: Joi.valid("asc", "desc").default("desc"),
		userName: Joi.string(),
		title: Joi.string(),
		code: Joi.string(),
		departmentName: Joi.string(),
		createdAt: Joi.date(),
		searchQuery: Joi.string().allow(null, ""),
		sort: Joi.string().default("id"),
		order: Joi.valid("DESC", "ASC").default("DESC"),
	},
};
const managerGetTicket = {
	params: {
		id: Joi.number(),
	},
};
const managerDeleteTicket = {
	params: {
		id: Joi.number(),
	},
};
const managerChangeTicketStatus = {
	body: {
		status: Joi.string(),
		id: Joi.number(),
	},
};

const managerChangeTicketDepartment = {
	body: {
		departmentId: Joi.number().min(1).required(),
	},
};
const managerAcceptTicket = {
	params: {
		id: Joi.number(),
	},
};

const userAddReply = {
	body: {
		ticketId: Joi.number(),
		text: Joi.string(),
	},
};
const userEditReply = {
	body: {
		id: Joi.number(),
		ticketId: Joi.number(),
		text: Joi.string(),
	},
};
const userGetReplies = {
	query: {
		ticketId: Joi.number(),
		page: Joi.string().default(1),
		limit: Joi.string().default(10),
		sortDirection: Joi.valid("asc", "desc").default("desc"),
	},
};
const userGetReply = {
	params: {
		id: Joi.number(),
	},
};
const userDeleteReply = {
	params: {
		id: Joi.number(),
	},
};
const managerAddReply = {
	body: {
		ticketId: Joi.number(),
		text: Joi.string(),
		managerId: Joi.number(),
	},
};
const managerEditReply = {
	body: {
		id: Joi.number(),
		ticketId: Joi.number(),
		text: Joi.string(),
		managerId: Joi.number(),
	},
};
const managerApproveReply = {
	body: {
		text: Joi.string().required(),
	},
};
const managerGetReplies = {
	query: {
		ticketId: Joi.number(),
		page: Joi.string().default(1),
		limit: Joi.string().default(10),
		sortDirection: Joi.valid("asc", "desc").default("desc"),
	},
};

const managerGetReply = {
	params: {
		id: Joi.number(),
	},
};

const managerDeleteReply = {
	params: {
		id: Joi.number(),
	},
};

const managerGetReplyTemplates = {
	query: {
		page: Joi.number().default(1).min(1),
		limit: Joi.number().default(10).min(1).max(100),
		order: Joi.valid("DESC", "ASC").default("DESC"),
		sort: Joi.string().default("id"),
		id: Joi.number().min(1),
		name: Joi.string(),
	},
};

const managerGetReplyTemplateById = {
	params: {
		id: Joi.number().required(),
	},
};

const managerAddReplyTemplate = {
	body: {
		name: Joi.string().required(),
		text: Joi.string().required(),
	},
};

const managerDeleteReplyTemplate = {
	params: {
		id: Joi.number().required(),
	},
};

module.exports = {
	userAddTicket,
	userEditTicket,
	userGetTickets,
	userGetTicket,
	userDeleteTicket,
	userChangeTicketStatus,
	managerAddTicket,
	managerEditTicket,
	managerGetTickets,
	managerGetTicket,
	managerDeleteTicket,
	managerChangeTicketStatus,
	managerChangeTicketDepartment,
	managerAcceptTicket,

	userAddReply,
	userEditReply,
	userGetReplies,
	userGetReply,
	userDeleteReply,
	managerAddReply,
	managerEditReply,
	managerApproveReply,
	managerGetReplies,
	managerGetReply,
	managerDeleteReply,

	managerGetReplyTemplates,
	managerGetReplyTemplateById,
	managerAddReplyTemplate,
	managerDeleteReplyTemplate,
};
