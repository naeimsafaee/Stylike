const { postgres } = require("../../databases");
const { NotFoundError, HumanError, InvalidRequestError, ConflictError } = require("../errorhandler");
const Errors = require("../errorhandler/MessageText");
const Handlers = require("./lib/handlers");
const { calculateReferral, calculate5PercentReferral, calculateAgentFee } = require("./../referral.service");
const { events } = require("../../data/constans");
const hooks = require("../../hooks");

const { default: axios } = require("axios");
const moment = require("moment");
const { sendPushToToken } = require("../notification.service");
const em = require("exact-math");
const { giveUserNftHolderPlan } = require("../Ai/aiPlan.service");
const { httpRequest } = require("../swap.service");
const walletConfig = require("config").get("clients.wallet");

/**
 * get auction
 * @param tokenId
 * @param start
 * @param end
 * @param basePrice
 * @param immediatePrice
 * @param bookingPrice
 * @param type
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param {*} userId
 * @param sort
 * @param auctionType
 */
async function getAll(data) {
	const {
		id,
		cardId,
		userId,
		start,
		end,
		basePrice,
		immediatePrice,
		bookingPrice,
		type,
		status,
		page,
		limit,
		order,
		sort,
		createdAt,
		user,
		auctionType,
		sortUser,
		orderUser,
	} = data;

	let query = {};
	let query2 = {};
	let query3 = {};
	let order2;

	if (id) query.id = id;
	if (cardId) query2.playerName = { [postgres.Op.iLike]: "%" + cardId + "%" };
	if (userId) query.userId = userId;
	if (start) query.start = start;
	if (end) query.end = end;
	if (basePrice) query.basePrice = basePrice;
	if (immediatePrice) query.immediatePrice = immediatePrice;
	if (bookingPrice) query.bookingPrice = bookingPrice;
	if (type) query.type = type;
	if (status) query.status = status;
	if (createdAt) query.createdAt = createdAt;
	if (user) query3.name = user;
	if (auctionType) query.auctionType = auctionType;

	if (sortUser && orderUser) {
		order2 = [[{ model: postgres.User }, sortUser, orderUser]];
	} else {
		order2 = [[sort ?? "createdAt", order]];
	}

	let offset = (page - 1) * limit;
	let include;
	if (userId) {
		include = [
			{
				model: postgres.AssignedCard,
				required: false,
				include: [postgres.Card],
			}, // {
			// 	model: postgres.AuctionOffer,
			// 	limit: 1,
			// 	where: { status: ["REGISTERED", "WON"] },
			// 	attributes: ["amount"],
			// 	required: false,
			// },
			{
				model: postgres.User,
				as: "user",
				attributes: { exclude: ["password", "salt"] },
				required: false,
			},
		];
	} else
		include = [
			{
				model: postgres.User,
				as: "user",
				attributes: { exclude: ["password", "salt"] },
				required: false,
				where: query3,
			},
			{
				model: postgres.AssignedCard,
				required: true,
				include: [
					{
						model: postgres.Card,
						include: [postgres.CardType],
					},
				],
			},
		];

	let result = await postgres.Auction.findAndCountAll({
		where: query,
		limit,
		offset,
		order: order2,
		include,
	});

	return {
		total: result?.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get user auctions list
 * @param {*} userId
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param sort
 * @param minPrice
 * @param maxPrice
 * @param cardType
 * @returns
 */
function getUserAuctions({ userId, status, page, limit, order, sort, minPrice, maxPrice, cardType }) {
	return new Promise(async (resolve, reject) => {
		let count = await postgres.Auction.count({ where: { userId } });

		let offset = (page - 1) * limit;

		let orderBy = `ORDER BY auction."${sort}" ${order}`,
			condition = "";

		if (status) condition += ` AND auction."status" = ${postgres.sequelize.escape(status)}`;
		if (cardType) condition += ` AND card."cardTypeId" = ${postgres.sequelize.escape(cardType)}`;
		if (minPrice)
			condition += ` AND ${postgres.sequelize.escape(minPrice)} <=
		(CASE WHEN max IS NULL THEN auction."basePrice" ELSE max."amount" END) `;
		if (maxPrice)
			condition += ` AND ${postgres.sequelize.escape(maxPrice)} >=
		(CASE WHEN max IS NULL THEN auction."basePrice" ELSE max."amount" END) `;

		let result = await postgres.sequelize.query(
			`
		SELECT
			auction."id",
			auction."start",
			auction."end",
			auction."type",
			auction."basePrice",
			auction."immediatePrice",
			auction."auctionType",
			auction."status",
			card."image",
			COUNT ( auctionOffer."id" ) AS "count",
			MAX ( auctionOffer.amount ) AS "max" 
		FROM
			auctions AS auction
			INNER JOIN cards AS card ON card."id" = auction."cardId"

			LEFT OUTER JOIN "auctionOffers" AS auctionOffer ON auction."id" = auctionOffer."auctionId" AND auctionOffer.status = 'REGISTERED'

		WHERE
			auction."userId" = ${+userId} ${condition} AND auction."deletedAt" IS NULL
		GROUP BY
			auction."id",
			card."image",
		${orderBy}
		LIMIT :limit
		OFFSET :offset
		`,
			{ replacements: { limit, offset } },
		);

		result = result.shift();

		return resolve({
			total: count,
			pageSize: limit,
			page,
			data: result,
		});
	});
}

/**
 * get user auction
 * @param {*} param0
 * @returns
 */
function getUserAuction({ userId, id }) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.sequelize.query(`
		SELECT
			auction."id",
			auction."start",
			auction."end",
			auction."type",
			auction."basePrice",
			auction."immediatePrice",
			auction."bookingPrice",
			card."image",
			COUNT ( auctionOffer."id" ) AS "count",
			MAX ( auctionOffer.amount ) AS "max" 
		FROM
			auctions AS auction
			INNER JOIN cards AS card ON card."id" = auction."cardId"
			
			LEFT OUTER JOIN "auctionOffers" AS auctionOffer ON auction."id" = auctionOffer."auctionId" AND auctionOffer.status = 'REGISTERED'
			 
		WHERE
			auction."userId" = ${postgres.sequelize.escape(+userId)} AND auction."id" = ${postgres.sequelize.escape(+id)} 
		GROUP BY
			auction."id",
			card."image",
		`);

		result = result.shift();

		return resolve(result.shift());
	});
}

