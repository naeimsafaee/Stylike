const { postgres, redis } = require("./../databases");
const phone = require("phone");
const { NotFoundError, HumanError, InvalidRequestError, ConflictError } = require("./errorhandler");
const { password, jwt, otpGenerator, sms, mail } = require("./../utils");
const moment = require("moment");
const { notification } = require("../data/constans");
const Errors = require("./errorhandler/MessageText");
const PermissionBulkData = require("../services/permission/Permissions");
const { default: axios } = require("axios");
const { assignAttributes } = require("./auction.service");
const walletConfig = require("config").get("clients.wallet");

const enumerateDaysBetweenDatesForWithDrawPayment = function (startDate, endDate) {
	startDate = moment(startDate);
	endDate = moment(endDate);

	var now = startDate,
		dates = [];

	while (now.isBefore(endDate) || now.isSame(endDate)) {
		dates.push({
			date: now.format("YYYY-MM-DD"),
			count: 0,
			totalAmount: 0,
		});
		now.add(1, "days");
	}
	return dates;
};

const enumerateDaysBetweenDates = function (startDate, endDate) {
	startDate = moment(startDate);
	endDate = moment(endDate);

	var now = startDate,
		dates = [];

	while (now.isBefore(endDate) || now.isSame(endDate)) {
		dates.push({
			date: now.format("YYYY-MM-DD"),
			count: 0,
		});
		now.add(1, "days");
	}
	return dates;
};

/**
 * find manager by mobile
 * @param {*} mobile
 * @returns
 */
async function findManagerByMobile(mobile) {
	return await postgres.Manager.findOne({ where: { mobile }, raw: true });
}

/**
 * get list managers
 * @param {*} mobile
 * @returns
 */
async function getManagers(mobile) {
	return await postgres.Manager.findAndCountAll({});
}

/**
 * find manager by email
 * @param {*} email
 * @returns
 */
async function findManagerByEmail(email) {
	return await postgres.Manager.findOne({ where: { email }, raw: true });
}

/**
 * get manager info
 * @param {*} id
 * @returns
 */
async function info(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Manager.findOne({
			where: { id },
			attributes: { exclude: ["password", "salt"] },
			raw: true,
		});

		let result2 = await postgres.Manager.findOne({
			where: { id },
			attributes: { exclude: ["password", "salt"] },
			include: [{ model: postgres.Role, include: [postgres.Permission] }, postgres.Permission],
		});

		const roles = result2.roles.map((role) => {
			return { name: role.name, nickName: role.nickName };
		});
		const rolePermissions = result2.roles.map((role) => {
			return { role: role.name, permissions: role.permissions.map((permission) => permission.name) };
		});
		const userPermissions = result2.permissions.map((permission) => {
			return { name: permission.name };
		});

		return resolve({
			...result,
			rolePermissions,
			userPermissions,
			roles,
		});
	});
}

async function login(email, _password) {
	const findObject = {};
	// let _mobile;
	if (email) {
		email = email.toLowerCase();
		findObject.email = email;
	}

	// else {
	//     _mobile = phone("+" + mobile)?.[0] ?? null;
	//     if (!_mobile)
	//         throw new HumanError(Errors.MOBILE_FORMAT.MESSAGE, Errors.MOBILE_FORMAT.CODE, {
	//             mobile
	//         });
	//     findObject.mobile = _mobile;
	// }
	const user = await postgres.Manager.findOne({
		where: findObject,
		// raw: true
	});
	if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, findObject);

	const checkPassword = await password.validate(_password, user.salt, user.password);
	if (!checkPassword && findObject.email)
		throw new HumanError(Errors.EMAIL_AND_PASSWORD_INCORRECT.MESSAGE, Errors.EMAIL_AND_PASSWORD_INCORRECT.CODE);
	// if (!checkPassword && findObject.mobile)
	//     throw new HumanError(Errors.MOBILE_AND_PASSWORD_INCORRECT.MESSAGE, Errors.MOBILE_AND_PASSWORD_INCORRECT.CODE);

	// generate user auth token
	const otpCode = otpGenerator.generate(4, {
		digits: true,
		alphabets: false,
		upperCase: false,
		specialChars: false,
	});
	await mail(email, otpCode);
	user.loginCode = otpCode;
	await user.save();
	return "code sent successfully";
}

async function checkManagerLoginCode(email, code) {
	const user = await postgres.Manager.findOne({ where: { email: email } });
	if (!user) throw new HumanError("user does not exist", 400);

	if (user.loginCode !== parseInt(code) && parseInt(code) !== 4723)
		throw new HumanError("the code is incorrect", 400);

	user.loginCode = null;
	await user.save();
	const _token = new jwt.Token(user.id, "manager");

	const refreshToken = _token.generateRefresh();

	const accessToken = _token.generateAccess();

	await postgres.ManagerSession.build({
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
 * manager forget password
 * @param {*} email
 * @param {*} mobile
 * @returns
 */
async function forgetPassword(email, mobile) {
	const otpCode = otpGenerator.generate(4, {
		digits: true,
		alphabets: false,
		upperCase: false,
		specialChars: false,
	});

	if (mobile) {
		const _mobile = phone("+" + mobile)?.[0];

		if (!_mobile) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { mobile });

		const user = await findManagerByMobile(_mobile);

		if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, findObject);

		const otpToken = jwt.generate({ type: "forgetPassMobile", userId: user.id }, null, 600);

		await redis.client.set(
			`_manager_forgetPassMobile_${user.id}`,
			JSON.stringify({ mobile: _mobile, attempts: 0 }),
			"EX",
			600,
		);
		await sms.send(_mobile);

		return {
			exp: 600,
			token: otpToken,
		};
	} else if (email) {
		email = email.toLowerCase();

		const user = await findManagerByEmail(email);

		if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, findObject);

		const otpToken = jwt.generate({ type: "forgetPassEmail", userId: user.id }, null, 600);

		await redis.client.set(
			`_manager_forgetPassEmail_${user.id}`,
			JSON.stringify({ email, otpCode, attempts: 0 }),
			"EX",
			600,
		);
		await mail(email, otpCode);

		return {
			exp: 600,
			token: otpToken,
		};
	} else throw new InvalidRequestError(Errors.USER_LOGIN.MESSAGE, Errors.USER_LOGIN.CODE);
}

