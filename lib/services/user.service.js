const { postgres, redis } = require("./../databases");
const { jwt, sms, mail, otpGenerator, password, request } = require("./../utils");
const phone = require("phone");
const requestIp = require("@supercharge/request-ip");
const uuid = require("uuid");
const { NotFoundError, HumanError, InvalidRequestError, ConflictError } = require("../services/errorhandler");
const Errors = require("./errorhandler/MessageText");
const bonusService = require("./bonus.service");
const hooks = require("../hooks");
const { events } = require("../data/constans");
const { sendPushToToken } = require("./notification.service");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const moment = require("moment");
const { assignAttributes } = require("./auction.service");
const { giveUserFreePlan } = require("./Ai/aiPlan.service");

async function findUserByMobile(mobile, checkExchange = false) {
	let res = await postgres.User.findOne({ where: { mobile }, raw: true });

	if (!res && checkExchange) res = await postgres.User.findOne({ where: { mobile }, raw: true });

	return res;
}

async function findUserByEmail(email, checkExchange = false) {
	let res = await postgres.User.findOne({ where: { email }, paranoid: false, raw: true });

	if (!res && checkExchange) res = await postgres.User.findOne({ where: { email }, paranoid: false, raw: true });

	return res;
}

async function info(id) {
	return await postgres.User.findOne({
		where: { id },
		attributes: { exclude: ["password", "salt"] },
	});
}

async function detect(req) {
	const ip = requestIp.getClientIp(req);
	return await request.get("http://ip-api.com/json/" + ip);
}

async function signUp(name, mobile, email, _password, referredCode, req, countryId, link) {
	const currentCountry = await postgres.Country.findByPk(countryId);
	if (!currentCountry) {
		throw new NotFoundError(Errors.COUNTRY_NOT_FOUND.MESSAGE, 400);
	}

	if (referredCode) {
		const referredUser = await postgres.User.findOne({ where: { referralCode: referredCode } });

		if (!referredUser) throw new HumanError("There is no user with current referred code.", 400);

		if (referredUser.level === "NORMAL") {
			const userCount = await postgres.User.count({ where: { referredCode } });

			if (userCount >= referredUser.referralCodeCount && process.env.NODE_ENV !== "development") {
				throw new ConflictError(
					`This referral code already reaches it's maximum allowed usage number (${referredUser.referralCodeCount})`,
					400,
				);
			}
		}
	}
	const passwordHash = await password.generate(_password);
	const otpCode = otpGenerator.generate(4, {
		digits: true,
		alphabets: false,
		upperCase: false,
		specialChars: false,
	});

	email = email.toLowerCase();
	if (!/@gmail.com\s*$/.test(email)) {
		throw new HumanError("Just Gmail extension emails supported", 400);
	}

	const checkUser = await findUserByEmail(email);
	if (checkUser) throw new ConflictError("The entered email address is already registered in the system", 400);
	const otpToken = jwt.generate({ type: "signupEmail", userId: email }, null, 600);
	await redis.client.set(
		`_user_signupEmail_${email}`,
		JSON.stringify({
			name,
			countryId,
			email,
			mobile,
			otpCode,
			password: passwordHash.hash,
			salt: passwordHash.salt,
			referredCode,
			attempts: 0,
			link,
		}),
		"EX",
		600,
	);

	await mail(email, otpCode);

	return {
		otpCode: process.env.NODE_ENV === "development" ? otpCode : "",
		exp: 600,
		token: otpToken,
	};
}

async function updateCred(mobile, email, userId, req) {
	const otpCode = otpGenerator.generate(4, {
		digits: true,
		alphabets: false,
		upperCase: false,
		specialChars: false,
	});
	email = email.toLowerCase();

	const checkUser = await findUserByEmail(email);
	if (checkUser) throw new ConflictError("The entered email address is already registered in the system", 400);

	const otpToken = jwt.generate({ type: "addEmail", userId: email }, null, 600);
	await redis.client.set(
		`_user_addEmail_${email}`,
		JSON.stringify({
			userId,
			email,
			otpCode,
		}),
		"EX",
		600,
	);
	await mail(email, otpCode);

	return {
		exp: 600,
		token: otpToken,
	};
}

