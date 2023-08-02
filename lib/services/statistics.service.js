

const { postgres } = require("../databases");
const moment = require("moment");
const { events } = require("../data/constans");
const em = require("exact-math");
const { default: axios } = require("axios");
const { sliceWinners } = require("./competition.service");

const userLevel = [
	{ point: 5, bonus: 0.1 },
	{ point: 15, bonus: 0.15 },
	{ point: 30, bonus: 0.2 },
	{ point: 45, bonus: 0.25 },
	{ point: 60, bonus: 0.3 },
];

/**
 * check for current date stat is exist or not
 * @param {*} args
 */
exports.init = (args) => {
	return new Promise(async (resolve, reject) => {
		let currentDate = moment().format("YYYY-MM-DD");

		let model = await postgres.Statistic.findOne({
			where: postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
				"=",
				currentDate.toString(),
			),
		});

		if (model) return resolve(model);

		let totalUsers = await postgres.User.count();

		model = await postgres.Statistic.create({ totalUsers });

		resolve(model);
	});
};

/**
 * update new user and total user in stat table
 * @param {*} args
 * @param {*} model
 */
exports.updateNewUser = async (args, model) => {
	model.increment(["newUser", "totalUsers"]);

	// let { id } = args;
	// //user Statistics
	// let userStatistics = await postgres.UserStatistic.findOne({ where: { id } });

	// if (!userStatistics)
	// 	userStatistics = await postgres.UserStatistic.create({
	// 		userId: id,
	// 	});
};

/**
 * update IRR balance in stat table
 * @param {*} amount
 * @param {*} model
 */
exports.updateIrrBalance = async (amount, model) => {
	model.increment("irrBalance", { by: +amount });
};

/**
 * update user kyc number in stat
 * @param {*} args
 * @param {*} model
 */
exports.updateKyc = async (args, model) => {
	model.increment("kyc");
};

/**
 * update withdraw amount in stat table
 * @param {*} amount
 * @param {*} model
 */
exports.updateWithdraw = async (args, model) => {
	model.increment("withdraw", { by: +args?.amount });

	let { userId } = args;

	//user Statistics if not exist
	let userStatistics = await postgres.UserStatistic.findOne({ where: { userId } });
	if (!userStatistics)
		userStatistics = await postgres.UserStatistic.create({
			userId,
		});

	let assetIdUsdt = await postgres.Asset.findOne({
		where: {
			coin: "USDT",
		},
	});

	let assetIdUsd = await postgres.Asset.findOne({
		where: {
			coin: "USD",
		},
	});

	if (args.assetId == assetIdUsdt.dataValues.id) {
		await userStatistics.update({ withdrawusdt: postgres.sequelize.literal("withdrawusdt + " + args.amount) });
		//add to userActivity
		await postgres.UserActivity.create({
			userId,
			title: "user withdraw " + args.amount + " USDT",
			tag: "WITHDRAW",
		});
	}

	if (args.assetId == assetIdUsd.dataValues.id) {
		await userStatistics.update({ withdrawusd: postgres.sequelize.literal("withdrawusd + " + args.amount) });
		//add to userActivity
		await postgres.UserActivity.create({ userId, title: "user withdraw " + args.amount + " USD", tag: "WITHDRAW" });
	}
};

/**
 * update deposit in stat table
 * @param {*} amount
 * @param {*} model
 */
exports.updateDeposit = async (args, model) => {
	model.increment("deposit", { by: +args?.amount });

	let { userId } = args;

	//user Statistics if not exist
	let userStatistics = await postgres.UserStatistic.findOne({ where: { userId } });
	if (!userStatistics)
		userStatistics = await postgres.UserStatistic.create({
			userId,
		});

	let assetIdUsdt = await postgres.Asset.findOne({
		where: {
			coin: "USDT",
		},
	});

	let assetIdUsd = await postgres.Asset.findOne({
		where: {
			coin: "USD",
		},
	});

	if (args.assetId == assetIdUsdt.dataValues.id) {
		await userStatistics.update({ depositusdt: postgres.sequelize.literal("depositusdt + " + args.amount) });
		//add to userActivity
		await postgres.UserActivity.create({ userId, title: "user deposit " + args.amount + " USDT", tag: "DEPOSIT" });
	}

	if (args.assetId == assetIdUsd.dataValues.id) {
		await userStatistics.update({ depositusd: postgres.sequelize.literal("depositusd + " + args.amount) });
		//add to userActivity
		await postgres.UserActivity.create({ userId, title: "user deposit " + args.amount + " USD", tag: "DEPOSIT" });
	}
};

/**
 * update income in stat table
 * @param {*} amount
 * @param {*} model
 */