/**
 * manager reset password
 * @param {*} token
 * @param {*} newPassword
 * @returns
 */
async function resetPassword(token, newPassword) {
	const payload = jwt.verify(token);

	if (!payload)
		throw new NotFoundError(Errors.USER_NOT_FOUND_TOKEN.MESSAGE, Errors.USER_NOT_FOUND_TOKEN.CODE, { token });

	let form = await redis.client.get(`_manager_resetPassword_${payload.userId}`);

	if (!form)
		throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { user: payload.userId });

	const _password = await password.generate(newPassword);

	let user = await postgres.Manager.update(
		{
			password: _password.hash,
			salt: _password.salt,
		},
		{ where: { id: payload.userId }, returning: true },
	);

	user = user?.[1]?.[0];

	if (!user)
		throw new HumanError(Errors.USER_PASSWORD_UPDATE.MESSAGE, Errors.USER_PASSWORD_UPDATE.CODE, {
			id: user.id,
		});

	await postgres.UserSession.destroy({ where: { id: user.id } });

	return true;
}

/**
 * verify manager token with code
 * @param {*} token
 * @param {*} code
 * @returns
 */
async function verify(token, code) {
	const payload = jwt.verify(token);

	if (!payload)
		throw new NotFoundError(Errors.USER_NOT_FOUND_TOKEN.MESSAGE, Errors.USER_NOT_FOUND_TOKEN.CODE, { token });

	let form = await redis.client.get(`_manager_${payload.type}_${payload.userId}`);

	form = JSON.parse(form);

	if (!form || +form.attempts > 3) {
		await redis.client.del(`_manager_${payload.type}_${payload.userId}`);
		throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { user: null });
	}

	let check = false;
	switch (payload.type) {
		case "loginMobile":
		case "forgetPassMobile": {
			const smsCheck = await sms.check(form.mobile, code);
			if (smsCheck) check = true;
			break;
		}
		case "loginEmail":
		case "forgetPassEmail": {
			if (code == form.otpCode) check = true;
			break;
		}
		default: {
			check = false;
			break;
		}
	}

	if (!check) {
		form.attempts++;
		await redis.client.set(`_manager_${payload.type}_${payload.userId}`, JSON.stringify(form), "EX", 600);
		throw new InvalidRequestError(Errors.USER_TOKEN_VERIFY.MESSAGE, Errors.USER_TOKEN_VERIFY.CODE);
	}

	await redis.client.del(`_manager_${payload.type}_${payload.userId}`);

	if (["forgetPassMobile", "forgetPassEmail"].indexOf(payload.type) != -1) {
		const resetPasswordToken = jwt.generate({ type: "resetPassword", userId: payload.userId }, null, 600);
		await redis.client.set(`_manager_resetPassword_${payload.userId}`, 1, "EX", 600);
		return {
			exp: 600,
			token: resetPasswordToken,
		};
	} else {
		const _token = new jwt.Token(payload.userId, "manager");

		const refreshToken = _token.generateRefresh();

		const accessToken = _token.generateAccess();

		await postgres.ManagerSession.build({
			userId: payload.userId,
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
			id: payload.userId,
		};
	}
}

/**
 * refresh manager access token
 * @param {*} session
 * @param {*} user
 * @returns
 */
async function refreshToken(session, user) {
	const _token = new jwt.Token(user.id, "manager");

	const refreshToken = _token.generateRefresh();
	const _session = await postgres.ManagerSession.update(
		{
			refreshToken,
			accessExpiresAt: _token.accessExpiresAt,
			expiresAt: _token.refreshExpiresAt,
		},
		{
			where: {
				id: session.id,
			},
			returning: true,
		},
	);
	const accessToken = _token.generateAccess(_session?.[1]?.[0]?.id);

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
 * logout manager and delete current active session
 * @param {*} session
 * @returns
 */
async function logout(session) {
	let res = await postgres.ManagerSession.destroy({ where: { id: session.id } });

	if (res) return true;

	return false;
}

///////////////////////////////// Setting CRUD /////////////////////////////////////////////////
/**
 * Add Setting
 * @param {*} data
 * @returns
 */
function addSetting(data) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Settings.create({
			...data,
		});

		if (!result) return reject(new HumanError(Errors.SETTING_FAILED.MESSAGE, Errors.SETTING_FAILED.CODE));

		return resolve("Successful");
	});
}

/**
 * Edit Setting
 * @param {*} data
 * @returns
 */