async function getOne(id, userId) {
	let where = {
		id,
		...(userId && { userId }),
	};

	let include;
	if (userId)
		include = [
			{
				model: postgres.AssignedCard,
				required: false,
				include: {
					model: postgres.Card,
					required: false,
					include: {
						model: postgres.CardType,
						required: false,
					},
				},
			},
			{
				model: postgres.AuctionOffer,
				order: [["amount", "DESC"]],
				attributes: ["amount"],
			},
		];
	else
		include = [
			{ model: postgres.User, as: "user", attributes: { exclude: ["password", "salt"] } },
			{
				model: postgres.AssignedCard,
				required: false,
				include: {
					model: postgres.Card,
					required: false,
					include: {
						model: postgres.CardType,
						required: false,
					},
				},
			},
		];

	return await postgres.Auction.findOne({
		where,
		include,
	});
}

async function addAuctionManager(data, io) {
	return new Promise(async (resolve, reject) => {
		const { start, end, immediatePrice, initialNumber, cardTypeId, type, chain } = data;

		const transaction = await postgres.sequelize.transaction();

		const cardType = await postgres.CardType.findByPk(cardTypeId);
		if (!cardType) return reject(new NotFoundError("Card type not found", 2029, { cardTypeId }));

		const freeAssignedCards = await postgres.AssignedCard.findAndCountAll({
			where: {
				userId: null,
				type: "TRANSFER",
				status: "FREE",
				"$card.cardTypeId$": cardTypeId,
			},
			include: [
				{
					model: postgres.Card,
					where: {
						chain: chain === "BSC" ? "BSC" : "POLYGON",
					},
					required: true,
				},
			],
			limit: initialNumber,
			raw: true,
		});

		if (freeAssignedCards.count < initialNumber)
			return reject(
				new HumanError(
					`There are not enough cards associated with this card type id. Total available cards are: ${freeAssignedCards.count}`,
					400,
				),
			);

		try {
			const assignedCards = freeAssignedCards.rows;
			const newAuctions = [];
			for (let i = 0; i < assignedCards.length; i++) {
				newAuctions.push({ assignedCardId: assignedCards[i].id, start, end, immediatePrice, type });
			}

			await postgres.Auction.bulkCreate(newAuctions, { transaction });

			const assignedCardsIds = assignedCards.map((as) => as.id);
			await postgres.AssignedCard.update(
				{ status: "INAUCTION" },
				{
					where: { id: { [postgres.Op.in]: assignedCardsIds } },
					transaction,
				},
			);

			await transaction.commit();
			return resolve("Successful");
		} catch (error) {
			console.log(error);

			await transaction.rollback();
			return reject(new HumanError("An error occurred while registering the auction", 1051));
		}
	});
}

/**
 * add new auction by user
 * @param {*} userId
 * @param {*} assignedCardId
 * @param {*} start
 * @param {*} end
 * @param {*} basePrice
 * @param {*} immediatePrice
 * @param {*} bookingPrice
 * @param {*} type
 * @param {*} io
 */
async function add(userId, assignedCardId, start, end, basePrice, immediatePrice, bookingPrice, type, io, auctionType) {
	let assignCard = await postgres.AssignedCard.findOne({
		where: { userId, id: assignedCardId, status: "FREE", type: ["TRANSFER", "REWARD", "BOX"] },
		include: [{ model: postgres.Card, where: { isCommon: false } }],
	});

	if (!assignCard) throw new HumanError(Errors.AUCTION_FAILED.MESSAGE, Errors.AUCTION_FAILED.CODE);

	let result = await postgres.Auction.create(
		{
			userId,
			assignedCardId,
			start,
			end,
			basePrice,
			immediatePrice,
			bookingPrice,
			type: type ?? "NORMAL",
			auctionType,
		},
		{ returning: true },
	);

	if (!result) throw new HumanError(Errors.AUCTION_FAILED.MESSAGE, Errors.AUCTION_FAILED.CODE);

	await assignCard.update({ status: "INAUCTION" });

	io.to("Auction").emit("auction-create", JSON.stringify(result));

	return "Successful";
}

/**
 *
 * @param {*} userId
 * @param {*} id
 * @param {*} start
 * @param {*} end
 * @param {*} basePrice
 * @param {*} immediatePrice
 * @param {*} bookingPrice
 * @param {*} type
 * @param io
 * @returns
 */
async function edit(userId, id, start, end, basePrice, immediatePrice, bookingPrice, type, io) {
	// check for this auction offer is exist
	let checkOffers = await postgres.AuctionOffer.findAll({ where: { auctionId: id, status: "REGISTERED" } });

	if (checkOffers.length) throw new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id });

	let update = { userId };

	if (type) update.type = type;
	if (start) update.start = start;
	if (end) update.end = end;
	if (basePrice) update.basePrice = basePrice;
	if (immediatePrice) update.immediatePrice = immediatePrice;
	if (bookingPrice) update.bookingPrice = bookingPrice;

	let result = await postgres.Auction.update(update, { where: { id }, returning: true });

	if (!result.shift()) throw new NotFoundError(Errors.UPDATE_FAILED.MESSAGE, Errors.UPDATE_FAILED.CODE, { id });
	io.to("Auction").emit("auction-update", JSON.stringify(result[0][0]));
	return "Successful";
}

async function editAuctionManager(data, io) {
	return new Promise(async (resolve, reject) => {
		const { id, start, end, immediatePrice, type } = data;

		const transaction = await postgres.sequelize.transaction();

		try {
			const auction = await postgres.Auction.findOne({ where: { id } });
			if (!auction) {
				await transaction.rollback();
				return reject(new NotFoundError("auction not found", 1052, { id }));
			}

			const update = {};

			if (type) update.type = type;
			if (start) update.start = start;
			if (end) update.end = end;
			if (immediatePrice) update.immediatePrice = immediatePrice;

			const updatedAuction = await postgres.Auction.update(update, { where: { id }, transaction });

			if (!updatedAuction) {
				await transaction.rollback();
				return reject(new HumanError(Errors.UPDATE_FILED.MESSAGE, Errors.UPDATE_FILED.CODE));
			}

			await transaction.commit();

			return resolve("Successful");
		} catch (e) {
			await transaction.rollback();
			return reject(e);
		}
	});
}

