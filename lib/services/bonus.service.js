
const { postgres } = require("../databases");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const jmoment = require("jalali-moment");
const hooks = require("../hooks");
const { events } = require("../data/constans");

/**
 * get bonus list
 * @param title
 * @param description
 * @param firstMember
 * @param {*} cardTypeId
 * @param {*} cardTierId
 * @param cardNumber
 * @param tokenAmount
 * @param startAt
 * @param endAT
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param sort
 * @param searchQuery
 * @param createdAt
 * @returns
 */
function getBonuses(data) {
	return new Promise(async (resolve, reject) => {
		const {
			title,
			description,
			firstMember,
			type,
			tier,
			cardNumber,
			tokenAmount,
			startAt,
			endAT,
			status,
			page,
			limit,
			order,
			sort,
			q,
			createdAt,
			id,
			//sort & order
			sortCardTier,
			orderCardTier,
		} = data;

		let query = {};
		let query2 = {};
		let query3 = {};
		let order2;

		if (q) {
			query = {
				[postgres.Op.or]: [
					{ title: { [postgres.Op.like]: "%" + q + "%" } },
					{ "$cardTier.title$": { [postgres.Op.like]: "%" + q + "%" } },
					{ "$cardType.title$": { [postgres.Op.like]: "%" + q + "%" } },
				],
			};
		}

		if (id) query.id = id;
		if (title) query.title = { [postgres.Op.iLike]: "%" + title + "%" };
		if (description) query.description = description;
		if (firstMember) query.firstMember = firstMember;
		if (type) query2.title = { [postgres.Op.iLike]: "%" + type + "%" };
		if (tier) query3.title = { [postgres.Op.iLike]: "%" + tier + "%" };
		if (cardNumber) query.cardNumber = cardNumber;
		if (tokenAmount) query.tokenAmount = tokenAmount;
		if (status) query.status = status;
		if (startAt)
			query.startAt = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("startAt")),
				"=",
				startAt,
			);
		if (endAT)
			query.endAT = postgres.sequelize.where(
				postgres.sequelize.fn("date", postgres.sequelize.col("endAT")),
				"=",
				endAT,
			);

		if (createdAt) query.createdAt = createdAt;

		order2 = [[sort, order]];

		let result = await postgres.Bonus.findAndCountAll({
			where: query,
			limit: limit,
			offset: (page - 1) * limit,
			order: order2,
			include: [
				{
					where: query2,
					model: postgres.CardType,
				},
			],
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
 * get one bonus
 * @returns
 * @param id
 */
function getBonus(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Bonus.findOne({
			where: { id },
			include: [{ model: postgres.CardType }],
		});

		resolve(result);
	});
}

/**
 * get user bonus list
 * @param {*} userId
 * @param {*} bonusId
 * @param {*} cardTypeId
 * @param {*} cardTierId
 * @param cardNumber
 * @param tokenAmount
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param sort
 * @param searchQuery
 * @param createdAt
 * @returns
 */
function getUserBonus(user, id, type, tier, cardNumber, tokenAmount, page, limit, order, sort, createdAt) {
	return new Promise(async (resolve, reject) => {
		let query = {};
		let query2 = {};
		let query3 = {};
		let query4 = {};

		if (user) query4.name = user;
		if (id) query.id = id;
		if (type) query2.title = { [postgres.Op.iLike]: "%" + type + "%" };
		if (tier) query3.title = { [postgres.Op.iLike]: "%" + tier + "%" };
		if (cardNumber) query.cardNumber = cardNumber;
		if (tokenAmount) query.tokenAmount = tokenAmount;

		// if (createdAt)
		// 	query.createdAt = postgres.sequelize.where(
		// 		postgres.sequelize.fn("date", postgres.sequelize.col("createdAt")),
		// 		"=",
		// 		createdAt,
		// 	);
		if (createdAt) query.createdAt = createdAt;

		let result = await postgres.UserBonus.findAndCountAll({
			where: query,
			limit: limit,
			offset: (page - 1) * limit,
			order: [[sort, order]],
			include: [
				{
					where: query4,
					model: postgres.User,
					attributes: { exclude: ["password", "salt"] },
				},
				{
					where: query2,
					model: postgres.CardType,
				},
				{
					model: postgres.Bonus,
				},
			],
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
 *  add bonus
 * @param {*} title
 * @param {*} description
 * @param {*} firstMember
 * @param {*} cardTypeId
 * @param {*} cardTierId
 * @param {*} cardNumber
 * @param {*} tokenAmount
 * @param {*} startAt
 * @param {*} endAt
 * @param {*} status
 * @param {*} type
 * @returns
 */
function addBonus(
	title,
	description,
	firstMember,
	cardTypeId,
	cardTierId,
	cardNumber,
	tokenAmount,
	startAt,
	endAt,
	status,
	type,
) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Bonus.create({
			title,
			description,
			firstMember,
			cardTypeId,
			cardTierId,
			cardNumber,
			tokenAmount,
			startAt,
			endAt,
			status,
			type,
		});

		if (!result) return reject(new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));

		resolve("Successful");
	});
}

/**
 *  update bonus
 * @param {*} id
 * @param {*} title
 * @param {*} description
 * @param {*} firstMember
 * @param {*} cardTypeId
 * @param {*} cardTierId
 * @param {*} cardNumber
 * @param {*} tokenAmount
 * @param {*} startAt
 * @param {*} endAt
 * @param {*} status
 * @param {*} type
 * @returns
 */
function editBonus(
	id,
	title,
	description,
	firstMember,
	cardTypeId,
	cardTierId,
	cardNumber,
	tokenAmount,
	startAt,
	endAt,
	status,
	type,
) {
	return new Promise(async (resolve, reject) => {
		let update = {};

		if (title) update.title = title;
		if (description) update.description = description;
		if (firstMember) update.firstMember = firstMember;
		if (cardTypeId) update.cardTypeId = cardTypeId;
		if (cardTierId) update.cardTierId = cardTierId;
		if (cardNumber) update.cardNumber = cardNumber;
		if (tokenAmount) update.tokenAmount = tokenAmount;
		if (startAt) update.startAt = startAt;
		if (endAt) update.endAt = endAt;
		if (status) update.status = status;
		if (type) update.type = type;

		let result = await postgres.Bonus.update(update, { where: { id } });

		if (!result.shift())
			return reject(new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id }));

		return resolve("Successful");
	});
}

