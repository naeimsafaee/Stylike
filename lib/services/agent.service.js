const { postgres } = require("../databases");
const phone = require("phone");
const { NotFoundError, HumanError } = require("./errorhandler");
const { password, jwt } = require("../utils");
const Errors = require("./errorhandler/MessageText");

/**
 * login manager
 */
async function login(mobile, email, _password) {
	const findObject = { level: "AGENT" };
	let _mobile;
	if (email) {
		email = email.toLowerCase();
		findObject.email = email;
	} else {
		_mobile = phone("+" + mobile)?.[0] ?? null;
		if (!_mobile)
			throw new HumanError(Errors.MOBILE_FORMAT.MESSAGE, Errors.MOBILE_FORMAT.CODE, {
				mobile,
			});
		findObject.mobile = _mobile;
	}
	const user = await postgres.User.findOne({
		where: findObject,
		raw: true,
	});
	if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, findObject);

	const checkPassword = await password.validate(_password, user.salt, user.password);
	if (!checkPassword && findObject.email)
		throw new HumanError(Errors.EMAIL_AND_PASSWORD_INCORRECT.MESSAGE, Errors.EMAIL_AND_PASSWORD_INCORRECT.CODE);
	if (!checkPassword && findObject.mobile)
		throw new HumanError(Errors.MOBILE_AND_PASSWORD_INCORRECT.MESSAGE, Errors.MOBILE_AND_PASSWORD_INCORRECT.CODE);

	// generate user auth token
	const _token = new jwt.Token(user.id, "agent");

	const refreshToken = _token.generateRefresh();

	const accessToken = _token.generateAccess();

	await postgres.AgentSession.build({
		userId: user.id,
		accessToken,
		refreshToken,
		accessExpiresAt: _token.accessExpiresAt,
		refreshExpiresAt: _token.refreshExpiresAt,
	}).save();

	return {
		refreshToken: {
			token: refreshToken,
			expiresAt: _token.refreshExpiresAt,
		},
		accessToken: {
			token: accessToken,
			expiresAt: _token.accessExpiresAt,
		},
	};
}

/**
 * logout agent and delete current active session
 * @param {*} session
 * @returns
 */
async function logout(session) {
	let res = await postgres.AgentSession.destroy({ where: { id: session.id } });

	if (res) return true;

	return false;
}

/**
 * get agent info
 * @param {*} id
 * @returns
 */
async function info(id) {
	const agent = await postgres.User.findOne({
		where: { id, level: "AGENT" },
		attributes: ["id", "address", "name", "mobile", "email", "referralCode", "avatar", "levelId", "createdAt"],
		raw: true,
	});

	const fee = await postgres.Fee.findOne({
		where: { userType: "AGENT", userLevel: agent.levelId },
		include: postgres.Asset,
	});

	agent["fee"] = null;
	if (fee) agent.fee = fee;

	return agent;
}

/**
 * get agent wallet
 * @param {*} userId
 * @returns
 */
async function wallet(userId) {
	let result = await postgres.UserWallet.findAll({
		where: { userId },
		include: [
			{
				model: postgres.Asset,
				as: "asset",
				attributes: ["coin", "name", "precision", "type", "icon"],
			},
		],
		attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
		nest: true,
		raw: true,
	});

	return result;
}

/**
 * get agent statistics
 * @param {*} agentId
 * @param {*} page
 * @param {*} limit
 * @returns
 */
async function statistics(agentId, page, limit) {
	let result = await postgres.AgentStatistic.findAndCountAll({
		where: { agentId },
		limit,
		offset: (page - 1) * limit,
		order: [["createdAt", "DESC"]],
		include: [
			{
				model: postgres.User,
				as: "user",
				attributes: ["name", "avatar", "createdAt"],
			},
		],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get agent statistics details
 * @param {*} agentId
 * @param {*} userId
 * @param {*} page
 * @param {*} limit
 * @returns
 */
async function statisticDetails(agentId, userId, page, limit) {
	let result = await postgres.AgentReward.findAndCountAll({
		where: { agentId, userId },
		limit,
		offset: (page - 1) * limit,
		order: [["createdAt", "DESC"]],
		include: [
			{
				model: postgres.User,
				as: "user",
				attributes: ["name", "avatar", "createdAt"],
			},
		],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

async function stlReport(agentId, page, limit) {
	let result = await postgres.AgentReward.findAll({
		where: { agentId, competitionId: { [postgres.Op.ne]: null } },
		limit,
		offset: (page - 1) * limit,
		group: ["userId", "user.name", "user.email"],
		attributes: ["userId", postgres.sequelize.fn("SUM", postgres.sequelize.col("commission"))],
		order: [[postgres.sequelize.fn("SUM", postgres.sequelize.col("commission")), "DESC"]],
		include: [
			{
				model: postgres.User,
				as: "user",
				attributes: ["name", "email"],
			},
		],
		raw: true,
	});

	let count = await postgres.AgentReward.count({
		where: { agentId },
		group: ["userId"],
		attributes: ["userId"],
	});

	return {
		total: count.length,
		pageSize: limit,
		page,
		data: result,
	};
}

module.exports = {
	login,
	logout,
	info,
	wallet,
	statistics,
	statisticDetails,
	stlReport,
};