exports.updateIncome = async (args, model) => {
	let fee;

	if (args.type === "DEPOSIT") fee = args.depositFee;

	if (args.type === "WITHDRAW") fee = args.withdrawFee;

	model.increment("income", { by: +fee });
};

/**
 *
 * @param {*} args
 * @param {*} model
 */
exports.calculateUserXp = async (args, model, name) => {
	return new Promise(async (resolve, reject) => {
		if (name === events.deposit.add) deposit(args);

		if (name === events.auction.buy) {
			//userxp
			auction(args);

			//user statistics
			let { payerId, auctionId } = args;
			//user Statistics if not exist
			let userStatistics = await postgres.UserStatistic.findOne({ where: { userId: payerId } });
			if (!userStatistics)
				userStatistics = await postgres.UserStatistic.create({
					userId: payerId,
				});

			let cardIsCommon = await postgres.Auction.findOne({
				where: {
					id: auctionId,
				},
				include: [
					{
						model: postgres.AssignedCard,
						include: [
							{
								model: postgres.Card,
							},
						],
					},
				],
			});

			if (!cardIsCommon.dataValues.assignedCard.dataValues.card.dataValues.isCommon) {
				await userStatistics.update({
					cardsnotiscommon: postgres.sequelize.literal("cardsnotiscommon + 1"),
					cardscount: postgres.sequelize.literal("cardscount + 1"),
				});

				//add to userActivity
				await postgres.UserActivity.create({
					userId: payerId,
					title: "user give one card not common",
					tag: "GIVECARD",
				});
			} else {
				await userStatistics.update({ cardscount: postgres.sequelize.literal("cardscount + 1") });
				//add to userActivity
				await postgres.UserActivity.create({
					userId: payerId,
					title: "user give one card common",
					tag: "AUCTION",
				});
			}
		}

		resolve();
	});
};

/**
 * add count cards wizard
 * @param {*} args
 */
exports.wizardAddCardsCount = async (args, model, name) => {
	return new Promise(async (resolve, reject) => {
		//user statistics
		let { userId, cardId } = args;
		//user Statistics if not exist
		let userStatistics = await postgres.UserStatistic.findOne({ where: { userId } });
		if (!userStatistics)
			userStatistics = await postgres.UserStatistic.create({
				userId,
			});

		let cardIsCommon = await postgres.Card.findOne({
			where: {
				id: cardId,
			},
		});

		if (!cardIsCommon.dataValues.isCommon) {
			await userStatistics.update({
				cardsnotiscommon: postgres.sequelize.literal("cardsnotiscommon + 1"),
				cardscount: postgres.sequelize.literal("cardscount + 1"),
			});

			//add to userActivity
			await postgres.UserActivity.create({
				userId,
				title: "user give card not common in wizard ",
				tag: "WIZARD",
			});
		} else {
			await userStatistics.update({ cardscount: postgres.sequelize.literal("cardscount + 1") });

			//add to userActivity
			await postgres.UserActivity.create({ userId, title: "user give card common in wizard ", tag: "WIZARD" });
		}

		resolve();
	});
};

/**
 * add count cards referral
 * @param {*} args
 */
exports.referralAddCards = async (args, model, name) => {
	return new Promise(async (resolve, reject) => {
		//user statistics
		let { payerId } = args;
		//user Statistics if not exist
		let userStatistics = await postgres.UserStatistic.findOne({ where: { userId: payerId } });
		if (!userStatistics)
			userStatistics = await postgres.UserStatistic.create({
				userId: payerId,
			});
		await userStatistics.update({ referraledcardbuys: postgres.sequelize.literal("referraledcardbuys + 1") });

		//add to userActivity
		await postgres.UserActivity.create({
			userId: payerId,
			title: "user referraled buyes card ",
			tag: "REFERRALEDCARDBUYS",
		});

		resolve();
	});
};

/**
 * add count referral userStatistics
 * @param {*} args
 */
exports.referralAddCount = async (args, model, name) => {
	return new Promise(async (resolve, reject) => {
		//user statistics
		let { id } = args;
		//user Statistics if not exist
		let userStatistics = await postgres.UserStatistic.findOne({ where: { userId: id } });
		if (!userStatistics)
			userStatistics = await postgres.UserStatistic.create({
				userId: id,
			});
		await userStatistics.update({ referraled: postgres.sequelize.literal("referraled + 1") });

		//add to userActivity
		await postgres.UserActivity.create({
			userId: id,
			title: "new user registered from this user referral code",
			tag: "REFERRAL",
		});

		resolve();
	});
};

/**
 * calculate deposit xp
 * @param {*} args
 */