async function assignGhostCard(user) {
	let data = {
		isGhostModeEnabledNow: false,
		isGhostModeActive: false,
		isGhostModeLostNow: false,
		ghostExpiryDate: null,
	};

	const GhostType = await postgres.CardType.findOne({
		where: { price: "0" },
	});

	if (GhostType) {
		const userCards = await postgres.AssignedCard.findAll({
			where: {
				userId: user.id,
			},
			paranoid: false,
		});

		if (userCards.length === 0) {
			//user has no card
			const freeGhostCard = await postgres.Card.findOne({
				where: { cardTypeId: GhostType.id },
			});
			if (freeGhostCard) {
				const transaction = await postgres.sequelize.transaction();

				try {
					await new postgres.AssignedCard({
						userId: user.id,
						type: "SOLD",
						usedCount: 0,
						status: "FREE",
						cardId: freeGhostCard.id,
					}).save({ transaction });

					await assignAttributes(user.id, freeGhostCard, transaction);

					await transaction.commit();
					data.isGhostModeEnabledNow = true;
				} catch (e) {
					await transaction.rollback();
					throw e;
				}
			}
		}

		const userGhostCards = await postgres.AssignedCard.findOne({
			where: {
				userId: user.id,
			},
			include: [
				{
					model: postgres.Card,
					where: {
						cardTypeId: GhostType.id,
					},
					required: true,
				},
			],
		});

		if (userGhostCards) {
			const userNormalCards = await postgres.AssignedCard.findAll({
				where: {
					userId: user.id,
				},
				include: [
					{
						model: postgres.Card,
						where: {
							cardTypeId: { [postgres.Op.ne]: GhostType.id },
						},
						required: true,
					},
				],
			});

			let ghostExpiryDate = moment(userGhostCards.createdAt, "YYYY-MM-DD").add(7, "days");
			data.ghostExpiryDate = ghostExpiryDate.unix();

			if (ghostExpiryDate.isBefore() || userNormalCards.length > 0) {
				await userGhostCards.destroy({});
				data.isGhostModeLostNow = true;
			} else {
				data.isGhostModeActive = true;
			}
		}
	}
	return data;
}

async function login(mobile, email, _password) {
	let user = await postgres.User.findOne({ where: { email: email.toLowerCase() } });

	if (!user) {
		throw new HumanError("Email or Password is incorrect", 400);
	}

	const checkPassword = await password.validate(_password, user.salt, user.password);
	if (!checkPassword) {
		throw new HumanError("Email or Password is incorrect", 400);
	}

	if (user.status === "BLOCK") throw new HumanError("You are not allowed to enter", 400);

	if (user.status === "INACTIVE") throw new HumanError("Your account is Inactive", 400);

	const _token = new jwt.Token(user.id, "user");

	const refreshToken = _token.generateRefresh();
	const accessToken = _token.generateAccess();

	await postgres.UserSession.destroy({ where: { userId: user.id } });

	await postgres.UserSession.build({
		userId: user.id,
		accessToken,
		refreshToken,
		accessExpiresAt: _token.accessExpiresAt,
		refreshExpiresAt: _token.refreshExpiresAt,
	}).save();

	// let GhostMode = await assignGhostCard(user);

	return {
		refreshToken: {
			token: refreshToken,
			expiresAt: _token.refreshExpiresAt,
		},
		accessToken: {
			token: accessToken,
			expiresAt: _token.accessExpiresAt,
		},
		// GhostMode: GhostMode
	};
}

async function editProfile({ id, name, files, countryId }) {
	return new Promise(async (resolve, reject) => {
		let avatar = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				avatar[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		let result = await postgres.User.update(
			{
				...(name ? { name } : {}),
				...(countryId ? { countryId } : {}),
				...avatar,
			},
			{
				where: { id },
			},
		);

		if (!result.shift())
			return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { id: id }));

		return resolve("Successful");
	});
}

async function forgetPassword(email, mobile, req) {
	if (mobile) {
		const _mobile = phone("+" + mobile)?.[0];
		if (!_mobile)
			throw new HumanError(Errors.MOBILE_FORMAT.MESSAGE, Errors.MOBILE_FORMAT.CODE, {
				mobile,
			});
		const user = await findUserByMobile(_mobile);
		if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { mobile });

		const otpToken = jwt.generate({ type: "forgetPassMobile", userId: user.id }, null, 600);
		await redis.client.set(
			`_user_forgetPassMobile_${user.id}`,
			JSON.stringify({ mobile: _mobile, attempts: 0 }),
			"EX",
			600,
		);

		const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

		await postgres.Sms.create({ mobile, email, userProfile: user, req: req.body, header: req.rawHeaders, ip });
		await sms.send(_mobile);

		return {
			exp: 600,
			token: otpToken,
		};
	} else if (email) {
		email = email.toLowerCase();
		const user = await findUserByEmail(email);
		if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { email });

		const otpCode = otpGenerator.generate(4, {
			digits: true,
			alphabets: false,
			upperCase: false,
			specialChars: false,
		});

		const otpToken = jwt.generate({ type: "forgetPassEmail", userId: user.id }, null, 600);
		await redis.client.set(
			`_user_forgetPassEmail_${user.id}`,
			JSON.stringify({ email, otpCode, attempts: 0 }),
			"EX",
			600,
		);

		await mail(email, otpCode);

		return {
			exp: 600,
			token: otpToken,
		};
	} else throw new InvalidRequestError(Errors.USER_FORGOT_PASSWORD.MESSAGE, Errors.USER_FORGOT_PASSWORD.CODE);
}

async function resetPassword(token, newPassword) {
	const payload = jwt.verify(token);

	if (!payload)
		throw new NotFoundError(Errors.USER_NOT_FOUND_TOKEN.MESSAGE, Errors.USER_NOT_FOUND_TOKEN.CODE, { token });

	let form = await redis.client.get(`_user_resetPassword_${payload.userId}`);

	if (!form)
		throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { user: payload.userId });

	const _password = await password.generate(newPassword);
	let user = await postgres.User.update(
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

	await postgres.UserSession.destroy({ where: { userId: user.id } });

	return true;
}

