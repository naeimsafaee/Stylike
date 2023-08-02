const { postgres } = require("../databases");
const { NotFoundError, HumanError, ConflictError } = require("./errorhandler/index");
const Errors = require("./errorhandler/MessageText");
const { getPagingData } = require("../utils/pagination");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const { sendPushToToken } = require("./notification.service");
const { UserAttribute } = require("../endpoints/validations/user.validation");
const em = require("exact-math");
const _ = require("lodash");
const { where } = require("sequelize");
const { updateMatchParticipant } = require("./matchParticipant.service");

/**
 * get Competition list
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @returns
 */
async function getCompetitions(data) {
	const { status, page, limit, order, sort, type, title, id, createdAt, startAt, endAt } = data;
	let query = {};
	if (status) query.status = { [postgres.Op.in]: status };
	if (type)
		query.type = postgres.Competition.sequelize.where(
			postgres.Competition.sequelize.cast(postgres.Competition.sequelize.col("type"), "varchar"),
			{ [postgres.Op.iLike]: "%" + type + "%" },
		);
	if (title) query.title = { [postgres.Op.iLike]: "%" + title + "%" };
	if (id) query.id = id;
	if (createdAt) query.createdAt = createdAt;
	if (startAt) query.startAt = startAt;
	if (endAt) query.endAt = endAt;

	let result = await postgres.Competition.findAndCountAll({
		where: query,
		limit: limit,
		offset: (page - 1) * limit,
		order: [[sort, order]],
		nest: true,
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get one Competition
 * @returns
 * @param id
 */
function getCompetition(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Competition.findOne({ where: { id } });

		if (!result)
			return reject(
				new NotFoundError(Errors.COMPETITION_NOT_FOUND.MESSAGE, Errors.COMPETITION_NOT_FOUND.CODE, {
					id,
				}),
			);

		return resolve(result);
	});
}

async function getCompetitionLeagues(data) {
	const {
		competitionId,
		cardTypeId,
		prizeId,
		page,
		limit,
		order,
		sort,
		id,
		entranceFee,
		minimumCard,
		createdAt,
		searchQuery,
		assetId,
		title,
		asset,
	} = data;
	let query = {};

	const ghostType = await postgres.CardType.findOne({ where: { name: "Ghost" } });
	if (!ghostType) throw new HumanError("ghostType does not exists");

	if (title) query.title = { [postgres.Op.iLike]: `%${title}%` };
	if (competitionId) query.competitionId = competitionId;

	if (cardTypeId) query.cardTypeId = { [postgres.Op.in]: cardTypeId };
	else query.cardTypeId = { [postgres.Op.ne]: ghostType.id };

	if (prizeId) query.prizeId = prizeId;
	if (id) query.id = id;
	if (entranceFee) query.entranceFee = entranceFee;
	if (createdAt) query.createdAt = createdAt;
	if (assetId) query.assetId = assetId;

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (asset) {
		query[postgres.Op.or] = [{ "$asset.name$": { [postgres.Op.iLike]: `%${asset}%` } }];
	}

	if (searchQuery) {
		query = {
			[postgres.Op.or]: [
				{ "$competition.title$": { [postgres.Op.like]: "%" + searchQuery + "%" } },
				{ "$cardType.title$": { [postgres.Op.like]: "%" + searchQuery + "%" } },
				//	{ "$cardTier.title$": { [postgres.Op.like]: "%" + searchQuery + "%" } },
				{
					entranceFee: postgres.CompetitionLeague.sequelize.where(
						postgres.CompetitionLeague.sequelize.cast(
							postgres.CompetitionLeague.sequelize.col("entranceFee"),
							"varchar",
						),
						{ [postgres.Op.iLike]: "%" + searchQuery + "%" },
					),
				},
			],
		};
	}
	let result = await postgres.CompetitionLeague.findAndCountAll({
		where: query,
		limit: limit,
		offset: (page - 1) * limit,
		order: [[sort, order]],
		nest: true,
		include: [
			{
				model: postgres.Competition,
			},
			{
				model: postgres.CardType,
			},
			{
				model: postgres.Prize,
			},
			{
				model: postgres.Asset,
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

async function countCompetitionParticipant(data) {
	const { competitionId } = data;
	let array = [];
	let cardTypes = await postgres.CardType.findAll();

	for (let i = 0; i < cardTypes.length; i++) {
		let x = 0;

		let leagues = await postgres.CompetitionLeague.findAll({
			where: {
				competitionId: competitionId,
				cardTypeId: cardTypes[i].id,
			},
		});

		for (let j = 0; j < leagues.length; j++) {
			x += parseInt(
				await postgres.MatchParticipantTeam.count({
					where: {
						competitionLeagueId: leagues[j].id,
					},
					distinct: true,
					col: "userId",
				}),
			);
		}

		array.push({
			cardTypeId: cardTypes[i].id,
			cardTypeName: cardTypes[i].name + " competition",
			cardTypeImage: cardTypes[i].image,
			participant: x,
		});
	}

	return array;
}

async function competitionRank(data) {
	const { competitionId, cardTypeId, userName } = data;
	let query = {};

	if (competitionId) query.competitionId = competitionId;
	if (cardTypeId) query.cardTypeId = cardTypeId;

	if (userName) {
		query[postgres.Op.or] = [
			{ "$user.name$": { [postgres.Op.iLike]: `%${userName}%` } },
			{ "$user.email$": { [postgres.Op.iLike]: `%${userName}%` } },
		];
	}

	let array = [];

	const prizes = await postgres.UserPrize.findAll({
		where: query,
		include: [
			{
				model: postgres.User,
				attributes: ["name", "email", "avatar", "id"],
			},
		],
		order: [["tier", "ASC"]],
	});

	for (let i = 0; i < prizes.length; i++) {
		let match = await postgres.MatchParticipantTeam.findOne({
			where: {
				competitionId: prizes[i].competitionId,
				userId: prizes[i].userId,
			},
		});

		array.push({
			user: prizes[i].user,
			rank: prizes[i].tier,
			score: parseInt(match.score),
		});
	}

	return array;
}

async function getUserCompetitionImage(data) {
	const { competitionId, userId, cardId } = data;
	const matchParticipantTeam = await postgres.MatchParticipantTeam.findOne({
		where: {
			userId: userId,
			competitionId: competitionId,
			cardId: cardId,
		},
	});

	if (!matchParticipantTeam) throw new HumanError("this user has not uploaded any images for this task yet", 400);

	const result = await postgres.MatchParticipant.findAll({
		where: {
			participantTeamId: matchParticipantTeam.id,
		},
		include: [
			{
				model: postgres.CompetitionTask,
				attributes: ["title", "description"],
			},
		],
	});

	return result;
}

async function getCompetitionLeague(id) {
	let result = await postgres.CompetitionLeague.findOne({
		where: { id },
		include: [
			{ model: postgres.Competition },
			{ model: postgres.CardType },
			{ model: postgres.Prize },
			{ model: postgres.Asset },
		],
	});

	if (!result)
		throw new NotFoundError(Errors.COMPETITION_LEAGUE_NOT_FOUND.MESSAGE, Errors.COMPETITION_LEAGUE_NOT_FOUND.CODE, {
			id,
		});

	return result;
}

/**
 * get user Competition list
 * @param {*} userId
 * @param {*} CompetitionId
 * @param {*} cardTypeId
 * @param {*} cardTierId
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @returns
 */
// function getUserCompetition(userId, CompetitionId, cardTypeId, cardTierId, page, limit, order) {
// 	return new Promise(async (resolve, reject) => {
// 		let query = {};
// 		if (CompetitionId) query.CompetitionId = CompetitionId;
// 		if (userId) query.userId = userId;
// 		if (cardTypeId) query.cardTypeId = cardTypeId;
// 		if (cardTierId) query.cardTierId = cardTierId;
// 		let result = await postgres.UserCompetition.findAndCountAll({
// 			where: query,
// 			limit: limit,
// 			offset: (page - 1) * limit,
// 			order: [["createdAt", order]],
// 		});

// 		resolve({
// 			total: result.count,
// 			pageSize: limit,
// 			page,
// 			data: result.rows,
// 		});
// 	});
// }

/**
 * add Competition
 * @param {*} title
 * @param {*} startAt
 * @param {*} endAt
 * @param {*} status
 * @returns
 */
function addCompetition(title, type, startAt, endAt, status) {
	return new Promise(async (resolve, reject) => {
		// let image = {};
		// if (files && Object.keys(files).length) {
		// 	for (let key in files) {
		// 		let file = files[key].shift();
		// 		image[key] = [
		// 			{
		// 				name: file.newName,
		// 				key: file.key,
		// 				location: file.location,
		// 			},
		// 		];
		// 	}
		// }

		let result = await postgres.Competition.create({
			title,
			type,
			startAt,
			endAt,
			status,
		});

		if (!result) return reject(new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 * add competition league
 */
async function addCompetitionLeague(competitionId, cardTypeId, entranceFee, title, files, assetId) {
	let image = {};

	if (files && Object.keys(files).length) {
		for (let key in files) {
			let file = files[key].shift();

			image[key] = [
				{
					name: file.newName,
					key: file.key,
					location: file.location,
				},
			];
		}
	}

	let result = await postgres.CompetitionLeague.create({
		competitionId,
		cardTypeId,
		entranceFee,
		title,
		...image,
		assetId,
	});

	if (cardTypeId === 5) {
		const camera = await postgres.CardType.findOne({
			where: {
				name: "Ghost",
			},
		});
		if (!camera) throw new HumanError("there is no ghost camera", 400);

		await postgres.CompetitionLeague.create({
			competitionId,
			cardTypeId: camera.id,
			entranceFee,
			title: title.replace("Pictomera", "Ghost"),
			...image,
			assetId,
		});
	}
	return result;
}

async function editCompetition(id, title, status, io) {
	let update = {};

	if (title) update.title = title;
	if (status) update.status = status;

	const competition = await postgres.Competition.findOne({ where: { id: id } });
	if (!competition) throw new HumanError("An error occurred while updating!", 400);

	if (competition.status === "COMPLETED") throw new HumanError("This competition is closed!", 400);

	await postgres.Competition.update(update, { where: { id } });

	if (status && status === "COMPLETED" && competition) completeCompetitions(competition);

	return "Successful";
}

async function completeCompetitions(competition) {
	let transaction = await postgres.sequelize.transaction();

	try {
		const cardTypes = await postgres.CardType.findAll({ transaction });

		let agentReward = await postgres.Settings.findAll({
			where: {
				type: "AGENT_STL_REWARD",
			},
		});

		let userReward = await postgres.Settings.findAll({
			where: {
				type: "USER_STL_REWARD",
			},
		});

		agentReward = _.groupBy(agentReward, "key");
		userReward = _.groupBy(userReward, "key");

		let notifList = [];

		for (let o = 0; o < cardTypes.length; o++) {
			const cardTypeId = cardTypes[o].id;

			let leaderboards = await postgres.MatchParticipantTeam.findAll({
				where: {
					competitionId: competition.id,
				},
				order: [["score", "DESC"]],
				include: [
					{
						model: postgres.User,
						attributes: ["name", "avatar", "id", "referredCode"],
					},
					{
						model: postgres.Card,
						where: { cardTypeId: cardTypeId },
						required: true,
					},
					{
						model: postgres.CompetitionLeague,
						attributes: ["id"],
						include: [
							{
								model: postgres.CardType,
								attributes: ["name"],
							},
						],
					},
				],
				transaction,
			});

			let prizes = await postgres.Prize.findAll({
				where: { cardTypeId: cardTypeId },
				include: [
					{
						model: postgres.Asset,
						attributes: ["coin"],
					},
				],
				transaction,
			});

			for (let j = 0; j < leaderboards.length; j++) {
				const rank = j + 1;
				const user = leaderboards[j].user;
				const score = leaderboards[j].score;
				const cardId = leaderboards[j].cardId;
				const lenses = leaderboards[j].lenses;
				const leagueType = leaderboards[j].competitionLeague.cardType.name;

				if (!user) continue;

				//if user competition score greater than 7
				if (score >= 7) {
					await increaseLevelAttribute(0.03, user.id, cardId, cardTypeId, transaction);
				} else if (score < 5) {
					await increaseLevelAttribute(-0.05, user.id, cardId, cardTypeId, transaction);
				}

				// increase level attribute
				if (lenses && lenses.length > 0) {
					console.log("calculating lens", lenses);

					await calculateLenses(user.id, cardId, cardTypeId, lenses, transaction);
				}

				for (let k = 0; k < prizes.length; k++) {
					const prize = { ...prizes[k].dataValues };

					if (sliceWinners(prize.tier, rank)) {
						//found prize of this rank
						if (prize.asset.coin === "STL" && leagueType !== "Ghost" && user.referredCode) {
							const amount = prize.amount;

							let refCode = user.referredCode;
							for (let c = 1; c <= 8; c++) {
								const cycle = await reward(
									amount,
									refCode,
									user,
									prize.assetId,
									transaction,
									competition.id,
									c,
									userReward,
									agentReward,
									notifList,
									competition.title,
								);
								prize.amount = parseFloat(prize.amount) - cycle.amount;
								if (cycle.referredCode) {
									refCode = cycle.referredCode;
								} else break;
							}
						}

						prize.amount = parseFloat(prize.amount).toFixed(2);

						let systemWallet = await postgres.SystemWallet.findOne({
							where: { assetId: prize.assetId },
							transaction,
						});

						let userWallet = await postgres.UserWallet.findOne({
							where: { userId: user.id, assetId: prize.assetId },
							transaction,
						});

						if (!userWallet) {
							userWallet = await postgres.UserWallet.create(
								{
									where: { userId: user.id, assetId: prize.assetId },
								},
								{ transaction, returning: true },
							);
						}

						await systemWallet.decrement("amount", { by: +prize.amount, transaction });

						await userWallet.increment("amount", { by: +prize.amount, transaction });

						await postgres.UserPrize.create(
							{
								userId: user.id,
								tier: rank,
								cardTypeId: cardTypeId,
								competitionId: competition.id,
								assetId: prize.assetId,
								amount: prize.amount,
							},
							{
								transaction,
							},
						);
						const card = await postgres.Card.findOne({ where: { id: cardId } });
						const cardType = await postgres.CardType.findOne({ where: { id: cardTypeId } });

						notifList.push({
							userId: user.id,
							rank: rank,
							score: score,
							prize: prize.amount,
							competition_name: competition.title,
							card_name: card.name,
							cardType_name: cardType.name,
							type: "prize",
						});

						break;
					}
				}
			}
		}

		await transaction.commit();

		// send ranking notif to user
		if (notifList.length > 0) {
			for (const item of notifList) {
				// send notif to user
				let text;
				if (item.type === "prize") {
					text = `You ranked ${item.rank} with ${item.card_name} ${item.cardType_name} camera in ${item.competition_name} and earned ${item.prize} STL`;
				} else {
					text = `You earned ${item.reward} STL referral reward in ${item.competition_name}`;
				}
				await postgres.UserNotification.create({
					userId: item.userId,
					title: `Reward`,
					description: text,
				});

				const user = await postgres.User.findOne({ where: { id: item.userId } });

				sendPushToToken(
					user,
					{},
					{
						title: "Reward",
						body: text,
					},
				);
			}
		}
	} catch (e) {
		await transaction.rollback();
		throw e;
	}
}

async function reward(
	amount,
	referralCode,
	user,
	assetId,
	transaction,
	competitionId,
	cycle,
	userReward,
	agentReward,
	notifList,
	competitionName,
) {
	const refferUser = await postgres.User.findOne({
		where: {
			referralCode: referralCode,
		},
		transaction,
	});
	if (!refferUser)
		return {
			amount: 0,
		};

	const count = await postgres.AssignedCard.count({
		where: {
			userId: refferUser.id,
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
		return {
			amount: 0,
		};
	}

	if (cycle > 3 && refferUser.level === "NORMAL") {
		return {
			referredCode: refferUser.referredCode,
			amount: 0,
		};
	}

	let rewardObj = refferUser.level === "AGENT" ? agentReward : userReward;

	let amountTemp = (parseFloat(amount) * rewardObj[`cycle${cycle}`][0].value) / 100;
	amount = amountTemp.toFixed(2);

	let userWallet = await postgres.UserWallet.findOne({
		where: { userId: refferUser.id, assetId: assetId },
		transaction,
	});

	await userWallet.increment("amount", { by: +amount, transaction });

	let flag = false;
	for (let notif of notifList) {
		if (notif.userId === refferUser.id && notif.type === "reward") {
			flag = true;
			notif.reward = +notif.reward + +amount;
		}
	}

	if (!flag) {
		notifList.push({
			userId: refferUser.id,
			reward: amount,
			competition_name: competitionName,
			type: "reward",
		});
	}

	if (refferUser.level === "AGENT") {
		await postgres.AgentReward.create(
			{
				agentId: refferUser.id,
				userId: user.id,
				competitionId,
				commission: amount,
			},
			{ transaction },
		);
	} else {
		await postgres.ReferralReward.create(
			{
				userId: refferUser.id,
				referredUserId: user.id,
				assetId: assetId,
				amount: amount,
				type: "REFERRAL",
			},
			{ transaction },
		);
	}

	return { referredCode: refferUser.referredCode, amount: amountTemp };
}

async function calculateLenses(userId, cardId, cardTypeId, lenses, transaction) {
	const userAttribute = await postgres.UserAttribute.findOne({
		where: { userId, cardId, type: "INITIAL" },
		include: [
			{
				model: postgres.Attribute,
				where: { cardTypeId, name: "LEVEL", type: "INITIAL" },
				required: true,
			},
		],
	});

	if (!userAttribute) return -1;

	const userLenses = await postgres.UserLens.findAll({
		where: {
			lensId: { [postgres.Op.in]: lenses },
			userId: userId,
		},
		include: { model: postgres.Lens, include: postgres.LensSetting },
	});

	let incrementAmount = 0;

	for (let i = 0; i < userLenses.length; i++) {
		const lensSetting = userLenses[i].len.lensSetting;

		if (userLenses[i].usageNumber >= lensSetting.allowedUsageNumber) {
			await userLenses[i].destroy();
			continue;
		}

		incrementAmount += parseFloat(lensSetting.amount);

		/*await postgres.UserLens.increment("usageNumber", {
                        where: { id: userLenses[i].id },
                        by: 1,
                        transaction
                    });*/
	}

	if (incrementAmount > 0) await userAttribute.increment("amount", { by: incrementAmount, transaction });

	return incrementAmount;
}

async function increaseLevelAttribute(amount, userId, cardId, cardTypeId, transaction) {
	try {
		const userAttribute = await postgres.UserAttribute.findOne({
			where: { userId, cardId, type: "INITIAL" },
			include: [
				{
					model: postgres.Attribute,
					where: { cardTypeId, name: "LEVEL", type: "INITIAL" },
					required: true,
				},
			],
			transaction,
		});
		if (!userAttribute) return false;

		if (amount > 0) {
			const oldLevelAmountInteger = Math.floor(userAttribute.amount);
			const newLevelAmountInteger = Math.floor(userAttribute.amount + amount);
			if (newLevelAmountInteger > oldLevelAmountInteger) {
				//decrease heat damage
				await decreaseHeatDamage(userId, cardId, 2.5);
			}

			await userAttribute.increment("amount", { by: Math.abs(amount), transaction });
		} else if (amount < 0) {
			if (parseFloat(userAttribute.amount) - Math.abs(amount) < 0)
				await UserAttribute.update(
					{ amount: 0 },
					{
						where: { id: userAttribute.id },
						transaction,
					},
				);
			else await userAttribute.decrement("amount", { by: Math.abs(amount), transaction });
		}

		return true;
	} catch (error) {
		return false;
	}
}

async function decreaseHeatDamage(userId, cardId, coolDown) {
	const card = await postgres.Card.findOne({
		where: {
			id: cardId,
		},
	});

	const userAttribute = await postgres.UserAttribute.findOne({
		where: {
			userId: userId,
			cardId: cardId,
		},
		include: [
			{
				model: postgres.Attribute,
				where: {
					name: "DAMAGE",
					type: "INITIAL",
				},
				required: true,
			},
			{
				model: postgres.Card,
				required: true,
				include: [
					{
						model: postgres.CardType,
						required: true,
					},
				],
			},
		],
		order: [
			["amount", "DESC"],
			[postgres.Card, postgres.CardType, "price", "DESC"],
		],
	});

	if (userAttribute && card) {
		const amountToDecrease = (userAttribute.amount * parseFloat(coolDown)) / 100;

		const newDamageAmount = parseFloat(userAttribute.amount) - amountToDecrease;
		if (newDamageAmount < 0) await userAttribute.update({ amount: 0 });
		else await userAttribute.decrement("amount", { by: amountToDecrease });

		const card = await postgres.Card.findOne({
			where: {
				id: cardId,
			},
		});

		if (card) {
			await postgres.UserAttribute.create({
				userId: userId,
				cardId: userAttribute.cardId,
				attributeId: userAttribute.attributeId,
				type: "FEE",
				amount: -coolDown,
				description: `Your ${card.name} damage cool down by ${coolDown} STL for Level up`,
			});

			await postgres.UserNotification.create({
				userId: userId,
				title: `Damage CoolDown`,
				description: `Your ${card.name} damage cool down by ${coolDown} STL for Level up`,
			});
		}
	}
}

//slice Winners
function sliceWinners(tier, number) {
	let from, to;

	[from, to] = tier.split("-");

	if (parseInt(from) === parseInt(number)) return true;

	return parseInt(number) > parseInt(from) && parseInt(number) <= parseInt(to);
}

async function editCompetitionLeague(data, data_file) {
	const { id, competitionId, cardTypeId, prizeId, entranceFee, title, assetId, maximumNumber, description } = data;
	const { files } = data_file;

	let check = await postgres.MatchParticipantTeam.findAll({ where: { competitionLeagueId: id } });

	if (check.length > 0) throw new HumanError("The item is not editable!", 400);

	let update = {},
		image = {};

	if (files && Object.keys(files).length) {
		for (let key in files) {
			let file = files[key].shift();

			image[key] = [
				{
					name: file.newName,
					key: file.key,
					location: file.location,
				},
			];
		}
	}

	if (competitionId) update.competitionId = competitionId;
	if (cardTypeId) update.cardTypeId = cardTypeId;
	if (prizeId) update.prizeId = prizeId;
	if (entranceFee) update.entranceFee = entranceFee;
	if (title) update.title = title;
	if (description) update.description = description;
	if (assetId) update.assetId = assetId;
	if (maximumNumber) update.maximumNumber = maximumNumber;

	let result = await postgres.CompetitionLeague.update({ ...update, ...image }, { where: { id } });

	if (!result.shift()) throw new NotFoundError("An error occurred while updating!", 400);

	return "Successful";
}

/**
 * delete Competition
 * @param {*} id
 * @returns
 */
function delCompetition(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Competition.destroy({ where: { id, status: "INACTIVE" } });

		if (!result)
			return reject(new HumanError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id: id }));

		resolve("Successful");
	});
}

/**
 * delete competition league
 * @param {*} id
 * @returns
 */
function delCompetitionLeague(id) {
	return new Promise(async (resolve, reject) => {
		let check = await postgres.MatchParticipantTeam.findAll({ where: { competitionLeagueId: id } });

		if (check.length)
			return reject(new HumanError(Errors.NOT_EDITABLE.MESSAGE, Errors.NOT_EDITABLE.CODE, { id: id }));

		let result = await postgres.CompetitionLeague.destroy({ where: { id } });

		if (!result)
			return reject(new HumanError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id: id }));

		return resolve("Successful");
	});
}

async function listCompetition(page, limit) {
	let offset = (page - 1) * limit;
	let result = await postgres.Competition.findAndCountAll({
		limit,
		offset,
		where: {
			status: { [postgres.Op.not]: "INACTIVE" },
			type: "CHALLENGE",
		},
		include: [
			{
				model: postgres.CompetitionLeague,
			},
		],
		order: [["createdAt", "DESC"]],
		attributes: ["id", "title", "startAt", "endAt", "type", "status", "createdAt"],
	});
	return getPagingData(result, page, limit);
}

async function detailsCompetition(competitionId, cardTypeId, userId, assign_card_id) {
	// return new Promise(async (resolve, reject) => {

	let competition = await postgres.Competition.findOne({
		where: {
			status: { [postgres.Op.ne]: "INACTIVE" },
			id: competitionId,
			type: "CHALLENGE",
		},
		raw: true,
		attributes: ["id", "title", "startAt", "endAt", "status"],
	});

	if (!competition) throw new HumanError("Competition not found!", 400);

	const assignCard = await postgres.AssignedCard.findOne({
		where: {
			id: assign_card_id,
			userId: userId,
		},
	});

	if (!assignCard) throw new HumanError("you do not have required camera!", 400);

	let leagues = await postgres.CompetitionLeague.findAll({
		where: { competitionId: competitionId, cardTypeId },
		attributes: {
			exclude: ["createdAt", "updatedAt", "deletedAt", "competitionId"],
		},
		include: [
			{ model: postgres.CardType, attributes: ["id", "name", "image"] },
			{ model: postgres.Asset, attributes: ["id", "coin", "name", "icon"] },
		],
		raw: true,
		nest: true,
	});

	let types = [];
	for (const league of leagues) {
		let check = types.find(({ id }) => id === league.cardType.id);

		league["participants"] = await postgres.MatchParticipantTeam.count({
			where: { competitionLeagueId: league.id },
			distinct: true,
			col: "userId",
		});

		/*let team = await postgres.MatchParticipantTeam.findOne({
                        where: { competitionLeagueId: league.id, userId: userId }
                    });*/

		let competitionTasks = await postgres.CompetitionTask.findAll({
			where: { competitionLeagueId: league.id },
			raw: true,
			attributes: {
				exclude: ["deletedAt", "competitionLeagueId"],
			},
		});
		// check user card is exist in this league
		// league["isExist"] = team ? true : false;

		let tasks = [];
		for (const competitionTask of competitionTasks) {
			let task = await postgres.MatchParticipant.count({
				where: { competitionTaskId: competitionTask.id },
				include: [
					{
						model: postgres.MatchParticipantTeam,
						where: { userId: userId, cardId: assignCard.cardId },
						required: true,
					},
				],
			});

			// check user card is exist in this task
			competitionTask["isExist"] = task > 0;

			tasks.push(competitionTask);
		}
		league["tasks"] = tasks;

		if (!check) types.push({ ...league.cardType, leagues: [league] });
		else check.leagues.push(league);
	}

	competition["types"] = types;

	// get next competition id
	competition["next"] = await postgres.Competition.findOne({
		attributes: ["id"],
		limit: 1,
		order: [["startAt", "ASC"]],
		where: {
			id: { [postgres.Op.gt]: competition.id },
			startAt: { [postgres.Op.gte]: competition.startAt },
			status: { [postgres.Op.ne]: "INACTIVE" },
			type: "CHALLENGE",
		},
	});

	return competition;
}

async function addUserCompetition(files, userId, id, assign_card_id, taskId, lenses, io) {
	// return new Promise(async (resolve, reject) => {

	let image = {};
	const user = await postgres.User.findOne({ where: { id: userId } });

	if (files && Object.keys(files).length) {
		for (let key in files) {
			let file = files[key].shift();
			image[key] = [
				{
					name: file.newName,
					key: file.key,
					location: file.location,
				},
			];
		}
	}

	let transaction = await postgres.sequelize.transaction();

	try {
		// check league and competition is active
		let league = await postgres.CompetitionLeague.findOne({
			where: { id },
			include: [
				{
					model: postgres.Competition,
					where: { status: "OPEN", type: "CHALLENGE" },
					required: true,
				},
			],
			transaction,
		});

		if (!league) {
			throw new HumanError("league not found!", 400);
		}
		// check user have access to this competition
		let assignedCard = await postgres.AssignedCard.findOne({
			where: {
				id: assign_card_id,
				userId: userId,
				// status: "FREE"
			},
			include: [
				{
					model: postgres.Card,
					where: { status: "ACTIVE", cardTypeId: league.cardTypeId },
					required: true,
				},
			],
			transaction,
		});

		// check user has nft stake plan or not
		const userNftStake = await postgres.UserNftStake.findOne({
			where: { assignedCardId: assignedCard.id, paid: false },
		});

		if (userNftStake) throw new HumanError("You have stake plan with this nft", 400);

		const ghostType = await postgres.CardType.findOne({
			where: {
				name: "Ghost",
			},
		});

		if (league.cardTypeId !== ghostType.id) {
			let cardParticipatedBefore = await postgres.MatchParticipantTeam.findOne({
				where: {
					competitionId: league.competitionId,
					cardId: assignedCard.cardId,
					userId: { [postgres.Op.ne]: userId },
				},
				transaction,
			});

			if (cardParticipatedBefore) {
				throw new HumanError("This camera participated in this competition before!", 400);
			}
		}

		if (!assignedCard) {
			throw new HumanError("You don't have required camera to participate", 400);
		}

		let team = await postgres.MatchParticipantTeam.findOne({
			where: { userId: userId, competitionId: league.competitionId, cardId: assignedCard.cardId },
			transaction,
		});

		let isParticipateCompetition = !team;

		if (!team) {
			const userLenses = await postgres.UserLens.findAll({
				where: {
					userId: userId,
				},
				include: [
					{
						model: postgres.Lens,
						include: [
							{
								model: postgres.LensSetting,
							},
						],
					},
				],
				transaction: transaction,
			});

			let lenses = [];

			for (let i = 0; i < userLenses.length; i++) {
				const userLens = userLenses[i];

				if (userLens.usageNumber >= userLens.len.lensSetting.allowedUsageNumber) {
					await userLens.destroy({ transaction });
					continue;
				}

				await userLens.increment("usageNumber", { by: 1, transaction: transaction });

				lenses.push(userLens.lensId);
			}

			team = await postgres.MatchParticipantTeam.create(
				{
					userId: userId,
					competitionLeagueId: league.id,
					competitionId: league.competitionId,
					cardId: assignedCard.cardId,
					lenses: lenses,
				},
				{ transaction },
			);
		}

		let isExist = await postgres.MatchParticipant.findOne({
			where: { participantTeamId: team.id, competitionTaskId: taskId },
			transaction,
		});

		if (isExist) throw new HumanError("You uploaded an image for this task before.", 400);

		const damageAttribute = await postgres.UserAttribute.findOne({
			where: {
				userId: userId,
				cardId: assignedCard.cardId,
				type: "INITIAL",
			},
			include: [
				{
					model: postgres.Attribute,
					where: {
						name: "DAMAGE",
						type: "INITIAL",
					},
					required: true,
				},
			],
		});
		if (!damageAttribute) throw new HumanError("Your heat damage is on Ash mode,please cool it down", 400);

		const userDamageLimit = await postgres.UserBox.findOne({
			where: {
				userId,
			},
			attributes: [],
			include: [
				{
					model: postgres.Box,
					attributes: [[postgres.sequelize.fn("sum", postgres.sequelize.col("damageLimit")), "sum"]],
				},
			],
			raw: true,
		});

		const totalDamageLimit = parseFloat(userDamageLimit["box.sum"] ? userDamageLimit["box.sum"] : 0);

		const heatPercent = await postgres.Attribute.findOne({
			where: {
				name: "HEAT",
				type: "FEE",
				cardTypeId: assignedCard.card.cardTypeId,
				mode: { [postgres.Op.lte]: damageAttribute.amount < 0 ? 0 : damageAttribute.amount - totalDamageLimit },
			},
			order: [["mode", "DESC"]],
		});

		const damageAmount = heatPercent ? heatPercent.amount : 0;

		if (damageAmount >= 100) throw new HumanError("Your heat damage is on Ash mode,please cool it down", 400);

		if (isParticipateCompetition) {
			await assignedCard.increment("usedCount", { transaction });

			const batteryReduce = await reduceBatteryOrNegative(
				userId,
				assignedCard.cardId,
				league,
				"BATTERY",
				transaction,
				damageAmount,
			);
			if (!batteryReduce) throw new HumanError("battery is low!", 400);
		}

		const MatchParticipant = await postgres.MatchParticipant.create(
			{
				participantTeamId: team.id,
				competitionTaskId: taskId,
				competitionId: league.competitionId,
				...image,
			},
			{ transaction, returning: true },
		);

		const negativeReduce = await reduceBatteryOrNegative(
			userId,
			assignedCard.cardId,
			league,
			"NEGATIVE",
			transaction,
			damageAmount,
		);
		if (!negativeReduce) throw new HumanError("negative is low!", 400);

		if (league.cardTypeId === ghostType.id)
			updateMatchParticipant(MatchParticipant.id, Math.floor(Math.random() * 8) + 2, "OPEN", false, null);

		await transaction.commit();
	} catch (error) {
		await transaction?.rollback();

		throw error;
	}

	return { message: "Successful" };
	// });
}

async function reduceBatteryOrNegative(userId, cardId, league, name, transaction, damageAmount = 0) {
	let userAttribute = await postgres.UserAttribute.findOne({
		where: {
			userId,
			cardId,
			type: "INITIAL",
			amount: { [postgres.Op.gt]: 0 },
		},
		include: [
			{
				model: postgres.Attribute,
				where: {
					cardTypeId: league.cardTypeId,
					type: "INITIAL",
					name,
				},
				required: true,
			},
		],
	});

	if (!userAttribute) return false;

	let feeAttribute = await postgres.Attribute.findOne({
		where: {
			cardTypeId: league.cardTypeId,
			name,
			type: "FEE",
			status: "ACTIVE",
		},
	});

	if (!feeAttribute) return true;

	let extraAmount = 0;

	if (damageAmount > 0) {
		const extraAttribute = await postgres.Attribute.findOne({
			where: {
				name: name,
				type: "EXTRA",
				mode: { [postgres.Op.lte]: damageAmount },
			},
			order: [["mode", "DESC"]],
		});
		if (extraAttribute) extraAmount = parseInt(extraAttribute.amount);
	}

	const amount = parseInt(feeAttribute.amount) + extraAmount;

	if (+amount > +userAttribute.amount) return false;

	await userAttribute.decrement("amount", {
		by: amount /*userAttribute.attribute.amount*/,
		transaction,
	});

	await postgres.UserAttribute.create(
		{
			userId,
			cardId,
			attributeId: feeAttribute.id,
			type: "FEE",
			amount: amount,
			competitionLeagueId: league.id,
		},
		{ transaction },
	);

	return true;
}

async function editUserCompetition(files, userId, id, taskId, assignCardId) {
	let image = {};

	if (files && Object.keys(files).length) {
		for (let key in files) {
			let file = files[key].shift();
			image[key] = [
				{
					name: file.newName,
					key: file.key,
					location: file.location,
				},
			];
		}
	}

	try {
		let league = await postgres.CompetitionLeague.findOne({
			where: { id },
			include: [
				{
					model: postgres.Competition,
					where: { status: "OPEN", type: "CHALLENGE" },
					required: true,
				},
			],
		});

		if (!league) throw new HumanError("league not found!", 400);

		let team = await postgres.MatchParticipantTeam.findOne({
			where: {
				userId: userId,
				competitionId: league.competitionId,
			},
		});

		if (!team) throw new HumanError("you did not upload image.", 400);

		let participant = await postgres.MatchParticipant.findOne({
			where: { participantTeamId: team.id, competitionTaskId: taskId },
		});

		if (!participant) throw new HumanError("you did not participate", 400);

		if (participant.status !== "OPEN" || parseFloat(participant.score) !== 0)
			throw new HumanError("Your task is not open", 400);

		await participant.update({ ...image });

		let assignedCard = await postgres.AssignedCard.findOne({
			where: {
				id: assignCardId,
				userId: userId,
				status: "FREE",
			},
			include: [
				{
					model: postgres.Card,
					where: { status: "ACTIVE", cardTypeId: league.cardTypeId },
					required: true,
				},
			],
		});

		if (!assignedCard) {
			throw new HumanError("You don't have required camera to participate", 400);
		}

		const damageAttribute = await postgres.UserAttribute.findOne({
			where: {
				userId: userId,
				cardId: assignedCard.cardId,
				type: "INITIAL",
			},
			include: [
				{
					model: postgres.Attribute,
					where: {
						name: "DAMAGE",
						type: "INITIAL",
					},
					required: true,
				},
			],
		});
		if (!damageAttribute) throw new HumanError("Your heat damage is on Ash mode,please cool it down", 400);

		const userDamageLimit = await postgres.UserBox.findOne({
			where: {
				userId,
			},
			attributes: [],
			include: [
				{
					model: postgres.Box,
					attributes: [[postgres.sequelize.fn("sum", postgres.sequelize.col("damageLimit")), "sum"]],
				},
			],
			raw: true,
		});

		const totalDamageLimit = parseFloat(userDamageLimit["box.sum"] ? userDamageLimit["box.sum"] : 0);

		const heatPercent = await postgres.Attribute.findOne({
			where: {
				name: "HEAT",
				type: "FEE",
				cardTypeId: assignedCard.card.cardTypeId,
				mode: { [postgres.Op.lte]: damageAttribute.amount < 0 ? 0 : damageAttribute.amount - totalDamageLimit },
			},
			order: [["mode", "DESC"]],
		});

		const damageAmount = heatPercent ? heatPercent.amount : 0;

		if (damageAmount >= 100) throw new HumanError("Your heat damage is on Ash mode,please cool it down", 400);

		const negativeReduce = await reduceBatteryOrNegative(
			userId,
			assignedCard.cardId,
			league,
			"NEGATIVE",
			undefined,
			damageAmount,
		);
		if (!negativeReduce) throw new HumanError("negative is low!", 400);
	} catch (error) {
		throw error;
	}

	return "Successful";
}

async function getLeaderBoards(competitionId, cardTypeId, page, limit) {
	let competition = await postgres.Competition.findOne({
		where: {
			status: { [postgres.Op.notIn]: ["INACTIVE"] },
			id: competitionId,
			type: "CHALLENGE",
		},
		raw: true,
		attributes: ["id", "title", "startAt", "endAt", "status"],
	});

	if (!competition) return new HumanError("competition not found", 404);

	let result;

	if (cardTypeId) {
		result = await postgres.MatchParticipantTeam.findAndCountAll({
			attributes: ["userId", "competitionLeagueId", "score", "competitionId", "cardId"],
			where: { competitionId: competitionId },
			limit: limit,
			offset: (page - 1) * limit,
			order: [["score", "DESC"]],
			nest: true,
			include: [
				{
					model: postgres.User,
					attributes: ["name", "avatar"],
				},
				{
					model: postgres.Card,
					where: { cardTypeId: cardTypeId },
					required: true,
					attributes: ["id", "name", "cardTypeId"],
				},
			],
		});
	} else {
		result = await postgres.MatchParticipantTeam.findAndCountAll({
			attributes: ["userId", "competitionLeagueId", "score", "competitionId"],
			where: { competitionId: competitionId },
			limit: limit,
			offset: (page - 1) * limit,
			order: [["score", "DESC"]],
			nest: true,
			include: [{ model: postgres.User, attributes: ["name", "avatar"] }],
		});
	}

	return {
		total: result.count || 0,
		pageSize: limit,
		page,
		data: result.rows,
	};
	/*for (let i = 0; i < leagues.length; i++) {
              leagues[i]["leaderboard"] = await postgres.MatchParticipantTeam.findAll({
                  attributes: ["userId", "competitionLeagueId", "score"],
                  where: { competitionLeagueId: leagues[i].id },
                  limit: limit,
                  offset: (page - 1) * limit,
                  order: [["score", "DESC"]],
                  nest: true,
                  include: [{ model: postgres.User, attributes: ["name", "avatar"] }]
              });
          }

          let types = [];
          for (const league of leagues) {
              let check = types.find(({ id }) => id === league.cardType.id);

              if (!check)
                  types.push({ ...league.cardType, leagues: [league] });
              else
                  check.leagues.push(league);
          }

          competition["types"] = types;

          resolve(competition);*/
}

async function getLeaderBoardsByManager(data) {
	const {
		page,
		limit,
		order,
		sort,
		competitionId,
		userId,
		competitionLeagueId,
		searchQuery,
		userName,
		leagueName,
		competitionName,
		score,
		status,
		createdAt,
	} = data;
	let query = {};
	let order2 = [
		["score", "ASC"],
		["createdAt", "DESC"],
	];

	if (competitionId) query.competitionId = { [postgres.Op.in]: competitionId };

	if (competitionLeagueId) query.competitionLeagueId = { [postgres.Op.in]: competitionLeagueId };

	if (userId) query.userId = { [postgres.Op.in]: userId };

	if (parseFloat(score) >= 0) query.score = score;

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (order && sort) order2 = [[sort, order]];

	if (userName) {
		query[postgres.Op.or] = [
			{ "$user.name$": { [postgres.Op.iLike]: `%${userName}%` } },
			{ "$user.email$": { [postgres.Op.iLike]: `%${userName}%` } },
		];
	}
	if (leagueName) query["$competitionLeague.title$"] = { [postgres.Op.iLike]: "%" + leagueName + "%" };

	if (competitionName) query["$competition.title$"] = { [postgres.Op.iLike]: "%" + competitionName + "%" };

	if (status) query["$competition.status$"] = { [postgres.Op.in]: status };

	//     query["User.name"] = {[postgres.Op.iLike]: "%" + userName + "%"};

	if (searchQuery) {
		query[postgres.Op.or] = [
			(query["$user.name$"] = { [postgres.Op.iLike]: `%${userName}%` }),
			(query["$competitionLeague.title$"] = { [postgres.Op.iLike]: "%" + leagueName + "%" }),
			(query["$competition.title$"] = { [postgres.Op.iLike]: "%" + competitionName + "%" }),
		];
	}

	const result = await postgres.MatchParticipantTeam.findAndCountAll({
		where: query,
		include: [
			{
				model: postgres.Competition,
			},
			{
				model: postgres.User,
				where: {},
			},
			{
				model: postgres.CompetitionLeague,
			},
		],
		limit: limit,
		offset: (page - 1) * limit,
		order: order2,
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get user competition results
 * @param {*} id
 * @param {*} userdId
 * @returns
 */
function getResults(id, userdId) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.sequelize.query(
			`
		SELECT
		  * 
		FROM
		  (
		  SELECT ROW_NUMBER
			( ) OVER ( ORDER BY score DESC ) AS "rank",
			team.score,
			team."userId",
			league.title AS leaueTitle,
			league."id" AS leaueId,
			league.image AS leagueImage,
			cmp.title AS competitionTitle 
		  FROM
			"matchParticipantTeams" AS team
			INNER JOIN "competitionLeagues" AS league ON team."competitionLeagueId" = league."id"
			INNER JOIN competitions AS cmp ON cmp."id" = league."competitionId" 
		  WHERE
			league."competitionId" = :id AND team."deletedAt" IS NULL
		  ) AS "result" 
		WHERE
		  RESULT."userId" = :userdId
		`,
			{ replacements: { id, userdId } },
		);

		result = result.shift();

		return resolve(result);
	});
}

/**
 *  get ranking details
 * @param {*} id
 * @param {*} userId
 * @returns
 */
function getRankingDetails(id, userId) {
	return new Promise(async (resolve, reject) => {
		let league = await postgres.CompetitionLeague.findOne({
			where: { id },
			attributes: ["title", "image"],
			raw: true,
		});

		let team = await postgres.MatchParticipantTeam.findOne({
			where: { competitionLeagueId: id, userId },
			include: [{ model: postgres.User, attributes: ["name", "avatar"] }],
		});

		league["teamScore"] = team.score;

		league["user"] = team.user;

		league["signals"] = await postgres.MatchParticipant.findAll({
			where: { participantTeamId: team.id },
			attributes: [/*"startPrice", "endPrice", "position", "takeProfit", "stopLoss",*/ "score", "status"],
			// include: [
			// 	{
			// 		model: postgres.CryptoAsset,
			// 		attributes: ["coin", "name", "icon"],
			// 	},
			// ],
			nest: true,
			raw: true,
		});

		resolve(league);
	});
}

/**
 *  get pictures count
 * @param {*} id
 * @param {*} userId
 * @returns
 */
function picturesCount(id) {
	return new Promise(async (resolve, reject) => {
		const total = await postgres.MatchParticipant.count({
			where: { "$matchParticipantTeam.userId$": id },
			include: [postgres.MatchParticipantTeam],
			nest: true,
			raw: true,
		});

		resolve(total);
	});
}

// Competition Task

/**
 * add Competition task
 */
async function addCompetitionTask(title, description, competitionLeagueId, files) {
	let image = {};
	if (files && Object.keys(files).length) {
		for (let key in files) {
			let file = files[key].shift();
			image[key] = [
				{
					name: file.newName,
					key: file.key,
					location: file.location,
				},
			];
		}
	}

	const league = await postgres.CompetitionLeague.findOne({
		where: {
			id: competitionLeagueId,
		},
	});
	if (!league) throw new HumanError("league does not exists", 400);

	const result = await postgres.CompetitionTask.create({
		title,
		description,
		competitionLeagueId,
		...image,
	});

	if (!result) throw new HumanError(Errors.ADD_FAILED.MESSAGE, 400);

	if (league.cardTypeId == 5) {
		const league_title = league.title;
		const ghost_league = await postgres.CompetitionLeague.findOne({
			where: {
				title: league_title.replace("Pictomera", "Ghost"),
			},
			order: [["id", "DESC"]],
		});

		if (!ghost_league) throw new HumanError("ghost league does not exists", 400);

		await postgres.CompetitionTask.create({
			title: title.replace("Pictomera", "Ghost"),
			description,
			competitionLeagueId: ghost_league.id,
			...image,
		});
	}

	return "Successful";
}

/**
 * update Competition task
 * @param {*} id
 * @param {*} description
 * @param {*} competitionLeagueId
 * @returns
 */
function editCompetitionTask(id, title, description, competitionLeagueId, files) {
	return new Promise(async (resolve, reject) => {
		let update = {};
		if (files && Object.keys(files).length) {
			for (let key in files) {
				let file = files[key].shift();
				update[key] = [
					{
						name: file.newName,
						key: file.key,
						location: file.location,
					},
				];
			}
		}

		const exist = await postgres.CompetitionTask.findOne({
			where: { title, competitionLeagueId, id: { [postgres.Op.ne]: id } },
		});
		if (exist) return reject(new HumanError(Errors.DUPLICATE_DATA.MESSAGE, Errors.DUPLICATE_DATA.CODE));

		if (title) update.title = title;
		if (description) update.description = description;
		if (competitionLeagueId) update.competitionLeagueId = competitionLeagueId;

		let result = await postgres.CompetitionTask.update(update, { where: { id }, returning: true });

		if (!result[0])
			return reject(new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * delete Competition task
 * @param {*} id
 * @returns
 */
function delCompetitionTask(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.CompetitionTask.destroy({ where: { id } });

		if (!result)
			return reject(new HumanError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id: id }));

		resolve("Successful");
	});
}

/**
 * get one Competition task
 * @returns
 * @param id
 */
function getCompetitionTask(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.CompetitionTask.findOne({
			where: { id },
			nest: true,
			raw: true,
			include: {
				model: postgres.CompetitionLeague,
				include: [postgres.Competition, postgres.Asset, postgres.Prize, postgres.CardType],
			},
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, {
					id,
				}),
			);

		return resolve(result);
	});
}

/**
 * get Competition task list
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @returns
 */
function getCompetitionTasks(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, order, sort, title, description, competitionLeagueId, id, createdAt, searchQuery } = data;

		const query = {};
		if (title) query.title = { [postgres.Op.iLike]: "%" + title + "%" };
		if (description) query.description = { [postgres.Op.iLike]: "%" + description + "%" };
		if (id) query.id = id;
		if (competitionLeagueId) query.competitionLeagueId = competitionLeagueId;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{ title: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ description: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		let result = await postgres.CompetitionTask.findAndCountAll({
			where: query,
			limit: limit,
			offset: (page - 1) * limit,
			order: [[sort, order]],
			nest: true,
			raw: true,
			include: {
				model: postgres.CompetitionLeague,
				include: [postgres.Competition, postgres.Asset, postgres.Prize, postgres.CardType],
			},
		});

		resolve({
			total: result.count,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

/**
 * get one Competition task
 * @returns
 * @param id
 */
function getCompetitionTaskByManager(id) {
	return new Promise(async (resolve, reject) => {
		const result = await postgres.CompetitionTask.findOne({
			where: { id },
			nest: true,
			raw: true,
			include: {
				model: postgres.CompetitionLeague,
				include: [postgres.Competition, postgres.Asset, postgres.Prize, postgres.CardType],
			},
		});

		if (!result)
			return reject(
				new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, {
					id,
				}),
			);

		return resolve(result);
	});
}

/**
 * get Competition task list
 */
async function getCompetitionTasksByManager(data) {
	const { page, limit, order, sort, title, description, competitionLeagueId, id, createdAt, searchQuery } = data;

	const query = {};
	if (title) query.title = { [postgres.Op.iLike]: "%" + title + "%" };
	if (description) query.description = { [postgres.Op.iLike]: "%" + description + "%" };
	if (id) query.id = id;
	if (competitionLeagueId) query.competitionLeagueId = competitionLeagueId;

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (searchQuery) {
		query[postgres.Op.or] = [
			{ title: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ description: { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}

	const ghostType = await postgres.CardType.findOne({ where: { name: "Ghost" } });
	if (!ghostType) throw new HumanError("ghostType does not exists");

	let result = await postgres.CompetitionTask.findAndCountAll({
		where: query,
		limit: limit,
		offset: (page - 1) * limit,
		order: [[sort, order]],
		nest: true,
		raw: true,
		include: {
			model: postgres.CompetitionLeague,
			where: {
				cardTypeId: { [postgres.Op.ne]: ghostType.id },
			},
			include: [postgres.Competition, postgres.Asset, postgres.Prize, postgres.CardType],
		},
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

module.exports = {
	getCompetitions,
	getCompetition,
	addCompetition,
	editCompetition,
	delCompetition,
	getCompetitionLeagues,
	getCompetitionLeague,
	addCompetitionLeague,
	editCompetitionLeague,
	delCompetitionLeague,
	sliceWinners,
	listCompetition,
	detailsCompetition,
	addUserCompetition,
	editUserCompetition,
	getLeaderBoards,
	getResults,
	getRankingDetails,
	picturesCount,
	addCompetitionTask,
	editCompetitionTask,
	delCompetitionTask,
	getCompetitionTask,
	getCompetitionTasks,
	getCompetitionTaskByManager,
	getCompetitionTasksByManager,
	getLeaderBoardsByManager,
	calculateLenses,
	countCompetitionParticipant,
	competitionRank,
	getUserCompetitionImage,
};