/**
 * delete bonus
 * @param {*} id
 * @returns
 */
function delBonus(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.Bonus.destroy({ where: { id } });

		if (!result) return reject(new HumanError(Errors.DELETE_FAILED.MESSAGE, Errors.DELETE_FAILED.CODE, { id: id }));

		resolve("Successful");
	});
}

/**
 *  giving User Bonus
 * @param {*} user
 * @param {*} wallet
 * @param {*} io
 * @returns
 */
function givingUserBonus(user, wallet, io) {
	return new Promise(async (resolve, reject) => {
		try {
			let bonuses = await postgres.Bonus.findAll({
				where: { status: "ACTIVE", type: "REGISTER" },
				order: [["createdAt", "ASC"]],
			});

			let currentDate = jmoment();

			let registeredCount = await postgres.User.count();

			for (const bonus of bonuses) {
				// check bonus expire time is active
				if (bonus.endAt < currentDate) {
					await bonus.update({ status: "INACTIVE" });

					continue;
				}

				// check first member still is active
				if (registeredCount >= bonus.firstMember) {
					await bonus.update({ status: "INACTIVE" });

					continue;
				}

				// check bonus for stylike token and update user wallet
				if (bonus.tokenAmount && bonus.tokenAmount > 0) wallet.increment("amount", { by: bonus.tokenAmount });

				// check bonus card number
				if (bonus.cardNumber && bonus.cardNumber > 0) {
					let cards = await postgres.Card.findAll({
						where: {
							type: bonus.cardTypeId,
							tier: bonus.cardTierId,
							initialNumber: { [postgres.Op.gt]: postgres.Sequelize.col("assignedNumber") },
							status: "ACTIVE",
						},
						limit: bonus.cardNumber,
						order: postgres.Sequelize.fn("RANDOM"),
					});

					if (!cards.length) continue;

					// assign card to user
					for (const card of cards) {
						let token = await postgres.Token.findOne({ where: { cardId: card.id, status: "CREATED" } });

						await postgres.AssignedCard.create({
							userId: user.id,
							cardId: card.id,
							tokenId: token.id,
							type: "TRANSFER",
							status: "FREE",
						});

						await token.update({ status: "ASSIGNED" });

						await card.increment("assignedNumber");
					}
				}

				let title = `You have received ${
					bonus.tokenAmount && bonus.tokenAmount > 0 ? `${bonus.tokenAmount} Stylike, ` : ""
				} ${bonus.cardNumber && bonus.cardNumber > 0 ? `${bonus.cardNumber} cards` : ""} for free`;

				let notiff = await postgres.UserNotification.create({ userId: user.id, title });

				io.to(`UserId:${user.id}`).emit("notification", JSON.stringify(notiff));

				// save taken bonus
				await postgres.UserBonus.create({
					userId: user.id,
					bonusId: bonus.id,
					cardTypeId: bonus.cardTypeId,
					cardTierId: bonus.cardTierId,
					cardNumber: bonus.cardNumber,
					tokenAmount: bonus.tokenAmount,
				});
			}
		} catch (error) {
			console.log("====================================");
			console.log(error);
			console.log("====================================");
		}

		resolve();
	});
}

module.exports = {
	getBonuses,
	getBonus,
	addBonus,
	editBonus,
	delBonus,
	getUserBonus,
	givingUserBonus,
};