/**
 * delete user auction
 * @param {*} userId
 * @param {*} id
 * @param io
 * @returns
 */
async function del(userId, id, io) {
	// check for this auction offer is exist
	let checkOffers = await postgres.AuctionOffer.findAll({ where: { auctionId: id, status: "REGISTERED" } });

	if (checkOffers.length) throw new NotFoundError(Errors.DELETE_FAILED.MESSAGE, Errors.DELETE_FAILED.CODE, { id });

	let result = await postgres.Auction.destroy({ where: { userId, id }, returning: true });

	if (!result.length) throw new HumanError(Errors.DELETE_FAILED.MESSAGE, Errors.DELETE_FAILED.CODE, { id });

	await postgres.AssignedCard.update({ status: "FREE" }, { where: { userId, id: result[0].assignedCardId } });

	io.to("Auction").emit("auction-delete", JSON.stringify(result[0]));

	return "Successful";
}

/**
 * delete manager auction
 * @param {*} id
 * @param io
 * @returns
 */
async function delAuctionManager(id, io) {
	const auction = await postgres.Auction.findOne({ where: { id, status: { [postgres.Op.ne]: "FINISHED" } } });
	if (!auction) {
		return new NotFoundError(Errors.AUCTION_NOT_FOUND.MESSAGE, Errors.AUCTION_NOT_FOUND.CODE, { id });
	}

	await postgres.AssignedCard.update({ status: "FREE" }, { where: { id: auction.assignedCardId } });
	await auction.destroy();

	return "Successful";
}

/**
 * get user offers
 * @param {*} id
 * @param {*} auctionId
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param {*} userId
 */
async function getOffers({ auctionId, status, page, limit, order, userId }) {
	try {
		let query = { userId };

		if (auctionId) query.auctionId = auctionId;
		if (status) query.status = status;

		let offset = (page - 1) * limit;

		let include;
		if (userId)
			include = [
				{
					model: postgres.Auction,
					attributes: { exclude: ["updatedAt", "deletedAt", "bookingPrice"] },
					include: [postgres.Card], // include: [
					// 	{
					// 		model: postgres.AssignedCard,
					// 		attributes: { exclude: ["updatedAt", "deletedAt"] },
					// 		include: [
					// 			{
					// 				model: postgres.Card,
					// 				include: [
					// 					{
					// 						model: postgres.CardType,
					// 						attributes: { exclude: ["updatedAt", "deletedAt", "createdAt", "status"] },
					// 					},
					// 					{
					// 						model: postgres.Player,
					// 						attributes: { exclude: ["updatedAt", "deletedAt", "createdAt"] },
					// 					},
					// 				],
					// 				attributes: {
					// 					exclude: [
					// 						"name",
					// 						"description",
					// 						"initialNumber",
					// 						"assignedNumber",
					// 						"status",
					// 						"createdAt",
					// 						"updatedAt",
					// 						"deletedAt",
					// 					],
					// 				},
					// 			},
					// 		],
					// 	},
					// ],
					as: "auction",
				},
			];
		else
			include = [
				{
					where: query2,
					model: postgres.User,
					attributes: { exclude: ["password", "salt"] },
				},
				{
					model: postgres.Auction,
					attributes: { exclude: ["updatedAt", "deletedAt", "bookingPrice"] },
					include: [postgres.Card],
				},
			];

		let result = await postgres.AuctionOffer.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [["createdAt", order]],
			include,
		});

		return {
			total: result?.count,
			pageSize: limit,
			page,
			data: result.rows,
		};
	} catch (e) {
		// console.log("error => ", e);
		throw e;
	}
}

/**
 * get user offers Mnager
 * @param {*} id
 * @param {*} auctionId
 * @param {*} status
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param {*} userId
 */
async function getOffersManager({ id, user, auctionId, status, page, limit, order, sort, userId, createdAt, amount }) {
	try {
		let query = {};
		let query2 = {};

		if (id) query.id = id;
		if (user) query2.name = { [postgres.Op.iLike]: "%" + user + "%" };
		if (auctionId) query.auctionId = auctionId;
		if (status) query.status = status;
		if (amount) query.amount = amount;

		let offset = (page - 1) * limit;

		let include;
		if (userId)
			include = [
				{
					model: postgres.Auction,
					attributes: { exclude: ["updatedAt", "deletedAt", "bookingPrice"] }, // include: [
					// 	{
					// 		model: postgres.AssignedCard,
					// 		attributes: { exclude: ["updatedAt", "deletedAt"] },
					// 		include: [
					// 			{
					// 				model: postgres.Card,
					// 				include: [
					// 					{
					// 						model: postgres.CardType,
					// 						attributes: { exclude: ["updatedAt", "deletedAt", "createdAt", "status"] },
					// 					},
					// 					{
					// 						model: postgres.Player,
					// 						attributes: { exclude: ["updatedAt", "deletedAt", "createdAt"] },
					// 					},
					// 				],
					// 				attributes: {
					// 					exclude: [
					// 						"name",
					// 						"description",
					// 						"initialNumber",
					// 						"assignedNumber",
					// 						"status",
					// 						"createdAt",
					// 						"updatedAt",
					// 						"deletedAt",
					// 					],
					// 				},
					// 			},
					// 		],
					// 	},
					// ],
					as: "auction",
				},
			];
		else
			include = [
				{
					where: query2,
					model: postgres.User,
					attributes: { exclude: ["password", "salt"] },
				},
			];

		if (createdAt) query.createdAt = createdAt;

		let result = await postgres.AuctionOffer.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort ?? "createdAt", order]],
			include,
		});

		return {
			total: result?.count,
			pageSize: limit,
			page,
			data: result.rows,
		};
	} catch (e) {
		// console.log("error => ", e);
		throw e;
	}
}

/**
 * get user offers
 * @param {*} id
 */
async function getOffer(id) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.AuctionOffer.findOne({
			where: { id },
			include: [{ model: postgres.User, as: "user", attributes: { exclude: ["password", "salt"] } }],
		});
		if (!result)
			return reject(
				new NotFoundError(Errors.AUCTION_NOT_FOUND.MESSAGE, Errors.AUCTION_NOT_FOUND.CODE, {
					id,
				}),
			);
		return resolve(result);
	});
}