function deposit(args) {
	return new Promise(async (resolve, reject) => {
		let { userId } = args;

		let userXp = await postgres.UserXp.findOne({ where: { userId } });

		if (!userXp) userXp = await createUserXp(userId);

		let xp = em.div(args.amount, 100),
			newXp = em.add(xp, userXp.xp),
			newDeposit = em.add(args.amount, userXp.deposit);

		userLevel.sort((a, b) => b.point - a.point);

		let newLevel;
		for (const level of userLevel) {
			if (newXp >= level.point) {
				newLevel = level;
				break;
			}
		}

		await userXp.update({
			xp: newXp,
			deposit: newDeposit,
			...(newLevel ? { bonus: newLevel.bonus, level: newLevel.point } : {}),
		});

		resolve();
	});
}

/**
 *
 * @param {*} args
 */
function auction(args) {
	return new Promise(async (resolve, reject) => {
		let { payerId } = args;

		let userXp = await postgres.UserXp.findOne({ where: { userId: payerId } });

		if (!userXp) userXp = await createUserXp(payerId);

		let xp = em.div(args.amount, 100),
			newXp = em.add(xp, userXp.xp),
			newAuction = em.add(args.amount, userXp.auction);

		userLevel.sort((a, b) => b.point - a.point);

		let newLevel;
		for (const level of userLevel) {
			if (newXp >= level.point) {
				newLevel = level;
				break;
			}
		}

		await userXp.update({
			xp: newXp,
			auction: newAuction,
			...(newLevel ? { bonus: newLevel.bonus, level: newLevel.point } : {}),
		});

		resolve();
	});
}

/**
 *
 * @param {*} userId
 * @returns
 */
function createUserXp(userId) {
	return new Promise(async (resolve, reject) => {
		let xp = await postgres.UserXp.create({ userId }, { returning: true });

		return resolve(xp);
	});
}

//maintenance
exports.checkSystemStatus = async () => {
	const systemStatus = await postgres.Settings.findAll({
		where: {
			type: "MAINTENANCE",
		},
		attributes: {
			exclude: ["createdAt", "updatedAt", "deletedAt"],
		},
	});
	return systemStatus;
	/*return new Promise(async (resolve, reject) => {
        const systemStatus = await postgres.Settings.findOne({ where: { type: "SYSTEM", key: "status" }, raw: true });
        let status = false;
        if (systemStatus) status = systemStatus.value === "true" ? true : false;

            return resolve(status);
    });*/
};

exports.checkSystemHealth = async (req, res) => {
	// System Status
	const systemStatus = await postgres.Settings.findOne({ where: { type: "SYSTEM", key: "status" }, raw: true });
	if (systemStatus) {
		if (systemStatus.value === "false") {
			return res.status(400).json({ message: "System Status Failed" });
		}
	}

	// Database Connection
	try {
		await postgres.sequelize.authenticate();
	} catch (error) {
		return res.status(400).json({ message: "Database connection Failed" });
	}

	// Response Time
	const currentTime = new Date().getTime();
	await postgres.User.findOne();
	const passedTime = new Date().getTime();

	const diffInSeconds = (passedTime - currentTime) / 1000;

	if (diffInSeconds > 60) {
		return res.status(400).json({ message: "Database Response Time Failed" });
	}

	// Main Domain Response Check
	const url = process.env.NODE_ENV === "development" ? "https://dev.stylike.io/" : "https://stylike.io/";
	const axiosResponse = await axios.get(url);
	if (axiosResponse.status !== 200) {
		return res.status(400).json({ message: "Main Domain Failed" });
	}

	return res.status(200).json({ message: "OK" });
};

exports.getAppVersion = () => {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.Settings.findAll({
			where: { type: "APP_DETAIL" },
			raw: true,
		});

		return resolve(result);
	});
};

exports.calculator = async (data) => {
	const { cardTypeId, rankPosition, lensSettingId, days } = data;
	let { cameraLevel } = data;

	cameraLevel = cameraLevel * days;

	const camera = await postgres.CardType.findOne({
		where: { id: cardTypeId },
	});

	const positions = await postgres.Prize.findAll({
		where: { cardTypeId: camera.id },
	});

	const camera_level = await postgres.TokenPrize.findOne({
		where: { cardTypeId: camera.id },
	});

	if (lensSettingId && lensSettingId.length > 0) {
		const lens = await postgres.LensSetting.findAll({
			where: { id: { [postgres.Op.in]: lensSettingId } },
		});

		for (let j = 0; j < lens.length; j++)
			for (let i = 0; i < days; i++) {
				if (i > lens[j].allowedUsageNumber) break;
				cameraLevel += parseFloat(lens[j].amount);
			}
	}

	let main_position;
	for (const position of positions) {
		if (sliceWinners(position.tier, rankPosition)) {
			main_position = position;
			break;
		}
	}

	return {
		rank_position_prize: parseFloat(main_position.amount) * days,
		camera_level_prize: parseFloat(camera_level.amount) * days + parseFloat(cameraLevel),
	};
};