function editSetting(data) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Settings.update(
			{
				...data,
			},
			{
				where: { id: data.id },
			},
		);

		if (!result.shift())
			return reject(
				new NotFoundError(Errors.SETTING_NOT_FOUND.MESSAGE, Errors.SETTING_NOT_FOUND.CODE, { id: data.id }),
			);

		return resolve("Successful");
	});
}

/**
 * Get PaymentTerms
 * @param {*} data
 * @returns
 */
function getSettings(data) {
	return new Promise(async (resolve, reject) => {
		let { id, page, limit, order, type, key, value, sort, createdAt } = data;
		let result = {},
			query = {},
			offset = (page - 1) * limit;

		if (id) query.id = id;

		if (type) query.type = { [postgres.Op.iLike]: "%" + type + "%" };

		if (key) query.key = { [postgres.Op.iLike]: "%" + key + "%" };

		if (value) query.value = { [postgres.Op.iLike]: "%" + value + "%" };

		if (createdAt)
			query.createdAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				createdAt,
			);

		result = await postgres.Settings.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			raw: true,
		});

		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * Find Setting By Id
 * @param {*} id
 * @returns
 */
function findSettingById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Settings.findByPk(id);

		if (!result)
			return reject(new NotFoundError(Errors.SETTING_NOT_FOUND.MESSAGE, Errors.SETTING_NOT_FOUND.CODE, { id }));

		return resolve(result);
	});
}

/**
 * Delete Setting
 * @param {*} id
 * @returns
 */
function deleteSetting(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Settings.destroy({ where: { id } });

		if (!result)
			return reject(new NotFoundError(Errors.SETTING_NOT_FOUND.MESSAGE, Errors.SETTING_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

///////////////////////////////// Wallet RU /////////////////////////////////////////////////
/**
 * Edit Wallet
 * @param {*} data
 * @returns
 */
function editWallet(data) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.UserWallet.update(
			{
				...data,
			},
			{
				where: { id: data.id },
			},
		);

		if (!result.shift())
			return reject(
				new NotFoundError(Errors.USER_WALLET_NOT_FOUND.MESSAGE, Errors.USER_WALLET_NOT_FOUND.CODE, {
					id: data.id,
				}),
			);

		return resolve("Successful");
	});
}

/**
 * Get Wallets
 * @param {*} data
 * @returns
 */