/**
 * add user auction offers
 * @param {*} userId
 * @param {*} auctionId
 * @param {*} amount
 * @param io
 */
async function addOffers(userId, auctionId, amount, io) {
	// check auction still active
	let auction = await postgres.Auction.findOne({
		where: { id: auctionId, status: "ACTIVE" },
		include: [
			{
				model: postgres.AssignedCard,
				include: [
					{
						model: postgres.Card,
					},
				],
			},
			{
				model: postgres.Card,
			},
		],
	});

	if (!auction) throw new HumanError(Errors.AUCTION_NOT_FOUND.MESSAGE, Errors.AUCTION_NOT_FOUND.CODE);

	// check user wallet amount
	let userWallet = await postgres.UserWallet.findOne({
		where: { userId },
		include: [{ model: postgres.Asset, as: "asset", where: { coin: "BUSD" }, required: true }],
	});

	if (!userWallet) throw new HumanError(Errors.USER_WALLET_NOT_FOUND.MESSAGE, Errors.USER_WALLET_NOT_FOUND.CODE);

	//check min amount for this auction
	if (amount < auction.immediatePrice)
		throw new HumanError(Errors.ORDER_AMOUNT_IS_LOW.MESSAGE, Errors.ORDER_AMOUNT_IS_LOW.CODE);

	// check user have enough amount in wallet
	if (userWallet.amount < amount)
		throw new HumanError(
			Errors.ORDER_BAD_REQUEST_LOW_WALLET_AMOUNT.MESSAGE,
			Errors.ORDER_BAD_REQUEST_LOW_WALLET_AMOUNT.CODE,
		);

	const existAssignedCardType = await postgres.AssignedCard.findOne({
		where: { userId, "$card.cardTypeId$": auction.card.cardTypeId },
	});

	if (existAssignedCardType) {
		throw new HumanError(
			Errors.AUCTION_OFFER_ALREADY_HAVE_TYPE.MESSAGE,
			Errors.AUCTION_OFFER_ALREADY_HAVE_TYPE.CODE,
		);
	}

	// update user wallet and block amount and create new offer for this auction
	let transaction = await postgres.sequelize.transaction(),
		auctionOffer;

	try {
		//The amount is decrease from the payer's wallet
		userWallet = await userWallet.decrement("amount", { by: amount, transaction });

		if (amount >= auction.immediatePrice) {
			let auctionHandler = new Handlers(transaction, amount, userWallet.userId, auction);

			//calculate system fee
			await auctionHandler.calculateFee();

			// transfer remain amount to payee
			await auctionHandler.transferToPayee();

			//save auction transaction
			await auctionHandler.saveTransaction();

			// close auction
			auctionOffer = await auctionHandler.changeAuctionStatus(); //TODO : CHANGE STATUS

			//return other offers
			auctionHandler.returnOtherOffers();

			let notiff = await postgres.UserNotification.create({
				userId: auction.userId,
				title: `The ${auction?.assignedCard?.card?.name} card was sold at auction for ${amount} BNB.`,
			});

			//add to userActivity
			await postgres.UserActivity.create({
				userId: auction.userId,
				title: `The ${auction?.assignedCard?.card?.name} card was sold at auction for ${amount} BNB.`,
				tag: "AUCTION",
			});

			io.to(`UserId:${auction.userId}`).emit("notification", JSON.stringify(notiff));
		} else {
			userWallet = await userWallet.increment("frozen", { by: amount, transaction });

			auctionOffer = await postgres.AuctionOffer.create({ userId, auctionId, amount }, { transaction });

			//add to userActivity
			await postgres.UserActivity.create(
				{
					userId,
					title: "user submit offer for this auction " + auctionId,
					tag: "AUCTION",
				},
				{ transaction },
			);
		}

		await transaction.commit();
	} catch (error) {
		// console.log(error);
		await transaction.rollback();

		throw new HumanError(Errors.AUCTION_FAILED.MESSAGE, Errors.AUCTION_FAILED.CODE);
	}

	io.to(`UserId:${userId}`).emit("wallet", JSON.stringify([userWallet]));

	let result = await postgres.AuctionOffer.findOne({
		where: { id: auctionOffer.id },
		include: [{ model: postgres.User, as: "user", attributes: ["name", "avatar"] }],
	});

	io.to("Auction-Offer").emit("auction-offer", JSON.stringify(result));

	return "Successful";
}

/**
 * esit user auction offer
 * @param {*} userId
 * @param {*} id
 * @param {*} amount
 * @returns
 */
async function editOffers(userId, id, amount) {
	let update = { userId };

	if (amount) update.amount = amount;

	let result = await postgres.AuctionOffer.update(update, { where: { id } });

	if (!result.shift()) return new NotFoundError(Errors.UPDATE_FILED.MESSAGE, Errors.UPDATE_FILED.CODE, { id });

	return "Successful";
}

/**
 * delete user auction offer
 * @param {*} userId
 * @param {*} id
 * @returns
 */
async function deleteOffers(userId, id, io) {
	// get offer request from db
	let offer = await postgres.AuctionOffer.findOne({ where: { userId, id, status: "REGISTERED" } });

	if (!offer) throw new HumanError(Errors.OFFER_NOT_FOUND.MESSAGE, Errors.OFFER_NOT_FOUND.CODE, { id: id });

	// update user wallet and on block amount and update offer for this auction
	let transaction = await postgres.sequelize.transaction();
	try {
		let userWallet = await postgres.UserWallet.findOne({
			where: { userId },
			include: [{ model: postgres.Asset, as: "asset", where: { coin: "BNB" }, required: true }],
			transaction,
		});

		await userWallet.increment("amount", { by: offer.amount, transaction });

		await userWallet.decrement("frozen", { by: offer.amount, transaction });

		await offer.update({ status: "CANCELED" }, { transaction });

		await transaction.commit();

		io.to("Auction").emit("auction-offers-delete", JSON.stringify(offer));
	} catch (error) {
		await transaction.rollback();

		throw new HumanError(Errors.OFFER_NOT_FOUND.MESSAGE, Errors.OFFER_NOT_FOUND.CODE, { id: id });
	}

	return "Successful";
}

/**
 * delete user auction offer
 * @param {*} userId
 * @param {*} id
 * @returns
 */