async function changePassword(oldPassword, newPassword, userId) {
	let user = await postgres.User.findOne({ where: { id: userId }, raw: true });

	if (!user) throw new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { id: userId });

	const checkPassword = await password.validate(oldPassword, user.salt, user.password);
	if (!checkPassword)
		throw new HumanError(Errors.USER_PASSWORD_INCORRECT.MESSAGE, Errors.USER_PASSWORD_INCORRECT.CODE);

	const _password = await password.generate(newPassword);

	let userUpdate = await postgres.User.update(
		{
			password: _password.hash,
			salt: _password.salt,
		},
		{ where: { id: userId }, returning: true },
	);
	userUpdate = userUpdate?.[1]?.[0];
	if (!userUpdate)
		throw new HumanError(Errors.USER_PASSWORD_UPDATE.MESSAGE, Errors.USER_PASSWORD_UPDATE.CODE, {
			id: userId,
		});

	// await postgres.UserSession.destroy({ where: { userId: userId } });

	return true;
}

async function verify(req, token, code, pushToken, io) {
	let payload = jwt.verify(token);

	if (!payload) throw new NotFoundError("The token sent is incorrect", 400);

	let form;
	if (code) {
		form = await redis.client.get(`_user_${payload.type}_${payload.userId}`);
		form = JSON.parse(form);
		if (!form || +form.attempts > 3) {
			await redis.client.del(`_user_${payload.type}_${payload.userId}`);
			throw new NotFoundError("There is no user with the details entered in the system", 400);
		}
	}

	let check = false;

	switch (payload.type) {
		case "signupMobile":
		case "addMobile":
		case "forgetPassMobile": {
			const smsCheck = await sms.check(form.mobile, code);
			if (smsCheck) check = true;
			break;
		}
		case "signupEmail":
		case "addEmail":
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
		await redis.client.set(`_user_${payload.type}_${payload.userId}`, JSON.stringify(form), "EX", 600);
		throw new InvalidRequestError(Errors.USER_TOKEN_VERIFY.MESSAGE, Errors.USER_TOKEN_VERIFY.CODE);
	}

	await redis.client.del(`_user_${payload.type}_${payload.userId}`);

	if (["addMobile", "addEmail"].indexOf(payload.type) !== -1) {
		if (form.mobile) await postgres.User.update({ mobile: form.mobile }, { where: { id: form.userId } });
		else if (form.email) await postgres.User.update({ email: form.email }, { where: { id: form.userId } });

		return "Successful";
	}

	if (["signupMobile", "signupEmail"].indexOf(payload.type) !== -1) {
		let referralCode = uuid.v4()?.split("-")?.shift(),
			referredCode = form.referredCode;

		let referredUser;
		// check referral Code is exist
		if (referredCode) {
			referredUser = await postgres.User.findOne({
				where: { referralCode: referredCode },
			});

			if (!referredUser) referredCode = null;
		}

		const buildObject = {
			name: form.name,
			countryId: form.countryId,
			salt: form.salt,
			password: form.password,
			referralCode,
			referredCode,
		};
		if (form.mobile) buildObject.mobile = form.mobile;
		if (form.email) buildObject.email = form.email.toLowerCase();
		const newUser = await postgres.User.build(buildObject).save();
		// ser referral statistic
		if (referredUser) {
			if (referredUser.level === "AGENT") {
				await postgres.AgentStatistic.create({ agentId: referredUser.id, userId: newUser.id });

				const existReport = await postgres.AgentReport.findOne({ where: { agentId: referredUser.id } });
				if (!existReport) await postgres.AgentReport.create({ agentId: referredUser.id, totalUsers: 1 });

				if (form.link) {
					const agentLink = await postgres.AgentLink.findOne({
						where: { code: form.link, agentId: referredUser.id },
					});
					if (agentLink) {
						await postgres.AgentLinkStatistic.create({
							agentLinkId: agentLink.id,
							userId: newUser.id,
						});

						await agentLink.increment("completedCount", { by: 1 });
					}
				}
			} else {
				// const userCount = await postgres.User.count({ where: { referredCode: referredUser.referralCode } });
				// if (userCount < 5 && process.env.NODE_ENV !== "development") {
				let statistic = await postgres.ReferralStatistic.findOne({ where: { userId: referredUser.id } });
				if (!statistic) statistic = await postgres.ReferralStatistic.create({ userId: referredUser.id });
				statistic.increment("userCount", { by: 1 });
				// }
			}
			const asset = await postgres.Asset.findOne({
				where: {
					coin: "STL",
				},
			});

			await postgres.ReferralReward.create({
				userId: referredUser.id,
				referredUserId: newUser.id,
				assetId: asset.id,
				amount: 0,
				type: "REFERRAL",
			});
		}

		hooks.trigger(events.users.add, "after", newUser);

		// create wallet for new user
		let assets = await postgres.Asset.findAll({
			where: {
				isActive: true,
				coin: { [postgres.Op.in]: ["BUSD", "STL", "STYL"] },
			},
		});

		for (const asset of assets) {
			let defaultAmount = 0;

			const setting = await postgres.Settings.findOne({
				where: {
					type: "wallet",
					key: "WALLET-" + asset.coin,
				},
			});
			if (setting) defaultAmount = parseFloat(setting.value);

			await postgres.UserWallet.create({
				assetId: asset.id,
				userId: newUser.id,
				amount: defaultAmount,
			});
		}

		// send notification to admin
		let title = `User ${newUser.email ?? newUser.mobile} is registered in the stylike.`;
		let notif = await postgres.ManagerNotification.create({ title, userId: newUser.id, tag: "Register" });
		if (io) {
			io.to(`Manager`).emit("notification", JSON.stringify(notif));
		}

		payload.userId = newUser.id;

		await giveUserFreePlan(newUser.id);
	}

	if (["forgetPassMobile", "forgetPassEmail"].indexOf(payload.type) !== -1) {
		const resetPasswordToken = jwt.generate({ type: "resetPassword", userId: payload.userId }, null, 600);
		await redis.client.set(`_user_resetPassword_${payload.userId}`, 1, "EX", 600);
		return {
			exp: 600,
			token: resetPasswordToken,
		};
	} else {
		const _token = new jwt.Token(payload.userId, "user");

		const refreshToken = _token.generateRefresh();

		const accessToken = _token.generateAccess();

		await postgres.UserSession.build({
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
		};
	}
}

/**
 * logout user and delete current active session
 * @param {*} session
 * @returns
 */
async function logout(session) {
	let res = await postgres.UserSession.destroy({ where: { id: session.id } });

	return !!res;
}

/**
 * create new token for user
 * @param {*} session
 * @param {*} user
 * @returns
 */
async function refreshToken(session, user) {
	const _token = new jwt.Token(user.id, "user");

	const refreshToken = _token.generateRefresh();

	const accessToken = _token.generateAccess();

	await postgres.UserSession.update(
		{
			accessToken,
			refreshToken,
			accessExpiresAt: _token.accessExpiresAt,
			refreshExpiresAt: _token.refreshExpiresAt,
		},
		{
			where: { id: session.id },
		},
	);

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

async function referral(user) {
	//get count of registered user by this referral code
	let friendsInvited = await postgres.User.count({ where: { referredCode: user.referralCode } });

	let fee = 3 + " %";

	if (user.level === "AGENT") {
		const feeLevel = postgres.Fee.findOne({
			where: { id: user.levelId },
		});

		fee = feeLevel ? parseFloat(feeLevel.referralReward) * 100 + " %" : "0 %";
	}

	return {
		code: user.referralCode,
		friendsInvited: friendsInvited,
		prize: fee,
	};
}

async function referralHistory({ page, limit, order }, user) {
	let offset = (page - 1) * limit;

	if (!user) throw new NotFoundError("user not found", 400);

	let result = await postgres.ReferralReward.findAll({
		where: {
			userId: user.id,
		},
		attributes: [
			[
				postgres.sequelize.fn("SUM", postgres.sequelize.cast(postgres.sequelize.col("amount"), "decimal")),
				"totalCommission",
			],
			"referredUserId",
		],
		include: [
			{ model: postgres.User, as: "referredUser", attributes: ["name", "avatar", "email"] },
			{ model: postgres.Asset, attributes: ["coin"] },
		],
		group: ["referralReward.referredUserId", "referredUser.id", "referralReward.assetId", "asset.id"],
	});

	return result;
}

/**
 * get list user referral commission
 * @param {*} object {page, limit, order}
 * @param {*} id
 * @returns
 */
function referralCommission({ page, limit, order }, id) {
	return new Promise(async (resolve, reject) => {
		// find user
		let user = await postgres.User.findByPk(id);

		if (!user) return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { id }));

		let offset = (page - 1) * limit;

		let result = await postgres.ReferralStatistic.findAndCountAll({
			where: { userId: user.id },
			limit,
			offset,
			order: [["createdAt", order]],
			attributes: ["referredUserId", "orderId", "amount", "feePercent", "createdAt"],
		});

		resolve({
			total: result?.count,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

///////////////////////////////// User CRUD /////////////////////////////////////////////////
/**
 * get users data by manager
 * @param {*} data
 * @returns
 */
async function getUsers(data) {
	let {
		id,
		page,
		limit,
		order,
		name,
		mobile,
		email,
		isVerified,
		status,
		level,
		referralCode,
		referredCode,
		sort,
		searchQuery,
		country,
		createdAt,
	} = data;

	let result = {},
		query = {},
		offset = (page - 1) * limit;

	if (searchQuery)
		query = {
			[postgres.Op.or]: {
				name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				email: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				mobile: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
			},
		};

	if (id) query.id = id;

	if (name) query.name = { [postgres.Op.iLike]: "%" + name + "%" };

	if (mobile) query.mobile = { [postgres.Op.iLike]: "%" + mobile + "%" };

	if (email) query.email = { [postgres.Op.iLike]: "%" + email + "%" };

	if (status) query.status = status;

	if (level) query.level = { [postgres.Op.in]: level };

	if (referralCode) query.referralCode = { [postgres.Op.iLike]: "%" + referralCode + "%" };

	if (referredCode) query.referredCode = { [postgres.Op.iLike]: "%" + referredCode + "%" };

	if (country) query["$country.countryName$"] = { [postgres.Op.iLike]: "%" + country + "%" };

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (typeof isVerified === "boolean") query.isVerified = isVerified;

	result = await postgres.User.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		raw: true,
		attributes: { exclude: ["password", "salt"] },
		include: postgres.Country,
		nest: true,
	});

	for (let i = 0; i < result.rows.length; i++) {
		if (result.rows[i].level === "AGENT") {
			result.rows[i]["feeData"] = await postgres.Fee.findOne({
				where: { userLevel: result.rows[i].levelId, userType: "AGENT" },
			});
		}
	}

	return {
		total: result.count ?? 0,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get users data by manager
 * @param {*} data
 * @returns
 */
function getUsersSelector(data) {
	return new Promise(async (resolve, reject) => {
		let { page, limit, order, searchQuery } = data;
		let query = {};
		if (searchQuery) {
			query = {
				[postgres.Op.or]: {
					name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					email: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					mobile: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};
		} else {
			query = {};
		}
		let result = {},
			offset = (page - 1) * limit;

		result = await postgres.User.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [["createdAt", order]],
			raw: true,
			attributes: { exclude: ["password", "salt"] },
			include: postgres.Country,
			nest: true,
		});

		for (let i = 0; i < result.rows.length; i++) {
			if (result.rows[i].level === "AGENT") {
				result.rows[i]["feeData"] = await postgres.Fee.findOne({
					where: { userLevel: result.rows[i].levelId, userType: "AGENT" },
				});
			}
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
 * add new user by manager
 * @param {*} data
 * @param files
 * @returns
 */
function addUsers(data, files) {
	return new Promise(async (resolve, reject) => {
		if (!data.mobile && !data.email) {
			return reject(
				new HumanError(Errors.MOBILE_AND_EMAIL_ARE_EMPTY.MESSAGE, Errors.MOBILE_AND_EMAIL_ARE_EMPTY.CODE),
			);
		} else if (data.mobile && data.mobile.length > 0) {
			const userWithSameMobile = await postgres.User.findOne({ where: { mobile: data.mobile } });
			if (userWithSameMobile) {
				return reject(
					new HumanError(Errors.MOBILE_CONFLICT.MESSAGE, Errors.MOBILE_CONFLICT.CODE, {
						mobile: data.mobile,
					}),
				);
			}
		} else if (data.email) {
			const userWithSameEmail = await postgres.User.findOne({ where: { email: data.email } });
			if (userWithSameEmail) {
				return reject(
					new HumanError(Errors.EMAIL_CONFLICT.MESSAGE, Errors.EMAIL_CONFLICT.CODE, { email: data.email }),
				);
			}
		}

		let avatar = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				avatar[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		// hash password if exist
		const _password = await password.generate(data.password);

		data.password = _password.hash;

		data.salt = _password.salt;

		let referralCode = uuid.v4()?.split("-")?.shift();

		let result = await postgres.User.create({
			...data,
			...avatar,
			referralCode,
		});

		if (!result) return reject(new HumanError(Errors.USER_CREATE.MESSAGE, Errors.USER_CREATE.CODE));

		// create wallet for new user
		let assets = await postgres.Asset.findAll({
				where: {
					isActive: true,
					coin: { [postgres.Op.in]: ["BUSD", "STL", "STYL"] },
				},
			}),
			userWallet;

		for (const asset of assets) {
			if (asset.coin === "VLX")
				userWallet = await postgres.UserWallet.create({ assetId: asset.id, userId: result.id });
			else await postgres.UserWallet.create({ assetId: asset.id, userId: result.id });
		}

		// apply register bonus
		await bonusService.givingUserBonus(result, userWallet);

		if (data.level === "AGENT") {
			const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" }, raw: true });

			// Find max fee level id
			const lastFeeTemp = await postgres.Fee.findAll({
				// where: { userType: "AGENT" },
				limit: 1,
				order: [["userLevel", "DESC"]],
			});
			const lastFee = lastFeeTemp[0];

			let lastId = 1;
			if (lastFee) lastId += lastFee.userLevel;

			// Create new fee (referral reward = fee)
			const newFee = await postgres.Fee.create({
				userLevel: lastId,
				userType: "AGENT",
				referralReward: data.fee,
				assetId: bnbAsset.id,
			});

			// Update new User with fee level id
			result.update({ levelId: newFee.userLevel });

			const existReport = await postgres.AgentReport.findOne({ where: { agentId: result.id } });
			if (!existReport) await postgres.AgentReport.create({ agentId: result.id });
		}

		return resolve("Successful");
	});
}

/**
 * edit user data by manager
 * @param {*} data
 * @param files
 * @returns
 */
function editUsers(data, files) {
	return new Promise(async (resolve, reject) => {
		let avatar = {};

		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();

				avatar[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		//hash password if exist
		if (data.password) {
			const _password = await password.generate(data.password);

			data.password = _password.hash;

			data.salt = _password.salt;
		}

		const user = await postgres.User.findOne({ where: { id: data.id } });
		if (data.isVerified === true) {
			await postgres.UserNotification.create({
				userId: data.id,
				title: "Your account has been successfully accepted",
				flash: false,
				status: false,
			});
		}
		let result = await postgres.User.update(
			{
				...data,
				...avatar,
			},
			{
				where: { id: data.id },
			},
		);

		if (!result.shift())
			return reject(
				new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { id: data.id }),
			);

		if (user.isVerified === false && data.isVerified === true) {
			const bonusTerm = await postgres.BonusTerm.findOne({
				where: { firstMembers: { [postgres.Op.not]: null } },
			});

			const verifiedMembersCount = await postgres.User.count({ where: { isVerified: true } });

			if (+bonusTerm.firstMembers > +verifiedMembersCount) {
				await apply({ id: bonusTerm.id, userId: user.id });

				await postgres.ManagerPushNotification.create({
					userId: user?.id,
					type: "TRANSACTION",
					content: `User ${
						user?.name ? (user?.email ? user?.email : user?.mobile) : null
					}  Successfully got a bonus`,
				});

				await postgres.UserNotification.create({
					userId: user.id,
					title: "Deposit bonus is completed",
					flash: false,
					status: false,
				});
			}
		}

		if (data.level === "AGENT" && data.fee) {
			const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" }, raw: true });

			if (!user.levelId) {
				// Find max fee level id
				const lastFeeTemp = await postgres.Fee.findAll({
					// where: { userType: "AGENT" },
					limit: 1,
					order: [["userLevel", "DESC"]],
				});
				const lastFee = lastFeeTemp[0];

				let levelId = 1;
				if (lastFee) levelId += +lastFee.userLevel;

				const newFee = await postgres.Fee.create(
					{
						userLevel: levelId,
						userType: "AGENT",
						referralReward: data.fee,
						assetId: bnbAsset.id,
					},
					{ returning: true },
				);

				await user.update({ levelId: newFee.userLevel });
			} else {
				const existFee = await postgres.Fee.findOne({
					where: {
						userType: "AGENT",
						userLevel: user.levelId,
					},
				});

				if (existFee) {
					await existFee.update({ referralReward: data.fee, assetId: bnbAsset.id });
				} else {
					await postgres.Fee.create({
						userLevel: user.levelId,
						userType: "AGENT",
						referralReward: data.fee,
						assetId: bnbAsset.id,
					});
				}
			}
		}

		if (data.level === "USER") {
			const existFee = await postgres.Fee.findOne({
				userType: "NORMAL",
				userLevel: user.levelId,
			});

			if (existFee) {
				await existFee.destroy();
			}
		}

		return resolve("Successful");
	});
}

/**
 * delete user by manager
 * @param {*} id
 * @returns
 */
function deleteUsers(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.User.destroy({ where: { id } });

		if (!result)
			return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * find user by manager
 * @param {*} id
 * @returns
 */
function findUserById(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.User.findByPk(id, {
			attributes: { exclude: ["password", "salt"] },
			include: postgres.Country,
			nest: true,
		});

		if (!result)
			return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE, { id }));

		if (result.level === "AGENT") {
			result["feeData"] = await postgres.Fee.findOne({
				where: { userLevel: result.levelId, userType: "AGENT" },
			});
		}

		return resolve(result);
	});
}

/**
 * get users activity data by manager
 * @param {*} data
 * @returns
 */
function getUserActivity(data) {
	return new Promise(async (resolve, reject) => {
		let {
			id,
			page,
			limit,
			order,
			sort,
			searchQuery,
			createdAt,
			userId,
			sortOtherField,
			orderOtherField,
			name,
			tag,
		} = data;

		let result = {},
			query = {},
			query2 = {},
			offset = (page - 1) * limit;
		let order2;

		if (searchQuery)
			query = {
				[postgres.Op.or]: {
					name: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					email: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
					mobile: { [postgres.Op.iLike]: "%" + searchQuery + "%" },
				},
			};

		if (id) query.id = id;
		if (tag) query.tag = tag;
		if (userId) query.userId = userId;
		if (name) query2.name = { [postgres.Op.iLike]: "%" + name + "%" };

		if (createdAt)
			query.createdAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				createdAt,
			);

		if (sortOtherField && orderOtherField) {
			order2 = [[{ model: postgres.User }, sortOtherField, orderOtherField]];
		} else {
			order2 = [[sort ?? "createdAt", order]];
		}

		result = await postgres.UserActivity.findAndCountAll({
			where: query,
			limit,
			offset,
			order: order2,
			attributes: { exclude: ["password", "salt"] },
			include: [{ model: postgres.User }],
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
 * add user wallet address
 * @param {*} userEntity
 * @param {*} address
 * @param {*} token
 * @returns
 */
function addAddress(userEntity, address, token) {
	return new Promise(async (resolve, reject) => {
		try {
			// const { address, body } = await Web3Token.verify(token);

			// if (address !== userAddress)
			// 	return reject(new NotFoundError(Errors.USER_NOT_FOUND_TOKEN.MESSAGE, Errors.USER_NOT_FOUND_TOKEN.CODE));

			await userEntity.update({ address });

			return resolve("Successful");
		} catch (error) {
			return reject(error);
		}
	});
}

async function getPrizeCompetition(cardTypeId) {
	return await postgres.Prize.findAll({
		where: { cardTypeId: cardTypeId },
		include: [
			{
				model: postgres.Asset,
				attributes: {
					exclude: ["createdAt", "updatedAt", "deletedAt", "canDeposit", "canWithdraw", "isActive", "hasTag"],
				},
			},
		],
		attributes: {
			exclude: ["createdAt", "updatedAt", "deletedAt"],
		},
	});
}

function inviteLinkHandler(res, code) {
	return new Promise(async (resolve, reject) => {
		try {
			const agentLink = await postgres.AgentLink.findOne({
				where: { code },
				include: { model: postgres.User, as: "agent" },
			});

			if (!agentLink) {
				return reject(
					new NotFoundError(
						Errors.MANAGER_LINK_NOT_CODE_FOUND.MESSAGE,
						Errors.MANAGER_LINK_NOT_CODE_FOUND.CODE,
						{ code },
					),
				);
			}

			await postgres.AgentLinkStatistic.create({ agentLinkId: agentLink.id });
			let redirectUrl =
				process.env.NODE_ENV === "development" ? "https://dev.stylike.io/" : "https://stylike.io/";

			if (agentLink.type === "REGISTER") {
				await agentLink.increment("clickCount", { by: 1 });
				redirectUrl += `auth/register?ref=${agentLink.agent.referralCode}&link=${code}`;
			}

			return res.redirect(redirectUrl);
		} catch (error) {
			return reject(error);
		}
	});
}

function testNotif(userId, io) {
	return new Promise(async (resolve, reject) => {
		try {
			const user = await postgres.User.findOne({ where: { id: userId } });

			try {
				if (process.env.NODE_ENV === "development")
					sendPushToToken(user, {}, { title: "Notification test", body: "Hello World!" });
			} catch (e) {
				console.log(e);
			}
			/*
                                    const sampleNotifSignle = await postgres.UserNotification.findOne({where: {userId}, raw: true});
                                    const sampleNotifAll = await postgres.UserNotification.findAll({where: {userId}, limit: 5, raw: true});
                                    const sampleWalletSingle = await postgres.UserWallet.findOne({where: {userId}, raw: true});
                                    const sampleWalletAll = await postgres.UserWallet.findAll({where: {userId}, raw: true});

                                    io.to(`UserId:${userId}`).emit("notification", JSON.stringify(sampleNotifSignle));
                                    io.to(`UserId:${userId}`).emit("notification", JSON.stringify(sampleNotifAll));
                                    io.to(`UserId:${userId}`).emit("wallet", JSON.stringify(sampleWalletSingle));
                                    io.to(`UserId:${userId}`).emit("wallet", JSON.stringify(sampleWalletAll));

                        */

			return resolve(true);
		} catch (error) {
			return reject(error);
		}
	});
}

function deleteAccount(_password, userId) {
	return new Promise(async (resolve, reject) => {
		const user = await postgres.User.findOne({ where: { id: userId, status: "ACTIVE" } });

		if (!user) return reject(new NotFoundError(Errors.USER_NOT_FOUND.MESSAGE, Errors.USER_NOT_FOUND.CODE));

		const checkPassword = await password.validate(_password, user.salt, user.password);
		if (!checkPassword) return reject(new HumanError(Errors.WRONG_PASSOWORD.MESSAGE, Errors.WRONG_PASSOWORD.CODE));

		const result = await user.destroy();

		if (!result)
			return reject(new NotFoundError(Errors.DELETE_ACCOUNT_FAILED.MESSAGE, Errors.DELETE_ACCOUNT_FAILED.CODE));
		await postgres.UserSession.destroy({ where: { userId } });

		return resolve("Successful");
	});
}

async function getAttributes(userId) {
	// const user = await postgres.User.findOne({ where: {id: userId}});
	const attributes = await postgres.UserAttribute.findAll({
		where: {
			userId: userId,
			type: "INITIAL",
		},
		attributes: { exclude: ["updatedAt", "deletedAt"] },
		include: [
			{
				model: postgres.Attribute,
				attributes: { exclude: ["updatedAt", "deletedAt"] },
			},
			{
				model: postgres.Card,
				attributes: ["id", "name", "cardTypeId"],
				include: [
					{
						model: postgres.CardType,
						attributes: ["id", "name"],
					},
				],
			},
		],
	});
	return attributes;
}

async function editAttribute(attributeId, amount, text) {
	const userAttribute = await postgres.UserAttribute.findOne({
		where: {
			id: attributeId,
			type: "INITIAL",
		},
		include: [
			{
				model: postgres.Attribute,
				required: true,
			},
		],
	});
	if (!userAttribute) throw new HumanError("you cant edit this attribute", 400);

	const user = await postgres.User.findOne({
		where: {
			id: userAttribute.userId,
		},
	});

	if (userAttribute.attribute.name === "DAMAGE") {
		await postgres.UserNotification.create({
			title: "Damage",
			description: text,
			userId: user.id,
		});

		sendPushToToken(
			user,
			{},
			{
				title: "Damage",
				body: text,
			},
		);
	}

	await postgres.UserAttribute.update(
		{
			amount: amount,
		},
		{
			where: { id: attributeId },
		},
	);

	return "success";
}

async function getCompetition(userId) {
	const competitions = await postgres.MatchParticipantTeam.findAll({
		where: {
			userId: userId,
		},
		attributes: { exclude: ["updatedAt", "deletedAt"] },
		include: [
			{
				model: postgres.CompetitionLeague,
				attributes: { exclude: ["updatedAt", "deletedAt"] },
				include: [
					{
						model: postgres.Competition,
						attributes: { exclude: ["updatedAt", "deletedAt"] },
						include: {
							model: postgres.UserPrize,
							attributes: [
								["tier", "rank"],
								["amount", "reward"],
							],
						},
					},
					{
						model: postgres.CompetitionTask,
						attributes: { exclude: ["updatedAt", "deletedAt"] },
					},
				],
			},
		],
	});

	return competitions;
}

async function getUserReferrals(userId) {
	const user = await postgres.User.findOne({
		where: {
			id: userId,
		},
		attributes: ["email", "referredCode"],
	});

	const result = [
		{
			id: userId,
			email: user.email,
		},
	];

	const count = await postgres.AssignedCard.count({
		where: {
			userId,
		},
		include: [
			{
				model: postgres.Card,
				include: [
					{
						model: postgres.CardType,
						where: {
							name: { [postgres.Op.ne]: "Ghost" },
						},
						required: true,
					},
				],
			},
		],
	});

	let nonProfit = count === 0 ? true : false;

	result[0].nonProfit = nonProfit;

	let refUser = user.referredCode;
	while (refUser) {
		refUser = await postgres.User.findOne({
			where: {
				referralCode: refUser,
			},
			attributes: ["id", "email", "referredCode"],
			raw: true,
		});

		const count = await postgres.AssignedCard.count({
			where: {
				userId: refUser.id,
			},
			include: [
				{
					model: postgres.Card,
					include: [
						{
							model: postgres.CardType,
							where: {
								name: { [postgres.Op.ne]: "Ghost" },
							},
							required: true,
						},
					],
				},
			],
		});

		if (count === 0) {
			nonProfit = true;
		}

		if (refUser) {
			result.push({
				id: refUser.id,
				email: refUser.email,
				nonProfit,
			});

			if (refUser.referredCode) {
				refUser = refUser.referredCode;
			} else {
				break;
			}
		}
	}

	return result;
}

async function getUserDamageHistory(userId, data) {
	const { page, limit, fromDate, toDate } = data;

	const offset = (page - 1) * limit;

	const query = {};

	query.userId = userId;
	query.type = "FEE";

	if (fromDate && toDate) {
		query.createdAt = { [postgres.Op.gte]: fromDate, [postgres.Op.lte]: toDate };
	} else {
		if (fromDate) query.createdAt = { [postgres.Op.gte]: fromDate };
		if (toDate) query.createdAt = { [postgres.Op.lte]: toDate };
	}

	const result = await postgres.UserAttribute.findAndCountAll({
		where: query,
		attributes: ["createdAt", "amount", "type", "description"],
		include: [
			{
				model: postgres.Attribute,
				where: {
					name: "DAMAGE",
				},
				attributes: [],
			},
			{
				model: postgres.Card,
				attributes: ["name"],
				include: [
					{
						model: postgres.CardType,
						attributes: ["name"],
					},
				],
			},
		],
		offset,
		limit,
		order: [["createdAt", "DESC"]],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

module.exports = {
	info,
	detect,
	signUp,
	updateCred,
	login,
	editProfile,
	forgetPassword,
	resetPassword,
	changePassword,
	verify,
	logout,
	referral,
	referralHistory,
	referralCommission,
	refreshToken,
	getCompetition,
	getUsers,
	getUsersSelector,
	addUsers,
	editUsers,
	deleteUsers,
	findUserById,
	addAddress,
	assignGhostCard,
	getUserActivity,
	getAttributes,
	getPrizeCompetition,
	inviteLinkHandler,
	testNotif,
	deleteAccount,
	editAttribute,
	getUserDamageHistory,
	getUserReferrals,
};