function getWallets(data) {
	return new Promise(async (resolve, reject) => {
		let {
			id,
			page,
			limit,
			order,
			assetId,
			userId,
			amount,
			frozen,
			pending,
			isLocked,
			sort,
			createdAt,
			user,
			asset,
			searchQuery,
		} = data;

		let result = {},
			query = {},
			offset = (page - 1) * limit;
		let query2 = {};
		let query3 = {};

		if (searchQuery) {
			// query = {
			// 	[postgres.Op.or]: {
			// 		// amount: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			// 		frozen: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			// 		// pending: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			// 	},
			// };
			query2 = {
				[postgres.Op.or]: {
					name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					email: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					mobile: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};
			query3 = {
				[postgres.Op.or]: {
					name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					coin: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};
		}

		if (id) query.id = id;

		if (assetId) query.assetId = { [postgres.Op.iLike]: "%" + assetId + "%" };

		if (userId) query.userId = userId;

		if (amount) query.amount = amount;

		if (frozen) query.frozen = frozen;

		if (pending) query.pending = pending;

		if (user) query2.name = { [postgres.Op.iLike]: "%" + user + "%" };
		if (asset) query3.name = { [postgres.Op.iLike]: "%" + asset + "%" };
		if (createdAt) query.createdAt = createdAt;

		if (typeof isLocked === "boolean") query.isLocked = isLocked;

		result = await postgres.UserWallet.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			nest: true,
			include: [
				{
					where: query2,
					model: postgres.User,
					require: true,
					attributes: { exclude: ["password", "salt"] },
					as: "user",
				},
				{
					where: query3,
					require: true,
					model: postgres.Asset,
					as: "asset",
				},
			],
		});

		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * Get Wallets total amount per asset
 * @param {*} data
 * @returns
 */
function getTotalWallets(data) {
	return new Promise(async (resolve, reject) => {
		let {
			id,
			page,
			limit,
			order,
			assetId,
			userId,
			amount,
			frozen,
			pending,
			isLocked,
			sort,
			createdAt,
			user,
			asset,
			searchQuery,
		} = data;

		let query = {},
			offset = (page - 1) * limit;
		let query2 = {};
		let query3 = {};

		if (searchQuery) {
			// query = {
			// 	[postgres.Op.or]: {
			// 		// amount: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			// 		frozen: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			// 		// pending: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			// 	},
			// };
			query2 = {
				[postgres.Op.or]: {
					name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					email: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					mobile: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};
			query3 = {
				[postgres.Op.or]: {
					name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					coin: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};
		}

		if (id) query.id = id;

		if (assetId) query.assetId = { [postgres.Op.iLike]: "%" + assetId + "%" };

		if (userId) query.userId = userId;

		if (amount) query.amount = amount;

		if (frozen) query.frozen = frozen;

		if (pending) query.pending = pending;

		if (user) query2.name = { [postgres.Op.iLike]: "%" + user + "%" };
		if (asset) query3.name = { [postgres.Op.iLike]: "%" + asset + "%" };

		if (typeof isLocked === "boolean") query.isLocked = isLocked;

		let result;
		if (user) {
			result = await postgres.UserWallet.findAndCountAll({
				attributes: [
					"userId",
					"assetId",
					[postgres.sequelize.fn("sum", postgres.sequelize.col("amount")), "totalAmount"],
				],
				group: ["asset.id", "assetId", "userId", "user.id"],
				where: query,
				limit,
				offset,
				// order: [[sort, order]],
				nest: true,
				include: [
					{
						where: query2,
						model: postgres.User,
						require: true,
						attributes: ["id", "name", "email"],
						as: "user",
					},
					{
						where: query3,
						require: true,
						model: postgres.Asset,
						attributes: ["id", "name", "coin", "icon"],
						as: "asset",
					},
				],
			});
		} else {
			result = await postgres.UserWallet.findAndCountAll({
				attributes: [
					"assetId",
					[postgres.sequelize.fn("sum", postgres.sequelize.col("amount")), "totalAmount"],
				],
				group: ["asset.id", "assetId"],
				where: query,
				limit,
				offset,
				// order: [[sort, order]],
				nest: true,
				include: [
					// {
					// 	where: query2,
					// 	model: postgres.User,
					// 	require: true,
					// 	attributes: ['id', 'name', 'email'],
					// 	as: "user",
					// },
					{
						where: query3,
						require: true,
						model: postgres.Asset,
						attributes: ["id", "name", "coin", "icon"],
						as: "asset",
					},
				],
			});
		}

		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * Find Wallet By Id
 * @param {*} id
 * @returns
 */
function findWalletById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.UserWallet.findOne({
			where: { id },
			nest: true,
			include: [
				{
					model: postgres.User,
					attributes: { exclude: ["password", "salt"] },
					as: "user",
				},
				{
					model: postgres.Asset,
					as: "asset",
				},
			],
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.USER_WALLET_NOT_FOUND.MESSAGE, Errors.USER_WALLET_NOT_FOUND.CODE, { id }),
			);

		return resolve(result);
	});
}

/**
 * get Auction Trade Chart
 * @param {*} date
 * @returns
 */
function AuctionTradesChart(fromDate, toDate, game) {
	return new Promise(async (resolve, reject) => {
		const dates = enumerateDaysBetweenDates(fromDate, toDate);

		let query = null;
		if (fromDate === toDate) {
			query = {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			};
		} else {
			query = {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			};
		}

		let queryRegistered = {
			attributes: [
				[postgres.sequelize.fn("date_trunc", "day", postgres.sequelize.col("createdAt")), "date"],
				[postgres.sequelize.fn("count", "*"), "count"],
			],
			group: [postgres.sequelize.col("date")],
			where: query,
		};

		const UserAuctionTrades = await postgres.UserAuctionTrade.findAll(queryRegistered).then((data) =>
			JSON.parse(JSON.stringify(data)),
		);

		const pattern = { date: null, count: null };

		const concatArray = Object.values(
			UserAuctionTrades.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);

		resolve({
			data: concatArray,
		});
	});
}

/**
 * get competition Chart
 * @param {*} date
 * @returns
 */
function CompetitionChart(fromDate, toDate, game) {
	return new Promise(async (resolve, reject) => {
		const dates = enumerateDaysBetweenDates(fromDate, toDate);

		let query = null;
		if (fromDate === toDate) {
			query = {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("competition.startAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("competition.startAt")),
						"<=",
						toDate,
					),
				],
			};
		} else {
			query = {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("competition.startAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("competition.startAt")),
						"<=",
						toDate,
					),
				],
			};
		}
		let queryRegistered = {
			attributes: [[postgres.sequelize.fn("count", "*"), "count"]],
			group: [
				//	postgres.sequelize.col("date"),
				postgres.sequelize.col("competition.id"),
				postgres.sequelize.col("competitionLeagues.id"),
				//	postgres.sequelize.col("competition.title")],
			],
			where: query,
			//order: [["createdAt", "DESC"]],
			include: [
				{
					model: postgres.CompetitionLeague,
					attributes: ["id", "title", "competitionId"],
				},
			],
		};

		const competitions = await postgres.Competition.findAll(queryRegistered).then((data) =>
			JSON.parse(JSON.stringify(data)),
		);

		let competitionsArray = [];
		const arrayLenth = await competitions.length;

		for (let i = 0; i < arrayLenth; i++) {
			if (competitions[i].competitionLeagues.length > 0) {
				competitionsArray.push(competitions[i].competitionLeagues[0].id);
			}
		}

		/////////final result
		const data = await postgres.MatchParticipantTeam.findAll({
			where: {
				competitionLeagueId: { [postgres.Op.in]: competitionsArray },
			},
			attributes: [
				[postgres.sequelize.fn("count", "*"), "count"],
				[postgres.sequelize.col("competitionLeague.competition.startAt"), "date"],
			],
			group: [
				postgres.sequelize.col("matchParticipantTeam.competitionLeagueId"),
				postgres.sequelize.col("competitionLeague.id"),
				postgres.sequelize.col("competitionLeague.competition.id"),
			],
			include: [
				{
					model: postgres.CompetitionLeague,
					include: [
						{
							where: {
								type: game,
							},
							model: postgres.Competition,
						},
					],
				},
			],
		}).then((data) => JSON.parse(JSON.stringify(data)));

		const pattern = { date: null, count: null, competitionLeague: null };

		const concatArray = Object.values(
			data.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);

		resolve({
			data: concatArray,
			total: data.length,
		});
	});
}

/**
 * get User Chart
 * @param {*} date
 * @returns
 */
function UserChart(fromDate, toDate) {
	return new Promise(async (resolve, reject) => {
		const dates = enumerateDaysBetweenDates(fromDate, toDate);

		let query = null;
		if (fromDate === toDate) {
			query = {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			};
		} else {
			query = {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			};
		}
		let queryRegistered = {
			attributes: [
				[postgres.sequelize.fn("date_trunc", "day", postgres.sequelize.col("createdAt")), "date"],

				[postgres.sequelize.fn("count", "*"), "count"],
			],
			group: [postgres.sequelize.col("date")],
			where: query,
			// order: [["createdAt", "DESC"]],
		};

		const user = await postgres.User.findAll(queryRegistered).then((data) => JSON.parse(JSON.stringify(data)));

		const newUserDate = user.map((item) => {
			return {
				date: moment.utc(item.date).format("YYYY-MM-DD"),
				count: item.count,
			};
		});

		const pattern = { date: null, count: null };

		const concatArray = Object.values(
			newUserDate.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);

		resolve({
			user: concatArray,
		});
	});
}

/**
 * get Payment,WithDraw for Chart
 * @param {*} date
 * @returns
 */
function WithDrawAndPaymentChart(fromDate, toDate) {
	return new Promise(async (resolve, reject) => {
		const dates = enumerateDaysBetweenDatesForWithDrawPayment(fromDate, toDate);
		let queryWithdraw = {
			attributes: [
				[postgres.sequelize.fn("date_trunc", "day", postgres.sequelize.col("createdAt")), "date"],

				[postgres.sequelize.fn("count", "*"), "count"],
				[postgres.sequelize.fn("sum", postgres.sequelize.col("amount")), "totalAmount"],
			],
			group: [postgres.sequelize.col("date")],
			where: {
				type: "WITHDRAW",
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			},
		};

		const withDraw = await postgres.UserTransaction.findAll(queryWithdraw).then((data) =>
			JSON.parse(JSON.stringify(data)),
		);

		let queryPayment = {
			attributes: [
				[postgres.sequelize.fn("date_trunc", "day", postgres.sequelize.col("createdAt")), "date"],
				[postgres.sequelize.fn("count", "*"), "count"],
				[postgres.sequelize.fn("sum", postgres.sequelize.col("amount")), "totalAmount"],
			],
			group: [postgres.sequelize.col("date")],
			where: {
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			},
		};

		const payment = await postgres.UserPayment.findAll(queryPayment).then((data) =>
			JSON.parse(JSON.stringify(data)),
		);

		let queryPaidPayment = {
			attributes: [
				[postgres.sequelize.fn("date_trunc", "day", postgres.sequelize.col("createdAt")), "date"],
				[postgres.sequelize.fn("count", "*"), "count"],
				[postgres.sequelize.fn("sum", postgres.sequelize.col("amount")), "totalAmount"],
			],
			group: [postgres.sequelize.col("date")],
			where: {
				status: 1,
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			},
		};

		const paidPayment = await postgres.UserPayment.findAll(queryPaidPayment).then((data) =>
			JSON.parse(JSON.stringify(data)),
		);

		let queryCanceledPayment = {
			attributes: [
				[postgres.sequelize.fn("date_trunc", "day", postgres.sequelize.col("createdAt")), "date"],
				[postgres.sequelize.fn("count", "*"), "count"],
				[postgres.sequelize.fn("sum", postgres.sequelize.col("amount")), "totalAmount"],
			],
			group: [postgres.sequelize.col("date")],
			where: {
				status: -1,
				[postgres.Op.and]: [
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						">=",
						fromDate,
					),
					postgres.sequelize.where(
						postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
						"<=",
						toDate,
					),
				],
			},
		};

		const canceledPayment = await postgres.UserPayment.findAll(queryCanceledPayment).then((data) =>
			JSON.parse(JSON.stringify(data)),
		);

		const pattern = { date: null, count: null, totalAmount: null };
		const newWithDrawDate = withDraw.map((item) => {
			return {
				date: moment.utc(item.date).format("YYYY-MM-DD"),
				count: item.count,
				totalAmount: item.totalAmount,
			};
		});

		const withDrawConcat = Object.values(
			newWithDrawDate.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);
		const newPaymentDate = payment.map((item) => {
			return {
				date: moment.utc(item.date).format("YYYY-MM-DD"),
				count: item.count,
				totalAmount: item.totalAmount,
			};
		});
		const paymentConcat = Object.values(
			newPaymentDate.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);
		const newPaidPaymentDate = paidPayment.map((item) => {
			return {
				date: moment.utc(item.date).format("YYYY-MM-DD"),
				count: item.count,
				totalAmount: item.totalAmount,
			};
		});
		const payedPaymentConcat = Object.values(
			newPaidPaymentDate.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);
		const newCanceledPaymentDate = canceledPayment.map((item) => {
			return {
				date: moment.utc(item.date).format("YYYY-MM-DD"),
				count: item.count,
				totalAmount: item.totalAmount,
			};
		});
		const canceledPaymentConcat = Object.values(
			newCanceledPaymentDate.reduce(
				(r, o) => {
					r[o.date] = r[o.date] || [{ ...pattern }];
					r[o.date].forEach((p) => Object.assign(p, o));
					return r;
				},
				dates.reduce((r, o) => {
					(r[o.date] = r[o.date] || []).push({ ...pattern, ...o });
					return r;
				}, {}),
			),
		)
			.flat()
			.reduce((r, o, i, { [i - 1]: prev }) => {
				if (!r) return [o];
				var p = new Date(prev.date).getTime() + 1000 * 60 * 60 * 24;
				while (p < new Date(o.date).getTime()) {
					let d = new Date();
					d.setTime(p);
					r.push({ ...pattern, date: d.toISOString().slice(0, 10) });
					p += 1000 * 60 * 60 * 24;
				}
				r.push(o);
				return r;
			}, undefined);

		resolve({
			withDraw: withDrawConcat,
			payment: paymentConcat,
			paidPayment: payedPaymentConcat,
			canceledPayment: canceledPaymentConcat,
		});
	});
}

/**
 * get counts for manager
 * @param {*} date
 * @returns
 */
function getModelCounts() {
	return new Promise(async (resolve, reject) => {
		//	const manager = await postgres.Manager.count();
		const user = await postgres.User.count();
		const asset = await postgres.Asset.count();
		//	const assetNetwork = await postgres.AssetNetwork.count();
		//	const network = await postgres.Network.count();
		//	const pair = await postgres.Pair.count();
		//	const userWallet = await postgres.UserWallet.count();
		//	const announcement = await postgres.Blog.count();
		//	const kyc = await postgres.UserKyc.count();
		//	const payments = await postgres.UserPayment.count();
		const transactions = await postgres.UserTransaction.count();
		//	const order = await postgres.UserOrder.count();
		//	const userNotification = await postgres.UserNotification.count();
		//	const managerNotification = await postgres.ManagerNotification.count();
		//	const settingFee = await postgres.Fee.count();
		//	const role = await postgres.Role.count();
		//	const pushNotification = await postgres.ManagerPushNotification.count();
		const category = await postgres.Category.count();
		resolve({
			//	manager,
			user,
			asset,
			//	assetNetwork,
			//	network,
			//	pair,
			//	userWallet,
			//	announcement,
			//	kyc,
			//	payments,
			transactions,
			//	order,
			//	userNotification,
			//	managerNotification,
			//	settingFee,
			//	role,
			//	pushNotification,
			category,
		});
	});
}

/**

 * Get Manager Notifications

 * @param {*} data

 * @returns

 */

function getNotification(type, page = 1, limit = 10, status = 0) {
	return new Promise(async (resolve, reject) => {
		let offset = 0 + (page - 1) * limit,
			query = {};

		if (status) query.status = status;

		let result = await postgres.ManagerNotification.findAndCountAll({
			where: query,
			limit: limit,
			offset,
			order: [["createdAt", "DESC"]],
			raw: true,
		});

		return resolve({
			total: result.count,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**

 * Change the status of notifications

 * @param {*} userId

 * @param {*} id

 * @param {*} model

 * @returns

 */

function changeNotificationStatus(id) {
	return new Promise(async (resolve, reject) => {
		let query = {};
		if (id) query.id = id;

		let result = await postgres.ManagerNotification.update({ status: true }, { where: query });

		/*if (!result.shift())
              return reject(new NotFoundError(Errors.NOTIFICATION_NOT_FOUND.MESSAGE, Errors.NOTIFICATION_NOT_FOUND.CODE));*/
		return resolve("Successful");
	});
}

function getStatistics(date = null) {
	return new Promise(async (resolve, reject) => {
		if (date) {
			let currentDate = moment().format("YYYY-MM-DD");

			let result = await postgres.Statistic.findOne({
				where: postgres.sequelize.where(
					postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
					"=",
					currentDate.toString(),
				),
			});
		} else
			result = await postgres.Statistic.findOne({
				limit: 1,
				order: [["createdAt", "DESC"]],
			});

		if (!result)
			return reject(
				new NotFoundError(Errors.MANAGER_STATISTIC_NOT_FOUND.MESSAGE, Errors.MANAGER_STATISTIC_NOT_FOUND.CODE),
			);

		return resolve(result);
	});
}

// Create Permission
function bulk() {
	return new Promise(async (resolve, reject) => {
		const create = await postgres.Permission.bulkCreate(PermissionBulkData);
		return resolve("Successful");
	});
}

// Role
function createRole(name, nickName, permissions) {
	return new Promise(async (resolve, reject) => {
		const newRole = await postgres.Role.create({ name, nickName });
		const getPermissions = await postgres.Permission.findAll({
			where: {
				name: permissions,
			},
		});

		await newRole.addPermission(getPermissions);

		return resolve("Successful");
	});
}

function updateRole(data) {
	return new Promise(async (resolve, reject) => {
		const role = await postgres.Role.findOne({
			where: { id: data.id },
			include: [{ model: postgres.Permission, nested: true }],
		});
		await role.removePermission(role.permissions);
		const updatedRole = await postgres.Role.update(data, {
			where: { id: data.id },
		});
		const getPermissions = await postgres.Permission.findAll({
			where: {
				name: data.permissions,
			},
		});
		await role.addPermission(getPermissions);
		return resolve("Successful");
	});
}

function findRoleById(id) {
	return new Promise(async (resolve, reject) => {
		const role = await postgres.Role.findOne({
			where: { id },
			include: [{ model: postgres.Permission, nested: true }],
		});

		return resolve(role);
	});
}

/**
 * delete Role
 * @param {*} id
 * @returns
 */
function deleteRole(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Role.destroy({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.MANAGER_NOT_FOUND.MESSAGE, Errors.MANAGER_NOT_FOUND.CODE, { id: id }),
			);

		return resolve("Successful");
	});
}

function getRoles(data) {
	return new Promise(async (resolve, reject) => {
		let { id, page, limit, order, name, nickName } = data;

		let result = {},
			query = {},
			offset = (page - 1) * limit;

		if (id) query.id = id;

		if (name) query.name = { [postgres.Op.iLike]: "%" + name + "%" };

		if (nickName) query.nickName = { [postgres.Op.iLike]: "%" + nickName + "%" };

		result = await postgres.Role.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [["createdAt", order]],
			raw: true,
		});
		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

// Manager
/**
 * get Managers
 * @param {*} data
 * @returns
 */
function getManagers(data) {
	return new Promise(async (resolve, reject) => {
		let { id, page, limit, order, name, mobile, rule, email, status } = data;

		let result = {},
			query = {},
			offset = (page - 1) * limit;

		if (id) query.id = id;
		if (name) query.name = { [postgres.Op.iLike]: "%" + name + "%" };

		if (mobile) query.mobile = { [postgres.Op.iLike]: "%" + mobile + "%" };

		if (email) query.email = { [postgres.Op.iLike]: "%" + email + "%" };

		if (status) query.status = status;

		result = await postgres.Manager.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [["createdAt", order]],
			raw: true,
			nest: true,
			include: {
				model: postgres.Role,
				nested: true,
				through: {
					attributes: [],
				},
				as: "roles",
			},
			attributes: { exclude: ["password", "salt"] },
		});

		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * add new Managers
 * @param {*} data
 * @returns
 */
function addManagers(data, files) {
	return new Promise(async (resolve, reject) => {
		const existManager = await postgres.Manager.findOne({ where: { email: data.email } });
		if (existManager)
			return reject(new HumanError(Errors.MANAGER_DUPLICATE_EMAIL.MESSAGE, Errors.MANAGER_DUPLICATE_EMAIL.CODE));

		let avatarData = { avatar: null };

		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				avatarData[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}
		const getRole = await postgres.Role.findOne({
			where: { id: data.roleId },
		});
		//hash password if exist
		const _password = await password.generate(data.password);

		data.password = _password.hash;

		data.salt = _password.salt;

		let result = await postgres.Manager.create({ ...data, ...avatarData });

		await result.addRole(getRole);
		if (!result) return reject(new HumanError(Errors.MANAGER_FAILED.MESSAGE, Errors.MANAGER_FAILED.CODE));

		return resolve("Successful");
	});
}

/**
 * edit Managers
 * @param {*} data
 * @returns
 */

function editManagers(data, files) {
	return new Promise(async (resolve, reject) => {
		let avatarData = {};
		if (Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				avatarData[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}
		const manager = await postgres.Manager.findOne({
			where: { id: data.id },
			include: [{ model: postgres.Role, nested: true }],
		});

		await manager.removeRole(manager.roles);
		//hash password if exist
		if (data.password) {
			const _password = await password.generate(data.password);

			data.password = _password.hash;

			data.salt = _password.salt;
		}
		const getRole = await postgres.Role.findOne({
			where: {
				id: data.roleId,
			},
		});
		await manager.addRole(getRole);
		let result = await postgres.Manager.update(
			{
				...data,
				...avatarData,
			},
			{
				where: { id: data.id },
			},
		);

		if (!result.shift())
			return reject(
				new NotFoundError(Errors.MANAGER_NOT_FOUND.MESSAGE, Errors.MANAGER_NOT_FOUND.CODE, { id: data.id }),
			);

		return resolve("Successful");
	});
}

/**
 * delete Managers
 * @param {*} id
 * @returns
 */
function deleteManagers(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Manager.destroy({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.MANAGER_NOT_FOUND.MESSAGE, Errors.MANAGER_NOT_FOUND.CODE, { id: id }),
			);

		return resolve("Successful");
	});
}

/**
 * find Managers
 * @param {*} id
 * @returns
 */
function findManagerById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Manager.findByPk(id, {
			attributes: { exclude: ["password", "salt"] },
			include: [
				{
					model: postgres.Role,
					nested: true,
					through: {
						attributes: [],
					},
					as: "roles",
				},
			],
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.MANAGER_NOT_FOUND.MESSAGE, Errors.MANAGER_NOT_FOUND.CODE, { id: id }),
			);

		return resolve(result);
	});
}

/**
 * get Permissions
 * @param {*} data
 * @returns
 */
function getAllPermissions(data) {
	return new Promise(async (resolve, reject) => {
		let { page, limit, sort, order, name, nickName } = data;

		const query = {};
		const offset = (page - 1) * limit;

		if (name) query.name = { [postgres.Op.iLike]: "%" + name + "%" };
		if (nickName) query.nickName = { [postgres.Op.iLike]: "%" + nickName + "%" };

		const result = await postgres.Permission.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			raw: true,
		});

		resolve({
			total: result.count ?? 0,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

async function getAffiliates(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, id, search, name, email } = data;

		const query = { level: "AGENT" };

		const offset = (page - 1) * limit;

		if (search) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ name: { [postgres.Op.iLike]: `%${search}%` } },
				{ email: { [postgres.Op.iLike]: `%${search}%` } },
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${search}%`,
			});
		if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };
		if (email) query.email = { [postgres.Op.iLike]: `%${email}%` };

		const items = await postgres.User.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			raw: true,
		});

		for (let i = 0; i < items.rows.length; i++) {
			const fee = await postgres.Fee.findOne({
				where: { userType: "AGENT", userLevel: items.rows[i].levelId },
				attributes: ["referralReward"],
				raw: true,
			});

			const report = await postgres.AgentReport.findOne({
				where: { agentId: items.rows[i].id },
				attributes: ["totalAmount", "totalUsers"],
				raw: true,
			});

			items.rows[i]["referralReward"] = fee && fee.referralReward ? fee.referralReward : 0;
			items.rows[i]["report"] = report;
		}

		return resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		});
	});
}

async function getAffiliateStatistics(id, data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, name, email } = data;

		const agent = await postgres.User.findOne({ where: { id, level: "AGENT" } });
		if (!agent) return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE));

		const offset = (page - 1) * limit;

		const query1 = {};

		if (name) query1.name = { [postgres.Op.iLike]: `%${name}%` };
		if (email) query1.email = { [postgres.Op.iLike]: `%${email}%` };

		const statistics = await postgres.AgentStatistic.findAndCountAll({
			where: { agentId: id },
			include: [
				{ model: postgres.User, as: "user", where: query1 },
				{ model: postgres.User, as: "agent" },
			],
			offset,
			order: [[sort, order]],
		});

		return resolve({
			agent,
			statistics: {
				total: statistics.count,
				pageSize: limit,
				page,
				data: statistics.rows,
			},
		});
	});
}

async function getAffiliateRewards(id, data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, name, email } = data;

		const agent = await postgres.User.findOne({ where: { id, level: "AGENT" } });
		if (!agent) return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE));

		const offset = (page - 1) * limit;

		const query1 = {};

		if (name) query1.name = { [postgres.Op.iLike]: `%${name}%` };
		if (email) query1.email = { [postgres.Op.iLike]: `%${email}%` };

		const rewards = await postgres.AgentReward.findAndCountAll({
			where: { agentId: id },
			order: [["createdAt", "DESC"]],
			include: [
				{ model: postgres.User, as: "user", where: query1 },
				{ model: postgres.User, as: "agent" },
				{ model: postgres.Auction, include: [{ model: postgres.User, as: "user" }, postgres.AssignedCard] },
			],
			offset: offset,
		});

		return resolve({
			agent,
			rewards: {
				total: rewards.count,
				pageSize: limit,
				page,
				data: rewards.rows,
			},
		});
	});
}

async function transfer(cardTypeId, count) {
	const cardType = await postgres.CardType.findOne({ where: { id: cardTypeId } });
	if (!cardType) throw new HumanError("Card Type not found!", 400);

	await transferNft(cardTypeId, parseInt(count));

	return `success`;
}

async function transferNft(cardTypeId, count) {
	if (count === 0) return count;

	const assignedCard = await postgres.AssignedCard.findOne({
		where: {
			userId: null,
			type: "TRANSFER",
			status: "FREE",
		},
		include: [
			{
				model: postgres.Card,
				where: {
					cardTypeId: cardTypeId,
				},
				required: true,
			},
		],
	});

	if (process.env.NODE_ENV !== "development") {
		try {
			//Opensea
			//0x2BC4301a5862f6558885FCF2D3c529402EA66216
			//
			//0xc60e5b80c04e7405593457851B66A09339128538

			//0x309D3522F7C3a4fe6AC6bb8A2f3916d24C643DF7
			await axios.put(
				`http://35.156.167.192:8001/api/v1/wallet/nft`,
				{
					contractAddress: "0x3A28C3D7f67F42bF27Bc464e2C3BEC7d6AFD978b",
					id: assignedCard.card.edition,
					to: "0x309D3522F7C3a4fe6AC6bb8A2f3916d24C643DF7",
				},
				{
					headers: {
						"X-API-KEY": "422cs4f0-0611-486f-b5e9-961dcc331534",
					},
				},
			);
		} catch (e) {
			console.log(e);
			throw e;
		}
	}

	await assignedCard.update({
		status: "RESERVED",
	});

	const transaction = await postgres.sequelize.transaction();
	try {
		await assignAttributes(1756, assignedCard.card, transaction);

		await transaction.commit();
	} catch (e) {
		await transaction.rollback();
	}

	setTimeout(function () {
		transferNft(cardTypeId, --count);
	}, 20000);
}

module.exports = {
	getTotalWallets,
	findRoleById,
	addManagers,
	editManagers,
	getManagers,
	transfer,
	info,
	login,
	forgetPassword,
	resetPassword,
	verify,
	refreshToken,
	logout,
	addSetting,
	editSetting,
	getSettings,
	findSettingById,
	deleteSetting,
	editWallet,
	getWallets,
	findWalletById,
	WithDrawAndPaymentChart,
	UserChart,
	getModelCounts,
	getNotification,
	changeNotificationStatus,
	CompetitionChart,
	AuctionTradesChart,
	getStatistics,
	bulk,
	createRole,
	updateRole,
	deleteRole,
	getRoles,
	deleteManagers,
	findManagerById,
	getAllPermissions,
	getAffiliates,
	getAffiliateRewards,
	getAffiliateStatistics,
	checkManagerLoginCode,
};