async function deleteOffersManager(id) {
	// get offer request from db
	let offer = await postgres.AuctionOffer.findOne({ where: { id, status: "REGISTERED" } });

	if (!offer) throw new HumanError(Errors.OFFER_NOT_FOUND.MESSAGE, Errors.OFFER_NOT_FOUND.CODE, { id: id });

	// update user wallet and on block amount and update offer for this auction
	let transaction = await postgres.sequelize.transaction();
	try {
		let userWallet = await postgres.UserWallet.findOne({
			where: { userId: offer.userId },
			include: [{ model: postgres.Asset, as: "asset", where: { coin: "BNB" }, required: true }],
			transaction,
		});

		await userWallet.increment("amount", { by: offer.amount, transaction });

		await userWallet.decrement("frozen", { by: offer.amount, transaction });

		await offer.update({ status: "CANCELED" }, { transaction });

		await transaction.commit();
	} catch (error) {
		await transaction.rollback();

		throw new HumanError(Errors.OFFER_NOT_FOUND.MESSAGE, Errors.OFFER_NOT_FOUND.CODE, { id: id });
	}

	return "Successful";
}

/**
 * get auction trades list
 * @param {*} auctionId
 * @param payerId
 * @param payeeId
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param sort
 */
async function getAuctionTradesManager(data) {
	let query = {};
	let query2 = {};
	let query3 = {};
	const {
		id,
		auctionId,
		payerId,
		payeeId,
		cardTypeId,
		page,
		limit,
		order,
		sort,
		createdAt,
		payer,
		payee,
		amount,
		fee,
		searchQuery,
		userId,
	} = data;

	if (id) query.id = id;
	if (userId) {
		// query = {
		// 	[postgres.Op.or]: [
		// 		{ "$payer.id$": { [postgres.Op.like]: "%" + userId + "%" } },
		// 		{ "$payee.id$": { [postgres.Op.like]: "%" + userId + "%" } },
		// 	],
		// };
		query = {
			[postgres.Op.or]: {
				payerId: postgres.User.sequelize.where(
					postgres.User.sequelize.cast(postgres.User.sequelize.col("payerId"), "varchar"),
					{ [postgres.Op.match]: "%" + userId + "%" },
				),
				payeeId: postgres.User.sequelize.where(
					postgres.User.sequelize.cast(postgres.User.sequelize.col("payeeId"), "varchar"),
					{ [postgres.Op.match]: "%" + userId + "%" },
				),
			},
		};
	}
	if (auctionId) query.auctionId = auctionId;

	if (payerId) query.payerId = payerId;

	if (payeeId) query.payeeId = payeeId;
	if (amount) query.amount = amount;

	if (payer) query2.name = { [postgres.Op.iLike]: "%" + payer + "%" };
	if (payee) query3.name = { [postgres.Op.iLike]: "%" + payee + "%" };

	if (createdAt) query.createdAt = createdAt;

	let offset = (page - 1) * limit;

	let result = await postgres.UserAuctionTrade.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				where: query2,
				model: postgres.User,
				as: "payer",
				attributes: { exclude: ["password", "salt"] },
				required: false,
			},
			{
				where: query3,
				model: postgres.User,
				as: "payee",
				attributes: { exclude: ["password", "salt"] },
				required: false,
			},
			{
				model: postgres.Auction,
				as: "auction",
				include: [
					{
						model: postgres.AssignedCard,
						include: [
							{
								model: postgres.Card,
								include: [postgres.CardType],
							},
						],
					},
				],
			},
		],
	});

	return {
		total: result?.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get auction trades list
 * @param {*} id
 */
async function getAuctionTradeManager(id) {
	let result = await postgres.UserAuctionTrade.findOne({
		where: { id },
		include: [
			{
				model: postgres.User,
				as: "payer",
				attributes: { exclude: ["password", "salt"] },
			},
			{
				model: postgres.User,
				as: "payee",
				attributes: { exclude: ["password", "salt"] },
			},
			{ model: postgres.Auction, as: "auction" },
		],
	});

	return result;
}

/**
 * get auction trades list
 * @param {*} auctionId
 * @param userId
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param sort
 */
async function getAuctionTradesUser(auctionId, userId, page, limit, order, sort) {
	let query = {
		[postgres.Op.or]: {
			payerId: userId,
			payeeId: userId,
		},
	};

	if (auctionId) query.auctionId = auctionId;

	let offset = (page - 1) * limit;

	let result = await postgres.UserAuctionTrade.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{ model: postgres.User, as: "payer", attributes: ["name", "avatar"] },
			{
				model: postgres.User,
				as: "payee",
				attributes: ["name", "avatar"],
			},
			// { model: postgres.Auction, as: "auction" },
		],
	});

	return {
		total: result?.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * get auction trades list
 * @param id
 * @param userId
 */
async function getAuctionTradeUser(id, userId) {
	let query = {
		[postgres.Op.or]: {
			payerId: { [postgres.Op.iLike]: "%" + userId + "%" },
			payeeId: { [postgres.Op.iLike]: "%" + userId + "%" },
		},
		id,
	};
	let result = await postgres.UserAuctionTrade.findAndCountAll({
		where: query,
		include: [
			{
				model: postgres.User,
				as: "payer",
				attributes: { exclude: ["password", "salt"] },
			},
			{
				model: postgres.User,
				as: "payee",
				attributes: { exclude: ["password", "salt"] },
			},
			{ model: postgres.Auction, as: "auction" },
		],
	});

	return result;
}

async function getAuctionList({ type, cardTypeId, min, max, page, limit, order, sort, chain }) {
	// return new Promise(async (resolve, reject) => {
	let offset = (page - 1) * limit;

	let orderBy = `ORDER BY auction."${sort}" ${order}`,
		condition = "";

	if (type) condition += ` AND auction."type" = ${postgres.sequelize.escape(type)}`;

	if (cardTypeId) condition += ` AND card."cardTypeId" = ${postgres.sequelize.escape(cardTypeId)}`;

	if (min || max)
		condition += ` AND auction."immediatePrice" BETWEEN ${postgres.sequelize.escape(
			min ?? 0,
		)} AND ${postgres.sequelize.escape(max ?? 0)}`;

	const today = moment();

	let query = `
			SELECT
				auction."id",
				auction."start",
				auction."end",
				auction."type",
				auction."basePrice",
				auction."immediatePrice",
				card."name",
				card."description",
				card."chain",
				card."serialNumber",
				card."edition",
				card."allowedUsageNumber",
				card."image",
				cardType."name" AS typeName,
				cardType."id" AS typeId,
				COUNT ( auctionOffer."id" ) AS "count",
				MAX ( auctionOffer.amount ) AS "max" 
			FROM
				auctions AS auction
				INNER JOIN "assignedCards" AS assignedCard ON auction."assignedCardId" = assignedCard."id"
				INNER JOIN "cards" AS card ON card."id" = assignedCard."cardId"
				INNER JOIN "cardTypes" AS cardType ON card."cardTypeId" = cardType."id"
				
				LEFT OUTER JOIN "auctionOffers" AS auctionOffer ON auction."id" = auctionOffer."auctionId" 
				AND auctionOffer.status = 'REGISTERED' 
			WHERE
				auction.status = 'ACTIVE' ${condition}  
				AND auction."deletedAt" IS NULL
                AND auction."end" >= CAST('${today}' as Date)
				AND auction."start" <= CAST('${today}' as Date)
				AND assignedCard.status = 'INAUCTION' AND card."chain" = '${chain === "BSC" ? "BSC" : "POLYGON"}'
			GROUP BY
				auction."id",
				card."image",
				card."name",
				card."description",
				card."chain",
				card."serialNumber",
				card."edition",
				card."allowedUsageNumber",
				cardType."name",
				cardType."id"
			`;

	let count = await postgres.sequelize.query(query);

	let result = await postgres.sequelize.query(
		`
				${query}
				${orderBy}
				LIMIT :limit
				OFFSET :offset
			`,
		{ replacements: { limit, offset } },
	);

	result = result.shift();

	if (chain === "ETH") {
		const BusdEthPrice = await price({
			fromToken: "USDT",
			toToken: "ETH",
			slippage: 1,
			balanceIn: 1,
			origin: "out",
		});

		for (let a of result) {
			a.stablePrice = +a.immediatePrice * +BusdEthPrice.price;
			a.stablePrice = a.stablePrice.toFixed(3);
			a.chain = "ETH";
		}
	} else if (chain === "BSC") {
		const BusdBnbPrice = await price({
			fromToken: "BUSD_BSC",
			toToken: "BNB",
			slippage: 1,
			balanceIn: 1,
			origin: "in",
		});

		for (let a of result) {
			a.stablePrice = +a.immediatePrice * +BusdBnbPrice.price;
			a.stablePrice = a.stablePrice.toFixed(3);
		}
	}

	return {
		total: count?.[0]?.length ?? 0,
		pageSize: limit,
		page,
		data: result,
	};
	// });
}

/**
 * get single auction
 * @param {*} id
 * @returns
 */
function getSingleAuction(id, chain) {
	return new Promise(async (resolve, reject) => {
		let result = await postgres.sequelize.query(`
		SELECT
			auction."id",
			auction."start",
			auction."end",
			auction."type",
			auction."basePrice",
			auction."immediatePrice",
			card."name",
			card."description",
			card."chain",
			card."serialNumber",
			card."edition",
			card."allowedUsageNumber",
			card."image",
			cardType."name" AS typeName,
			COUNT ( auctionOffer."id" ) AS "count",
			MAX ( auctionOffer.amount ) AS "max" 
		FROM
			auctions AS auction
			INNER JOIN "assignedCards" AS assignedCard ON auction."assignedCardId" = assignedCard."id"
			INNER JOIN "cards" AS card ON card."id" = assignedCard."cardId"
 			INNER JOIN "cardTypes" AS cardType ON card."cardTypeId" = cardType."id"

			LEFT OUTER JOIN "auctionOffers" AS auctionOffer ON auction."id" = auctionOffer."auctionId" 
			AND auctionOffer.status = 'REGISTERED' 
		WHERE
			auction."id" = ${postgres.sequelize.escape(
				+id,
			)} AND auction.status = 'ACTIVE' AND auction."deletedAt" IS NULL AND card."chain"='${
			chain === "BSC" ? "BSC" : "POLYGON"
		}'
		GROUP BY
			auction."id",
			card."image",
			card."name",
			card."description",
			card."chain",
			card."serialNumber",
			card."edition",
			card."allowedUsageNumber",
			cardType."name"
		`);

		result = result?.shift()?.shift();

		if (!result) return reject(new HumanError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));

		if (chain === "ETH") {
			const BusdEthPrice = await price({
				fromToken: "USDT",
				toToken: "ETH",
				slippage: 1,
				balanceIn: 1,
				origin: "out",
			});

			result.stablePrice = +result.immediatePrice * +BusdEthPrice.price;
			result.stablePrice = result.stablePrice.toFixed(3);
			result.chain = "ETH";
		} else if (chain === "BSC") {
			const BusdBnbPrice = await price({
				fromToken: "BUSD_BSC",
				toToken: "BNB",
				slippage: 1,
				balanceIn: 1,
				origin: "in",
			});

			result.stablePrice = +result.immediatePrice * +BusdBnbPrice.price;
			result.stablePrice = result.stablePrice.toFixed(3);
		}

		// if (basePrice === "usdt") {

		// result.chain = "USDT";
		// }

		return resolve(result);
	});
}

/**
 *
 * @param {object} param
 * @param {*} param.auctionId
 * @param {*} param.page
 * @param {*} param.limit
 * @param {*} param.order
 * @returns
 */
function getAuctionOfferList({ auctionId, page, limit, order }) {
	return new Promise(async (resolve, reject) => {
		let query = { auctionId, status: "REGISTERED" };

		let offset = (page - 1) * limit;

		let result = await postgres.AuctionOffer.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [["amount", order]],
			include: [{ model: postgres.User, as: "user", attributes: ["name", "avatar"] }],
		});

		resolve({
			total: result?.count,
			pageSize: limit,
			page,
			data: result.rows,
		});
	});
}

async function purchaseCard(auctionId, userId, address, io) {
	// throw new HumanError("Marketplace is under Maintained", 400);

	const currentAuction = await postgres.Auction.findOne({
		where: {
			id: auctionId,
			status: "ACTIVE",
			start: { [postgres.Op.lte]: Date.now() },
			end: { [postgres.Op.gte]: Date.now() },
		},
		include: [{ model: postgres.AssignedCard, include: [postgres.Card] }],
	});

	if (!currentAuction) throw new HumanError("auction not found", 400);

	let asset = await postgres.Asset.findOne({ where: { coin: "BUSD" } });

	const currentUser = await postgres.User.findByPk(userId);

	// const BnbUsdtPrice = await price({
	// 	fromToken: "BNB",
	// 	toToken: "USDT_BSC",
	// 	slippage: 1,
	// 	balanceIn: 1,
	// 	origin: "in",
	// });

	// const priceCoefficient = basePrice === "usdt" ? +BnbUsdtPrice.price : 1;

	let cameraPrice = currentAuction.immediatePrice;

	// if (chain === "BSC") {
	// 	if (basePrice === "USDT") {
	// 		cameraPrice = currentAuction.immediatePrice * BnbUsdtPrice.price;
	// 	} else if (basePrice === "BNB") {
	// 		cameraPrice = currentAuction.immediatePrice;
	// 	} else {
	// 		throw new HumanError("Coin not found!");
	// 	}
	// } else if (chain === "ETH") {
	// 	if (basePrice === "USDT") {
	// 		cameraPrice = currentAuction.immediatePrice * BnbUsdtPrice.price;
	// 	} else if (basePrice === "ETH") {
	// 		const EthUsdtPrice = await price({
	// 			fromToken: "ETH",
	// 			toToken: "USDT",
	// 			slippage: 1,
	// 			balanceIn: 1,
	// 			origin: "in",
	// 		});

	// 		cameraPrice = +BnbUsdtPrice.price / +EthUsdtPrice.price;
	// 	} else {
	// 		throw new HumanError("Coin not found!");
	// 	}
	// }

	let userWallet = await postgres.UserWallet.findOne({
		where: { userId, "$asset.coin$": "BUSD" },
		include: [{ model: postgres.Asset, as: "asset" }],
	});

	if (!userWallet) userWallet = await new postgres.UserWallet({ assetId: asset.id, userId: currentUser.id }).save();

	if (+userWallet.amount < cameraPrice) throw new HumanError("low wallet amount", 400);

	const currentAssignedCard = await postgres.AssignedCard.findOne({
		where: { status: "INAUCTION", id: currentAuction.assignedCardId },
	});

	if (!currentAssignedCard) throw new HumanError("this card is not for sale", 400);

	const GhostType = await postgres.CardType.findOne({
		where: { price: "0" },
	});
	if (GhostType) {
		const isThisCardGhost = await postgres.Card.findOne({
			where: {
				id: currentAssignedCard.cardId,
				cardTypeId: GhostType.id,
			},
		});
		if (isThisCardGhost) throw new HumanError("you can't buy a ghost camera", 400);
	}

	const auctionLog = await postgres.AuctionLog.create({
		auctionId,
		userId,
		address,
		assignedCardId: currentAssignedCard.id,
		cardId: currentAssignedCard.cardId,
		status: "PENDING",
	});
	const card = await postgres.Card.findOne({ where: { id: currentAssignedCard.cardId } });

	const chain = card.chain === "BSC" ? "BSC" : "ETH";

	const transaction = await postgres.sequelize.transaction();

	card.isImported = true;
	await card.save({ transaction });

	const userHasOtherCard = await postgres.AssignedCard.findAll({
		where: {
			userId: userId,
		},
		include: [
			{
				model: postgres.Card,
				where: { cardTypeId: { [postgres.Op.ne]: GhostType.id } },
				required: true,
			},
		],
	});

	try {
		await userWallet.decrement("amount", { by: +cameraPrice, transaction });

		const systemWallet = await postgres.SystemWallet.findOne({
			where: { "$asset.coin$": "BUSD" },
			include: [{ model: postgres.Asset, as: "asset" }],
		});

		await systemWallet.increment("amount", {
			by: +cameraPrice,
			transaction,
		});

		if (GhostType) {
			const ghostCards = await postgres.AssignedCard.findOne({
				where: {
					userId: userId,
				},
				include: [
					{
						model: postgres.Card,
						required: true,
						where: { cardTypeId: GhostType.id },
					},
				],
			});
			if (ghostCards) await ghostCards.destroy();
		}

		await currentAuction.update({ status: "FINISHED" }, { transaction });

		await postgres.AssignedCard.update(
			{
				type: "SOLD",
				userId: userId,
				status: "FREE",
				createdAt: Date.now(),
			},
			{
				where: {
					status: "INAUCTION",
					id: currentAuction.assignedCardId,
				},
				transaction,
			},
		);

		/*await new postgres.AssignedCard({
                            userId,
                            type: "TRANSFER",
                            cardId: currentAssignedCard.cardId,
                            status: "FREE"
                        }).save({ transaction });
                */

		await new postgres.UserAuctionTrade({
			auctionId,
			payerId: userId,
			amount: +cameraPrice,
		}).save({ transaction });

		if (process.env.NODE_ENV !== "development")
			await axios.put(
				`${walletConfig.url}/api/v1/wallet/nft`,
				{
					contractAddress:
						chain === "BSC" ? walletConfig.contractAddress : "0x60d3a554492720a11a6f63bf7d516c8a43ef8a27",
					id: currentAuction.assignedCard.card.edition,
					to: address,
					chain: chain,
				},
				{
					headers: {
						"X-API-KEY": walletConfig.apiKey,
					},
				},
			);

		await assignAttributes(userId, currentAuction.assignedCard.card, transaction);

		await transaction.commit();

		await auctionLog.update({ status: "FINISHED" });

		const cardType = await postgres.CardType.findOne({
			where: { id: currentAuction.assignedCard.card.cardTypeId },
		});

		const coolDown = cardType.coolDown;

		if (userHasOtherCard.length > 0) {
			const UserAttribute = await postgres.UserAttribute.findOne({
				where: {
					userId: userId,
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

			if (UserAttribute) {
				const newDamageAmount = parseFloat(UserAttribute.amount) - parseFloat(coolDown);
				if (newDamageAmount < 0) await UserAttribute.update({ amount: 0 });
				else await UserAttribute.decrement("amount", { by: coolDown });

				await postgres.UserAttribute.create({
					cardId: UserAttribute.cardId,
					attributeId: UserAttribute.attributeId,
					userId: userId,
					type: "FEE",
					amount: -coolDown,
					description: `Your ${UserAttribute.card.cardType?.name} damage cool down by ${coolDown} STL because you bought a ${cardType.name}`,
				});
			}
		}

		if (currentUser.referredCode) {
			const referredUser = await postgres.User.findOne({
				where: { referralCode: currentUser.referredCode, status: "ACTIVE" },
			});

			if (referredUser) {
				const referredUserAttribute = await postgres.UserAttribute.findOne({
					where: {
						userId: referredUser.id,
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
						{
							model: postgres.Card,
							required: true,
							include: [
								{
									model: postgres.CardType,
									where: { name: { [postgres.Op.ne]: "Ghost" } },
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

				if (referredUserAttribute) {
					if (referredUser.level === "AGENT") {
						await referredUserAttribute.decrement("amount", { by: coolDown });
					} else {
						const newDamageAmount = parseFloat(referredUserAttribute.amount) - parseFloat(coolDown);
						if (newDamageAmount < 0) await referredUserAttribute.update({ amount: 0 });
						else await referredUserAttribute.decrement("amount", { by: coolDown });
					}

					await postgres.UserAttribute.create({
						cardId: referredUserAttribute.cardId,
						attributeId: referredUserAttribute.attributeId,
						userId: referredUser.id,
						type: "FEE",
						amount: -coolDown,
						description: `Your ${referredUserAttribute.card.cardType.name} damage cool down by ${coolDown} STL because one of your referral bought a ${cardType.name}`,
					});
				}

				// Handle if user is agent
				if (referredUser.level === "AGENT")
					await calculateAgentFee(
						currentUser.referredCode,
						currentUser.id,
						"TICKET",
						+cameraPrice,
						auctionId,
					);

				/*if (referredUser.level === "NORMAL") {
                            await calculate5PercentReferral(
                                currentUser.referredCode,
                                currentUser.id,
                                "TICKET",
                                +currentAuction.immediatePrice,
                                auctionId,
                                0.03
                            );
                        }*/
			}
		}

		await giveUserNftHolderPlan(userId, cardType);

		// send notification to admin
		const msg = `User ${currentUser?.name || currentUser?.email || userId} purchased ${
			currentAuction.assignedCard.card.name
		} with ${+cameraPrice} ${systemWallet.asset.coin} successfully.`;

		const notif = await postgres.ManagerNotification.create({
			title: "Card Purchase",
			description: msg,
			userId: userId,
			tag: "Card Purchase",
		});

		if (io) {
			io.to(`Manager`).emit("notification", JSON.stringify(notif));

			io.to(`UserId:${userId}`).emit("wallet", JSON.stringify(userWallet));
		}

		await postgres.UserNotification.create({
			title: "Camera Purchase",
			description: `You buy camera ${currentAuction.assignedCard.card.name} just now.`,
			userId: userId,
		});

		sendPushToToken(
			currentUser,
			{},
			{
				title: "Camera purchase",
				body: `You buy camera ${currentAuction.assignedCard.card.name} just now.`,
			},
		);
	} catch (error) {
		await transaction.rollback();
		await auctionLog.update({ status: "FAILED" });

		console.log(error);
		throw error;
	}

	return "Successful";
}

function assignAttributes(userId, card, transaction) {
	return new Promise(async (resolve, reject) => {
		try {
			let attributes = await postgres.Attribute.findAll({
				where: {
					cardTypeId: card.cardTypeId,
					type: "INITIAL",
					status: "ACTIVE",
				},
			});

			for (const attribute of attributes) {
				await postgres.UserAttribute.create(
					{
						userId,
						cardId: card.id,
						attributeId: attribute.id,
						amount: attribute.amount,
					},
					{ transaction },
				);
			}

			return resolve();
		} catch (error) {
			return reject(error);
		}
	});
}

// Get all Auctions new
async function getAllAuctions({ page, limit, order, sort }) {
	const offset = (page - 1) * limit;
	const query = {
		status: "ACTIVE",
		start: { [postgres.Op.lte]: Date.now() },
		end: { [postgres.Op.gte]: Date.now() },
	};

	const result = await postgres.Auction.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.AssignedCard,
				include: [
					{
						model: postgres.Card,
						include: [
							{
								model: postgres.CardType,
							},
						],
					},
				],
			},
		],
	});

	return {
		total: result?.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

async function getAuctionLog(id) {
	return new Promise(async (resolve, reject) => {
		const auctionLog = await postgres.AuctionLog.findByPk(id, {
			include: [
				{
					model: postgres.User,
					attributes: ["id", "name", "email", "mobile", "level", "address", "avatar"],
				},
				postgres.Auction,
				postgres.AssignedCard,
				{ model: postgres.Card, include: postgres.CardType },
			],
		});

		if (!auctionLog) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(auctionLog);
	});
}

async function getAuctionLogs(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, searchQuery } = data;

		const query = {};
		const offset = (page - 1) * limit;

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
			];
		}

		const items = await postgres.AuctionLog.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [
				{
					model: postgres.User,
					attributes: ["id", "name", "email", "mobile", "level", "address", "avatar"],
				},
				postgres.Auction,
				postgres.AssignedCard,
				{ model: postgres.Card, include: postgres.CardType },
			],
		});

		resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		});
		return resolve(items);
	});
}

async function price(data) {
	const { fromToken, toToken, slippage, balanceIn, origin } = data;
	if (process.env.NODE_ENV === "development") {
		return { price: 240 };
	}
	try {
		const p = "/api/v1/wallet/swap/price";
		const result = await httpRequest(p, { fromToken, toToken, slippage, balanceIn, origin });
		return { price: parseFloat(result.data.price) };
	} catch (e) {
		console.log(e);
		throw new HumanError("Please try again later", 400);
	}
}

module.exports = {
	getAll,
	getOne,
	addAuctionManager,
	add,
	edit,
	editAuctionManager,
	del,
	delAuctionManager,
	getOffers,
	getOffersManager,
	getOffer,
	addOffers,
	editOffers,
	deleteOffers,
	deleteOffersManager,
	getAuctionTradesManager,
	getAuctionTradeManager,
	getAuctionTradesUser,
	getAuctionTradeUser,
	getAuctionList,
	getAuctionOfferList,
	getSingleAuction,
	getUserAuctions,
	getUserAuction,
	purchaseCard,
	getAllAuctions,
	getAuctionLog,
	getAuctionLogs,
	assignAttributes,
};
