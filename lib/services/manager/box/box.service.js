const { default: axios } = require("axios");
const { postgres } = require("../../../databases");
const { dateQueryBuilder } = require("../../../utils/dateQueryBuilder");
const { NotFoundError, HumanError, ConflictError } = require("../../errorhandler");
const Errors = require("../../errorhandler/MessageText");
const { sendPushToToken } = require("../../notification.service");

const baseUrl = require("config").get("files.S3.url");

const cardTypeNames = ["toxera", "stamera", "pictomera", "oblera", "mozitera", "diadora", "contera", "vistera"];

const walletConfig = require("config").get("clients.wallet");

async function addBox(data) {
	const transaction = await postgres.sequelize.transaction();
	try {
		const { name, initialNumber, price, assetId, level } = data;

		const asset = await postgres.Asset.findOne({ where: { id: assetId }, raw: true });
		if (!asset) throw new NotFoundError("Asset not found", 1016);

		let image;
		if (level === 1) image = generateImageUrl("Pictomera");
		if (level === 2) image = generateImageUrl("Diadora");
		if (level === 3) image = generateImageUrl("Mozitera");
		if (level === 4) image = generateImageUrl("Vistera");
		if (level === 5) image = generateImageUrl("Stamera");
		if (level === 10) image = generateImageUrl("Oblera");
		if (level === 20) image = generateImageUrl("toxera");

		// if (image === -1) throw new NotFoundError("There is no image associated with current card type.", 400);

		// find last index of current type box to set name correctly [x]
		const lastInsertedBox = await postgres.Box.findOne({
			where: { level },
			order: [["id", "DESC"]],
			limit: 1,
		});

		let startCounter = lastInsertedBox ? Number(lastInsertedBox.id) + 1 : 1;

		let boxes = [];
		for (let i = 0; i < initialNumber; i++) {
			/*let image = generateImageUrl(
				generateRandom(["Pictomera", "Diadora", "Mozitera", "Vistera", "Stamera", "Oblera", "toxera"]),
			);*/

			boxes[i] = {
				image,
				name: `${name} ${level}x #${startCounter}`,
				batteryAmount: 0,
				negativeAmount: 0,
				referralCount: 0,
				cardId: null,
				lensId: null,
				level,
			};

			startCounter++;
		}

		boxes = shuffleArray(boxes);

		const createdBoxes = await postgres.Box.bulkCreate(boxes, { transaction });

		const boxAuctions = [];
		for (let i = 0; i < createdBoxes.length; i++) {
			boxAuctions.push({
				boxId: createdBoxes[i].id,
				price: price,
				assetId,
			});
		}

		await postgres.BoxAuction.bulkCreate(boxAuctions, { transaction });
		await transaction.commit();

		return {
			createdBoxes,
		};
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

const shuffleArray = (array) => {
	for (let i = array.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[array[i], array[j]] = [array[j], array[i]];
	}

	return array;
};

const generateImageUrl = (cardTypeName) => {
	const imageNameIndex = cardTypeNames.findIndex((typeName) => typeName === cardTypeName.toLowerCase());
	if (imageNameIndex === -1) {
		return -1;
	}

	const imageName = cardTypeNames[imageNameIndex];

	const url = [
		{
			key: `nft/box/${imageName}.jpg`,
			name: `${imageName}.jpg`,
			location: `${baseUrl}nft/box/${imageName}.jpg`,
		},
	];

	return url;
};

async function calculateAttributes(level) {
	const boxSettings = await postgres.BoxSetting.findAll({ where: { level: level }, raw: true });

	const settings = {
		battery: boxSettings.find((setting) => setting.type === "BATTERY"),
		negative: boxSettings.find((setting) => setting.type === "NEGATIVE"),
	};

	const batteryAmounts = settings.battery.amounts;
	const negativeAmounts = settings.negative.amounts;

	return {
		batteryAmount: generateRandom(batteryAmounts, 5),
		negativeAmount: generateRandom(negativeAmounts, 5),
	};
}

const generateRandom = (array, tryCount) => {
	let random_number = randomNumber(0, array.length);

	/*if (array[random_number] === 0 && tryCount > 0)
                  return generateRandom(array, --tryCount);
          */
	return array[random_number];
};

const randomNumber = (min, max) => {
	return Math.floor(Math.random() * (max - min) + min);
};

const calculateNft = async (cardTypeId, transaction) => {
	return new Promise(async (resolve, reject) => {
		try {
			const assignedCard = await postgres.AssignedCard.findOne({
				where: { status: "INAUCTION", userId: null, "$card.cardTypeId$": cardTypeId },
				include: postgres.Card,
			});

			const cardId = assignedCard ? assignedCard.cardId : null;

			if (cardId) await assignedCard.update({ status: "IN_BOX" }, { transaction });

			return resolve({ cardId });
		} catch (e) {
			// console.log(e);
			return reject(e);
		}
	});
};

const calculateLens = (useless, transaction) => {
	return new Promise(async (resolve, reject) => {
		try {
			const lens = await postgres.Lens.findOne({
				where: { status: "IN_AUCTION" },
			});

			const lensId = lens ? lens.id : null;

			if (lensId) {
				await lens.update({ status: "IN_BOX" }, { transaction });
				await postgres.LensAuction.update({ status: "FINISHED" }, { where: { lensId }, transaction });
			}

			return resolve({ lensId });
		} catch (e) {
			return reject(e);
		}
	});
};

function editBox(data) {
	return new Promise(async (resolve, reject) => {
		try {
			const { id, name, price, assetId } = data;

			const box = await postgres.Box.findOne({ where: { id } });

			if (!box) {
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
			}

			if (box.status !== "IN_AUCTION") {
				return reject(
					new ConflictError(
						Errors.BOX_ALREADY_HAS_BEEN_TRADED.MESSAGE,
						Errors.BOX_ALREADY_HAS_BEEN_TRADED.CODE,
					),
				);
			}

			const auction = await postgres.BoxAuction.findOne({ where: { boxId: id } });

			if (name) {
				const existBox = await postgres.Box.findOne({ where: { name, id: { [postgres.Op.ne]: id } } });
				if (existBox) {
					return reject(
						new ConflictError(Errors.DUPLICATE_DATA.MESSAGE, Errors.DUPLICATE_DATA.CODE, { name }),
					);
				}

				await box.update({ name });
			}

			if (price) {
				await auction.update({ price });
			}

			if (assetId) {
				const asset = await postgres.Asset.findOne({ where: { id: assetId }, raw: true });
				if (!asset) {
					return reject(
						new NotFoundError(Errors.ASSET_NOT_FOUND.MESSAGE, Errors.ASSET_NOT_FOUND.CODE, {
							assetId,
						}),
					);
				}
				await auction.update({ assetId });
			}

			return resolve("Successful");
		} catch (error) {
			return reject(error);
		}
	});
}

function deleteBox(data) {
	return new Promise(async (resolve, reject) => {
		try {
			const { id } = data;

			const box = await postgres.Box.findOne({ where: { id } });

			if (!box) {
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
			}

			if (box.status !== "IN_AUCTION") {
				return reject(
					new ConflictError(
						Errors.BOX_ALREADY_HAS_BEEN_TRADED.MESSAGE,
						Errors.BOX_ALREADY_HAS_BEEN_TRADED.CODE,
					),
				);
			}

			if (box.cardId) {
				await postgres.AssignedCard.update(
					{ status: "FREE", type: "TRANSFER" },
					{ where: { cardId: box.cardId } },
				);
			}

			// if (box.lensId) {
			// }

			const auction = await postgres.BoxAuction.findOne({ where: { boxId: id } });

			await box.destroy();
			await auction.destroy();

			return resolve("Successful");
		} catch (error) {
			return reject(error);
		}
	});
}

/* ----------------- BOX SETTINGS ----------------- */

async function addBoxSetting(data) {
	const { name, type, amounts, level } = data;

	const existBoxSetting = await postgres.BoxSetting.findOne({
		where: { level, type },
		raw: true,
	});

	if (existBoxSetting) {
		throw new HumanError(Errors.DUPLICATE_DATA.MESSAGE, Errors.DUPLICATE_DATA.CODE, { level, type });
	}

	const newBoxSetting = await new postgres.BoxSetting({ name, type, amounts, level }).save();
	if (!newBoxSetting) {
		throw new HumanError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE);
	}

	return "Success";
}

function editBoxSetting(data, files) {
	return new Promise(async (resolve, reject) => {
		const { id, name, type, amounts, level } = data;

		const currentBoxSetting = await postgres.BoxSetting.findOne({ where: { id } });

		if (!currentBoxSetting) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		const existBoxSetting = await postgres.BoxSetting.findOne({
			where: { level, type, id: { [postgres.Op.ne]: id } },
			raw: true,
		});

		if (existBoxSetting) {
			return reject(
				new HumanError(Errors.DUPLICATE_DATA.MESSAGE, Errors.DUPLICATE_DATA.CODE, { level, name, type }),
			);
		}

		const updateData = {};

		if (name) {
			updateData.name = name;
		}

		if (type) {
			updateData.type = type;
		}

		if (amounts && amounts.length > 0) {
			updateData.amounts = amounts;
		}

		if (level) {
			updateData.level = level;
		}

		await currentBoxSetting.update(updateData);

		return resolve("Success");
	});
}

function deleteBoxSetting(data) {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentBoxSetting = await postgres.BoxSetting.findOne({ where: { id } });
		if (!currentBoxSetting) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		await currentBoxSetting.destroy();

		return resolve("Successful");
	});
}

function getBoxSettingByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentBoxSetting = await postgres.BoxSetting.findOne({
			where: { id },
			include: { model: postgres.CardType, attributes: ["id", "name", "image"] },
			nest: true,
			raw: true,
		});
		if (!currentBoxSetting) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentBoxSetting);
	});
}

async function getBoxSettingsByManager(data) {
	const { page, limit, sort, order, createdAt, id, searchQuery, name, type, cardTypeId, level } = data;

	const query = {};
	const offset = (page - 1) * limit;

	if (id) query.id = id;
	if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };
	if (type && type.length > 0) query.type = { [postgres.Op.in]: type };
	if (cardTypeId && cardTypeId.length > 0) query.cardTypeId = { [postgres.Op.in]: cardTypeId };
	if (level) query.level = level;

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (searchQuery) {
		query[postgres.Op.or] = [
			{
				id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
					[postgres.Op.iLike]: `%${searchQuery}%`,
				}),
			},
			{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ type: { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}
	const items = await postgres.BoxSetting.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: { model: postgres.CardType, attributes: ["id", "name", "image"] },
		nest: true,
		raw: true,
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
}

// User Box (Self)
function getUserBox(data, user) {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const currentUserBox = await postgres.UserBox.findOne({
			where: { id, userId: user.id },
			include: [
				{
					model: postgres.Box,
					include: [postgres.Card, { model: postgres.CardType, attributes: ["id", "name", "image"] }],
				},
				{ model: postgres.BoxAuction },
			],
			// nest: true,
			// raw: true,
		});
		if (!currentUserBox) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentUserBox);
	});
}

async function getUserBoxes(data, user) {
	const { page, limit, sort, order, createdAt, id, searchQuery, name, level } = data;

	const query = { userId: user.id };

	const offset = (page - 1) * limit;

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (searchQuery) {
		query[postgres.Op.or] = [
			{
				id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
					[postgres.Op.iLike]: `%${searchQuery}%`,
				}),
			},
			{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ type: { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}

	if (id)
		query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
			[postgres.Op.iLike]: `%${searchQuery}%`,
		});
	if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };
	if (level) query["$box.level$"] = level;

	const items = await postgres.UserBox.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
		include: [
			{
				model: postgres.Box,
				paranoid: false,
				include: [
					{
						model: postgres.Card,
						include: [
							{
								model: postgres.CardType,
								attributes: ["id", "name", "image"],
							},
						],
					},
					{
						model: postgres.Lens,
					},
				],
			},
			{ model: postgres.BoxAuction, paranoid: false },
		],
		//[postgres.Card, {model: postgres.CardType, attributes: ["id", "name", "image"] }]
		// nest: true,
		// raw: true,
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
}

// User Boxes (manager)
async function getUserBoxByManager(data) {
	const { userId } = data;

	const currentUserBox = await postgres.UserBox.findAll({
		where: { userId: userId },
		attributes: { exclude: ["deletedAt", "updatedAt"] },
		include: [
			{
				model: postgres.Box,
				include: [
					postgres.Card,
					{
						model: postgres.CardType,
						attributes: ["id", "name", "image"],
					},
				],
			},
			{
				model: postgres.BoxAuction,
			},
			{
				model: postgres.User,
				attributes: ["id", "name", "avatar", "email"],
			},
		],
	});

	return currentUserBox;
}

async function createUserBoxesByManager(data) {
	const { userId, level } = data;

	const assignedCards = await postgres.AssignedCard.findOne({
		where: {
			userId: userId,
		},
		include: [
			{
				model: postgres.Card,
				required: true,
			},
		],
	});

	if (!assignedCards) throw new HumanError("This user doesn't have any camera", 400);

	const boxAuction = await postgres.BoxAuction.findOne({
		where: {
			status: "ACTIVE",
		},
		include: [
			{
				model: postgres.Box,
				where: {
					status: "IN_AUCTION",
					level: level,
				},
				required: true,
			},
		],
	});

	if (!boxAuction) throw new HumanError("There is no box with this camera type", 400);

	await postgres.UserBox.create({
		userId: userId,
		boxId: boxAuction.box.id,
		boxAuctionId: boxAuction.id,
		isOpened: false,
		isGift: true,
	});

	await postgres.BoxAuction.update(
		{
			status: "FINISHED",
		},
		{
			where: {
				id: boxAuction.id,
			},
		},
	);

	await postgres.Box.update(
		{
			status: "SOLD",
		},
		{
			where: {
				id: boxAuction.box.id,
			},
		},
	);

	await postgres.UserNotification.create({
		title: "Box gift",
		description: `You received a box as a gift just now.`,
		userId: data.userId,
	});

	const user = await postgres.User.findOne({
		where: {
			id: data.userId,
		},
	});

	sendPushToToken(
		user,
		{},
		{
			title: "Box gift",
			body: `You received a box as a gift just now`,
		},
	);

	return "success";
}

function getUserBoxesByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, name, type, userId } = data;

		const query = {};

		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: { [postgres.Op.iLike]: `%${searchQuery}%` },
				},
				{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ type: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (id) query.id = { [postgres.Op.iLike]: `%${searchQuery}%` };

		if (name && name.length > 0) query.name = { [postgres.Op.in]: name };
		if (type && type.length > 0) query.type = { [postgres.Op.in]: type };
		if (userId) query.userId = userId;

		const items = await postgres.UserBox.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			attributes: { exclude: ["updatedAt", "deletedAt"] },
			include: [
				{
					model: postgres.Box,
					attributes: { exclude: ["megaPixelAmount", "damageAmount", "updatedAt", "deletedAt"] },
					include: [
						postgres.Card,
						{
							model: postgres.CardType,
							attributes: ["id", "name", "image"],
						},
					],
				},
				{
					model: postgres.BoxAuction,
					attributes: { exclude: ["updatedAt", "deletedAt"] },
				},
				{
					model: postgres.User,
					attributes: ["id", "name", "avatar", "email"],
				},
			],
			// nest: true,
			// raw: true,
		});

		return resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		});
	});
}

// Box Auction
async function getBoxAuction(data) {
	const { id } = data;
	const auction = await postgres.BoxAuction.findOne({
		where: { id, status: "ACTIVE" },
		attributes: { exclude: ["boxId", "deletedAt", "updatedAt"] },
		include: [
			{
				model: postgres.Box,
				attributes: ["id", "name", "image", "level"],
			},
			{
				model: postgres.Asset,
				attributes: ["id", "coin", "name", "icon", "createdAt"],
			},
		],
	});
	if (!auction) throw new NotFoundError(Errors.AUCTION_NOT_FOUND.MESSAGE, Errors.AUCTION_NOT_FOUND.CODE, { id });

	return auction;
}

async function getBoxAuctions(data, user) {
	const { page, limit, sort, order, cardTypeId, min, max } = data;

	const query = { status: "ACTIVE", price: { [postgres.Op.gte]: min, [postgres.Op.lte]: max } };

	const offset = (page - 1) * limit;

	if (cardTypeId) query["$box.cardTypeId$"] = cardTypeId;

	const items = await postgres.BoxAuction.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.Box,
				attributes: ["id", "name", "image", "cardTypeId"],
				include: [{ model: postgres.CardType }],
			},
			postgres.Asset,
		],
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
}

function getBoxAuctionByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const auction = await postgres.BoxAuction.findOne({
			where: { id },
			include: [
				{
					model: postgres.Box,
					include: [
						{ model: postgres.CardType },
						{ model: postgres.Card, required: false },
						{ model: postgres.Lens, required: false },
					],
				},
				postgres.Asset,
			],
			// nest: true,
			// raw: true,
		});
		if (!auction) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(auction);
	});
}

async function getBoxAuctionsByManager(data) {
	const {
		page,
		limit,
		sort,
		order,
		createdAt,
		id,
		searchQuery,
		name,
		cardType,
		cardTypeId,
		level,
		asset,
		status,
		price,
	} = data;

	const query = {};
	const query2 = {};

	const offset = (page - 1) * limit;

	if (id) query.id = id;
	if (parseFloat(price) > 0) query.price = price;
	if (name) query["$box.name$"] = { [postgres.Op.in]: name };
	if (asset) query["$asset.name$"] = { [postgres.Op.iLike]: "%" + asset + "%" };
	if (status) query.status = { [postgres.Op.in]: status };
	if (cardType) query["$cardType.name$"] = { [postgres.Op.in]: cardType };
	if (cardTypeId && cardTypeId.length > 0) query["$box.cardTypeId$"] = { [postgres.Op.in]: cardTypeId };
	if (level) query2.level = level;

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (searchQuery) {
		query[postgres.Op.or] = [
			{
				id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
					[postgres.Op.iLike]: `%${searchQuery}%`,
				}),
			},
			{ "$box.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ "$box.cardType.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}
	const items = await postgres.BoxAuction.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.Box,
				query2,
				include: [
					{ model: postgres.CardType },
					{ model: postgres.Card, required: false },
					{ model: postgres.Lens, required: false },
				],
			},
			postgres.Asset,
		],
		// nest: true,
		// raw: true,
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
}

function getBoxByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const box = await postgres.Box.findOne({
			where: { id: id },
			include: [
				{ model: postgres.CardType },
				{ model: postgres.Card, required: false },
				{ model: postgres.Lens, required: false },
			],
			// nest: true,
			// raw: true,
		});
		if (!box) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(box);
	});
}

async function getBoxesByManager(data, user) {
	const {
		page,
		limit,
		sort,
		order,
		createdAt,
		id,
		searchQuery,
		name,
		cardType,
		cardTypeId,
		status,
		batteryAmount,
		negativeAmount,
		referralCount,
		stlReward,
		levelUp,
		level,
		damageCoolDown,
	} = data;

	const query = {};

	const offset = (page - 1) * limit;

	if (id) query.id = id;
	if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };
	if (parseFloat(batteryAmount) >= 0) query.batteryAmount = batteryAmount;
	if (parseFloat(negativeAmount) >= 0) query.negativeAmount = negativeAmount;
	if (parseFloat(referralCount) >= 0) query.referralCount = referralCount;
	if (parseFloat(stlReward) >= 0) query.stlReward = stlReward;
	if (parseFloat(levelUp) >= 0) query.levelUp = levelUp;
	if (parseFloat(damageCoolDown) >= 0) query.damageCoolDown = damageCoolDown;
	if (level) query.level = { [postgres.Op.in]: level };

	if (status) query.status = { [postgres.Op.in]: status };
	if (cardType) query["$cardType.name$"] = { [postgres.Op.in]: cardType };
	if (cardTypeId && cardTypeId.length > 0) query["$box.cardTypeId$"] = { [postgres.Op.in]: cardTypeId };

	if (createdAt) {
		const { start, end } = dateQueryBuilder(createdAt);
		query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
	}

	if (searchQuery) {
		query[postgres.Op.or] = [
			{
				id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
					[postgres.Op.iLike]: `%${searchQuery}%`,
				}),
			},
			{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ "$cardType.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}
	const items = await postgres.Box.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{ model: postgres.CardType },
			{ model: postgres.Card, required: false },
			{ model: postgres.Lens, required: false },
		],
		// nest: true,
		// raw: true,
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
	// return (items);
}

// Box Trade
function getBoxTradeByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const trade = await postgres.BoxTrade.findOne({
			where: { id },
			include: [
				{
					model: postgres.BoxAuction,
					include: [
						{
							model: postgres.Box,
							include: [
								{ model: postgres.CardType },
								{ model: postgres.Card, required: false },
								{ model: postgres.Lens, required: false },
							],
						},
					],
				},
				{ model: postgres.User, attributes: ["id", "name", "avatar", "email"] },
			],
			// nest: true,
			// raw: true,
		});
		if (!trade) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(trade);
	});
}

function getBoxTradesByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, name, cardType, cardTypeId } = data;

		const query = {};

		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ "$cardType.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${searchQuery}%`,
			});
		if (name) query.name = { [postgres.Op.in]: name };
		if (cardType) query["$cardType.name$"] = { [postgres.Op.in]: cardType };
		if (cardTypeId && cardTypeId.length > 0) query["$box.cardTypeId$"] = { [postgres.Op.in]: cardTypeId };

		const items = await postgres.BoxTrade.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [
				{
					model: postgres.BoxAuction,
					include: [
						{
							model: postgres.Box,
							include: [
								{ model: postgres.CardType },
								{ model: postgres.Card, required: false },
								{ model: postgres.Lens, required: false },
							],
						},
					],
				},
				{ model: postgres.User, attributes: ["id", "name", "avatar", "email"] },
			],
			// nest: true,
			// raw: true,
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

async function purchaseBox(data, userId, io) {
	const transaction = await postgres.sequelize.transaction();
	try {
		const { boxAuctionId } = data;

		// find auction
		const auction = await postgres.BoxAuction.findOne({
			where: { id: boxAuctionId },
			include: [
				{
					model: postgres.Box,
					where: { status: "IN_AUCTION" },
					include: [postgres.Card, postgres.Lens],
				},
				postgres.Asset,
			],
		});

		if (!auction) throw new HumanError(Errors.AUCTION_NOT_FOUND.MESSAGE, 404);
		// , status: "ACTIVE"
		if (auction.status !== "ACTIVE") throw new HumanError("This box has been sold!", 400);

		// check if user have any nft's with current box card type
		const userAssginedCard = await postgres.AssignedCard.findOne({
			where: { userId: userId },
			include: [
				{
					model: postgres.Card,
					required: true,
				},
			],
		});

		if (!userAssginedCard) throw new HumanError("You don't have any camera.", 400);

		// check user wallet
		let wallet = await postgres.UserWallet.findOne({
			where: { userId, assetId: auction.assetId },
			include: { model: postgres.Asset, as: "asset" },
		});

		if (!wallet) wallet = await postgres.UserWallet.create({ userId, assetId: auction.assetId });

		if (+wallet.amount < +auction.price) throw new HumanError("Wallet is low!", 400);

		const box = auction.box;

		if (box.level === 20) {
			const cooldownSetting = await postgres.Settings.findOne({
				where: {
					type: "COOLDOWN",
					key: "purchase_limit",
				},
				raw: true,
			});

			const cooldownPurchaseLimit = cooldownSetting.value;

			const userBoxes = await postgres.UserBox.count({
				where: {userId: userId},
				include: [
					{
						model: postgres.Box,
						where: {
							level: 20,
						},
						required: true,
					},
				],
			});

			if (parseInt(userBoxes) >= parseInt(cooldownPurchaseLimit)) {
				throw new HumanError("You cannot purchase more cooldown boxes", 400);
			}
		}

		const referralRandom = generateRandomFloat(0, 10);

		let referralCount = 0;

		if (referralRandom >= 4.5 && referralRandom < 10) referralCount = Math.floor(Math.random() * (5 - 3) + 3);

		// let boxConfig = {};
		// let cardInBox = null;
		/*
                if (box.level === 1) {
                  // attribute

                  let attributes = await calculateAttributes(box.level);

                  boxConfig = {
                    batteryAmount: attributes.batteryAmount,
                    negativeAmount: attributes.negativeAmount,
                    referralCount: referralCount,
                    cardId: null,
                    lensId: null,
                    status: "SOLD",
                  };

                  await assignBoxAttributeToUser(userId, attributes.batteryAmount, attributes.negativeAmount, transaction);
                }
                else if (box.level === 2) {
                  const boxRandom = generateRandomFloat(0, 10);

                  if (boxRandom < 2) {
                    // fisheye lens
                    const lensInBox = await calculateLensPrize(userId, "Fisheye", transaction);

                    boxConfig = {
                      batteryAmount: 0,
                      negativeAmount: 0,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: lensInBox.id,
                      status: "SOLD",
                    };
                  } else {
                    // attribute
                    let attributes = await calculateAttributes(box.level);

                    boxConfig = {
                      batteryAmount: attributes.batteryAmount,
                      negativeAmount: attributes.negativeAmount,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: null,
                      status: "SOLD",
                    };

                    await assignBoxAttributeToUser(
                      userId,
                      attributes.batteryAmount,
                      attributes.negativeAmount,
                      transaction,
                    );
                  }
                }
                else if (box.level === 3) {
                  const boxRandom = generateRandomFloat(0, 10);

                  if (boxRandom < 2) {
                    // Wide angle lens
                    const lensInBox = await calculateLensPrize(userId, "Wideangle", transaction);

                    boxConfig = {
                      batteryAmount: 0,
                      negativeAmount: 0,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: lensInBox.id,
                      status: "SOLD",
                    };
                  } else {
                    // attribute
                    let attributes = await calculateAttributes(box.level);

                    boxConfig = {
                      batteryAmount: attributes.batteryAmount,
                      negativeAmount: attributes.negativeAmount,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: null,
                      status: "SOLD",
                    };

                    await assignBoxAttributeToUser(
                      userId,
                      attributes.batteryAmount,
                      attributes.negativeAmount,
                      transaction,
                    );
                  }
                }
                else if (box.level === 4 || box.level === 5) {
                  const boxRandom = generateRandomFloat(0, 10);

                  if (boxRandom < 2) {
                    // Standard lens
                    const lensInBox = await calculateLensPrize(userId, "Standard", transaction);

                    boxConfig = {
                      batteryAmount: 0,
                      negativeAmount: 0,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: lensInBox.id,
                      status: "SOLD",
                    };
                  } else {
                    // attribute
                    let attributes = await calculateAttributes(box.level);

                    boxConfig = {
                      batteryAmount: attributes.batteryAmount,
                      negativeAmount: attributes.negativeAmount,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: null,
                      status: "SOLD",
                    };

                    await assignBoxAttributeToUser(
                      userId,
                      attributes.batteryAmount,
                      attributes.negativeAmount,
                      transaction,
                    );
                  }
                }
                else if (box.level === 10) {
                  let boxRandom = generateRandomFloat(0, 10);
                  if (boxRandom < 0.1) {
                    //camera
                    cardInBox = await calculateCardPrize(userId, transaction);

                    boxConfig = {
                      batteryAmount: 0,
                      negativeAmount: 0,
                      referralCount: referralCount,
                      cardId: cardInBox.cardId,
                      lensId: null,
                      status: "SOLD",
                    };
                  } else if (boxRandom < 1) {
                    //macro lens
                    const lensInBox = await calculateLensPrize(userId, "Macro", transaction);

                    boxConfig = {
                      batteryAmount: 0,
                      negativeAmount: 0,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: lensInBox.id,
                      status: "SOLD",
                    };
                  } /!*todo else if(boxRandom < 2) {
                            //stl reward

                        } else if(boxRandom < 4){
                            // damage cool down
                        } else if(boxRandom < 5){
                            // level up
                        }*!/ else {
                    // attribute
                    let attributes = await calculateAttributes(box.level);

                    boxConfig = {
                      batteryAmount: attributes.batteryAmount,
                      negativeAmount: attributes.negativeAmount,
                      referralCount: referralCount,
                      cardId: null,
                      lensId: null,
                      status: "SOLD",
                    };

                    await assignBoxAttributeToUser(
                      userId,
                      attributes.batteryAmount,
                      attributes.negativeAmount,
                      transaction,
                    );
                  }
                } else {
                  throw new HumanError("Your box is not available!", 400);
                }*/

		await postgres.BoxTrade.create(
			{ userId: userId, boxAuctionId: auction.id, amount: auction.price },
			{ transaction },
		);

		/*	if (referralCount > 0)
                await postgres.User.increment("referralCodeCount", {
                  by: referralCount,
                  where: { id: userId },
                  transaction: transaction,
                });*/

		await auction.update({ status: "FINISHED" }, { transaction });

		await postgres.Box.update({ status: "SOLD" }, { where: { id: box.id }, transaction });

		await wallet.decrement("amount", { by: +auction.price, transaction });

		await postgres.UserBox.create(
			{
				userId,
				boxAuctionId: auction.id,
				boxId: box.id,
				isOpened: false,
				isGift: false,
			},
			{ transaction },
		);

		await transaction.commit();

		await postgres.ManagerNotification.create({
			title: `User ${userId} purchase a box successfully.`,
			userId: userId,
			tag: "box",
		});

		/*if (io)
                        io.to(`Manager`).emit("notification", JSON.stringify(notif));
            */

		let newBox = await postgres.Box.findOne({
			where: { id: box.id },
			include: [
				{
					model: postgres.UserBox,
					required: true,
				},
			],
		});

		return newBox;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

async function OpenGiftBox(data, userId) {
	const transaction = await postgres.sequelize.transaction();
	try {
		const { boxAuctionId, cardId } = data;

		// find auction
		const auction = await postgres.BoxAuction.findOne({
			where: { id: boxAuctionId },
			include: [
				{
					model: postgres.Box,
					where: { status: "SOLD" },
					include: [postgres.Card, postgres.Lens],
				},
				postgres.Asset,
			],
		});

		if (!auction) throw new NotFoundError(Errors.AUCTION_NOT_FOUND.MESSAGE, 400);

		const box = auction.box;

		const userBox = await postgres.UserBox.findOne({
			where: {
				userId: userId,
				boxAuctionId: auction.id,
				boxId: box.id,
			},
			transaction,
		});

		if (!userBox) throw new HumanError("This box does not exist", 400);

		if (userBox.isOpened !== false) throw new HumanError("This box opened before", 400);

		const referralRandom = generateRandomFloat(0, 10);

		let referralCount = 0;

		if (referralRandom >= 4.5 && referralRandom < 10) referralCount = Math.floor(Math.random() * (5 - 3) + 3);

		let boxConfig = {};
		let cardInBox = null;

		if (box.level === 1) {
			// attribute

			let attributes = await calculateAttributes(box.level);

			boxConfig = {
				batteryAmount: attributes.batteryAmount,
				negativeAmount: attributes.negativeAmount,
				referralCount: referralCount,
				cardId: null,
				lensId: null,
				status: "SOLD",
			};

			await assignBoxAttributeToUser(
				userId,
				attributes.batteryAmount,
				attributes.negativeAmount,
				cardId,
				transaction,
			);
		} else if (box.level === 2) {
			const boxRandom = generateRandomFloat(0, 10);

			if (boxRandom < 2) {
				// fisheye lens
				const lensInBox = await calculateLensPrize(userId, "FISHEYE", transaction);
				if (lensInBox === false) throw new HumanError("Please try again!", 400);

				boxConfig = {
					batteryAmount: 0,
					negativeAmount: 0,
					referralCount: referralCount,
					cardId: null,
					lensId: lensInBox.id,
					status: "SOLD",
				};
			} else {
				// attribute
				let attributes = await calculateAttributes(box.level);

				boxConfig = {
					batteryAmount: attributes.batteryAmount,
					negativeAmount: attributes.negativeAmount,
					referralCount: referralCount,
					cardId: null,
					lensId: null,
					status: "SOLD",
				};

				await assignBoxAttributeToUser(
					userId,
					attributes.batteryAmount,
					attributes.negativeAmount,
					cardId,
					transaction,
				);
			}
		} else if (box.level === 3) {
			const boxRandom = generateRandomFloat(0, 10);

			if (boxRandom < 2) {
				// Wide angle lens
				const lensInBox = await calculateLensPrize(userId, "WIDEANGLE", transaction);
				if (lensInBox === false) throw new HumanError("Please try again!", 400);

				boxConfig = {
					batteryAmount: 0,
					negativeAmount: 0,
					referralCount: referralCount,
					cardId: null,
					lensId: lensInBox.id,
					status: "SOLD",
				};
			} else {
				// attribute
				let attributes = await calculateAttributes(box.level);

				boxConfig = {
					batteryAmount: attributes.batteryAmount,
					negativeAmount: attributes.negativeAmount,
					referralCount: referralCount,
					cardId: null,
					lensId: null,
					status: "SOLD",
				};

				await assignBoxAttributeToUser(
					userId,
					attributes.batteryAmount,
					attributes.negativeAmount,
					cardId,
					transaction,
				);
			}
		} else if (box.level === 4 || box.level === 5) {
			const boxRandom = generateRandomFloat(0, 10);

			if (boxRandom < 2) {
				// Standard lens
				const lensInBox = await calculateLensPrize(userId, "STANDARD", transaction);
				if (lensInBox === false) throw new HumanError("Please try again!", 400);

				boxConfig = {
					batteryAmount: 0,
					negativeAmount: 0,
					referralCount: referralCount,
					cardId: null,
					lensId: lensInBox.id,
					status: "SOLD",
				};
			} else {
				// attribute
				let attributes = await calculateAttributes(box.level);

				boxConfig = {
					batteryAmount: attributes.batteryAmount,
					negativeAmount: attributes.negativeAmount,
					referralCount: referralCount,
					cardId: null,
					lensId: null,
					status: "SOLD",
				};

				await assignBoxAttributeToUser(
					userId,
					attributes.batteryAmount,
					attributes.negativeAmount,
					cardId,
					transaction,
				);
			}
		} else if (box.level === 10) {
			let boxRandom = generateRandomFloat(0, 10);
			/* if (boxRandom < 0.001) {
                //camera
                cardInBox = await calculateCardPrize(userId, transaction);

                boxConfig = {
                    batteryAmount: 0,
                    negativeAmount: 0,
                    referralCount: referralCount,
                    cardId: cardInBox.cardId,
                    lensId: null,
                    status: "SOLD"
                };
            } else */
			if (boxRandom < 1) {
				//macro lens
				const lensInBox = await calculateLensPrize(userId, "MACRO", transaction);
				if (lensInBox === false) throw new HumanError("Please try again!", 400);

				boxConfig = {
					batteryAmount: 0,
					negativeAmount: 0,
					referralCount: referralCount,
					cardId: null,
					lensId: lensInBox.id,
					status: "SOLD",
				};
			} else if (boxRandom < 2) {
				/* else if (boxRandom < 2) {
                //stl reward

                const userStlWallet = await postgres.UserWallet.findOne({
                    where: {
                        userId: userId
                    },
                    include: [
                        {
                            model: postgres.Asset,
                            where: { coin: "STL" },
                            required: true,
                            as: "asset"
                        }
                    ],
                    transaction: transaction
                });

                await userStlWallet.increment("amount", { by: 100, transaction });

                boxConfig = {
                    stlReward: 100,
                    batteryAmount: 0,
                    negativeAmount: 0,
                    referralCount: referralCount,
                    cardId: null,
                    lensId: null,
                    status: "SOLD"
                };
            }*/
				/*else if (boxRandom < 4) {
                // damage cool down

                boxConfig = {
                    damageCoolDown: 500,
                    batteryAmount: 0,
                    negativeAmount: 0,
                    referralCount: referralCount,
                    cardId: null,
                    lensId: null,
                    status: "SOLD"
                };

                await assignBoxDamageAttributeToUser(userId, 500, cardId, transaction);
            } */
				// level up
				boxConfig = {
					levelUp: 1,
					batteryAmount: 0,
					negativeAmount: 0,
					referralCount: referralCount,
					cardId: null,
					lensId: null,
					status: "SOLD",
				};

				await assignBoxLevelAttributeToUser(userId, 1, cardId, transaction);
			} else {
				// attribute
				let attributes = await calculateAttributes(box.level);

				boxConfig = {
					batteryAmount: attributes.batteryAmount,
					negativeAmount: attributes.negativeAmount,
					referralCount: referralCount,
					cardId: null,
					lensId: null,
					status: "SOLD",
				};

				await assignBoxAttributeToUser(
					userId,
					attributes.batteryAmount,
					attributes.negativeAmount,
					cardId,
					transaction,
				);
			}
		} else if (box.level === 20) {
			// damage cool down

			const coolDownAttributes = await postgres.BoxSetting.findAll({
				where: {
					type: "COOLDOWN",
				},
				raw: true,
			});

			let referralRandom;
			let damageLimit;
			for (let attr of coolDownAttributes) {
				if (attr.name === "CoolDown_cardDamage") {
					referralRandom = attr.amounts[[Math.floor(Math.random() * attr.amounts.length)]];
				}

				if (attr.name === "CoolDown_damageLimit") {
					damageLimit = attr.amounts[[Math.floor(Math.random() * attr.amounts.length)]];
				}
			}

			boxConfig = {
				damageCoolDown: referralRandom,
				damageLimit,
				batteryAmount: 0,
				negativeAmount: 0,
				referralCount: referralCount,
				cardId: null,
				lensId: null,
				status: "SOLD",
			};

			await assignBoxDamageAttributeToUser(userId, referralRandom, cardId, transaction);
		} else {
			throw new HumanError("Your box is not available!", 400);
		}

		await postgres.BoxTrade.create({ userId: userId, boxAuctionId: auction.id, amount: 0 }, { transaction });

		if (referralCount > 0)
			await postgres.User.increment("referralCodeCount", {
				by: referralCount,
				where: { id: userId },
				transaction: transaction,
			});

		await auction.update({ status: "FINISHED" }, { transaction });

		await postgres.Box.update(boxConfig, { where: { id: box.id }, transaction });

		await postgres.UserBox.update(
			{
				isOpened: true,
			},
			{
				where: {
					userId: userId,
					boxAuctionId: auction.id,
					boxId: box.id,
					isOpened: false,
				},
				transaction,
			},
		);

		await transaction.commit();

		if (cardInBox !== null)
			if (process.env.NODE_ENV !== "development") {
				const sendingCard = await postgres.Card.findOne({ where: { id: cardInBox.cardId } });

				const user = await postgres.User.findOne({ where: { id: userId } });

				await axios.put(
					`${walletConfig.url}/api/v1/wallet/nft`,
					{
						contractAddress: walletConfig.contractAddress,
						id: sendingCard.edition,
						to: user.address,
					},
					{
						headers: {
							"X-API-KEY": walletConfig.apiKey,
						},
					},
				);
			}

		let newBox = await postgres.Box.findOne({
			where: { id: box.id },
			include: [
				{
					model: postgres.Card,
				},
				{
					model: postgres.Lens,
				},
			],
		});

		return newBox;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
}

//"cardId" in (21 , 5081 , 5082 , 5103 , 5104 , 5105 , 5106 , 10041 ,10042 , 10053 , 15021 , 20155 , 20156 , 20257 , 20258 , 20259 , 20260 , 20261 , 20262 , 20283 , 20284 , 20285 , 20286 , 20287 , 20289 , 20290 , 20291 , 20292 , 20303 , 20304 , 25016 , 30021 , 35031)
function generateRandomFloat(min, max) {
	return (Math.random() * (max - min) + min).toFixed(4);
}

const assignBoxAttributeToUser = async (userId, batteryAmount, negativeAmount, cardId, transaction) => {
	const userBatteryAttribute = await postgres.UserAttribute.findOne({
		where: { userId: userId, cardId: cardId, type: "INITIAL" },
		include: [
			{
				model: postgres.Attribute,
				where: {
					name: "BATTERY",
					type: "INITIAL",
				},
				required: true,
			},
			{
				model: postgres.Card,
				required: true,
			},
		],
	});

	if (userBatteryAttribute) await userBatteryAttribute.increment("amount", { by: batteryAmount, transaction });

	const userNegativeAttribute = await postgres.UserAttribute.findOne({
		where: { userId: userId, cardId: cardId, type: "INITIAL" },
		include: [
			{
				model: postgres.Attribute,
				where: {
					name: "NEGATIVE",
					type: "INITIAL",
				},
				required: true,
			},
			{
				model: postgres.Card,
				required: true,
			},
		],
	});

	if (userNegativeAttribute) {
		await userNegativeAttribute.increment("amount", { by: negativeAmount, transaction });
	}

	return true;
};

const assignBoxLevelAttributeToUser = async (userId, levelAmount, cardId, transaction) => {
	const userLevelAttribute = await postgres.UserAttribute.findOne({
		where: { userId: userId, cardId: cardId, type: "INITIAL" },
		include: [
			{
				model: postgres.Attribute,
				where: {
					name: "LEVEL",
					type: "INITIAL",
				},
				required: true,
			},
			{
				model: postgres.Card,
				required: true,
			},
		],
	});

	if (userLevelAttribute) await userLevelAttribute.increment("amount", { by: levelAmount, transaction });

	return true;
};

const assignBoxDamageAttributeToUser = async (userId, damageAmount, cardId, transaction) => {
	const userDamageAttribute = await postgres.UserAttribute.findOne({
		where: { userId: userId, cardId: cardId, type: "INITIAL" },
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
			},
		],
	});

	if (userDamageAttribute) {
		if (userDamageAttribute.amount - damageAmount > 0) {
			await userDamageAttribute.decrement("amount", { by: damageAmount, transaction });
		} else {
			await userDamageAttribute.update({ amount: 0 }, { transaction });
		}

		const card = await postgres.Card.findOne({
			where: { id: cardId },
		});
		if (card) {
			await postgres.UserAttribute.create({
				userId: userId,
				cardId: userDamageAttribute.cardId,
				attributeId: userDamageAttribute.attributeId,
				type: "FEE",
				amount: -damageAmount,
				description: `Your ${card.name} damage cool down by ${damageAmount} STL for opening a box coolDown`,
			});
		}
	}

	return true;
};

const calculateCardPrize = async (userId, transaction) => {
	const cardType = await postgres.CardType.findOne({ where: { name: "Pictomera" } });

	const assignedCard = await postgres.AssignedCard.findOne({
		where: { status: "FREE", userId: null, type: "TRANSFER" },
		include: [
			{
				model: postgres.Card,
				where: { cardTypeId: cardType.id },
			},
		],
	});

	await assignedCard.update(
		{
			type: "SOLD",
			status: "IN_BOX",
			userId: userId,
		},
		{ transaction },
	);

	await assignAttributes(userId, assignedCard.card, transaction);

	return assignedCard;
};

const calculateLensPrize = async (userId, lensType, transaction) => {
	const lensSetting = await postgres.LensSetting.findOne({
		where: {
			type: lensType.toUpperCase(),
		},
	});
	if (!lensSetting) throw new HumanError("Internal error", 400);

	const lens = await postgres.Lens.findOne({
		where: {
			status: "IN_AUCTION",
			lensSettingId: lensSetting.id,
		},
	});

	if (!lens) return false;

	await lens.update(
		{
			status: "IN_BOX",
		},
		{ transaction },
	);

	await new postgres.UserLens({
		userId: userId,
		lensId: lens.id,
		type: "BOX",
	}).save({ transaction });

	return lens;
};

function boxConfirmNft(data, userId) {
	return new Promise(async (resolve, reject) => {
		const transaction = await postgres.sequelize.transaction();
		try {
			const { cardId, address } = data;

			const box = await postgres.Box.findOne({
				where: { cardId, status: "SOLD" },
				raw: true,
			});
			if (!box) {
				await transaction.rollback();
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE), { cardId });
			}

			const auction = await postgres.BoxAuction.findOne({
				where: { boxId: box.id, status: "FINISHED" },
			});
			if (!auction) {
				await transaction.rollback();
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE), { cardId });
			}

			const assignedCard = await postgres.AssignedCard.findOne({
				where: {
					userId,
					cardId,
					status: "RESERVED",
				},
				include: postgres.Card,
			});

			if (!assignedCard) {
				await transaction.rollback();
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE), { cardId });
			}

			if (process.env.NODE_ENV !== "development") {
				await axios.put(
					`${walletConfig.url}/api/v1/wallet/nft`,
					{
						contractAddress: walletConfig.contractAddress,
						id: assignedCard.card.edition,
						to: address,
					},
					{
						headers: {
							"X-API-KEY": walletConfig.apiKey,
						},
					},
				);
			}

			await assignAttributes(userId, assignedCard.card, transaction);
			await assignedCard.update({ status: "FREE" }, { transaction });
			await postgres.BoxTrade.update(
				{ address },
				{
					where: { userId, boxAuctionId: auction.id },
					transaction,
				},
			);
			await transaction.commit();

			return resolve("Successful");
		} catch (e) {
			await transaction.rollback();
			return reject(e);
		}
	});
}

const assignAttributes = async (userId, card, transaction) => {
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

	return true;
};

/**
 * reserved cards
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param {*} searchQuery
 * @param {*} limit
 * @param {*} userId
 * @returns
 */
function reservedCards(data, userId) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, searchQuery } = data;

		const query = { userId, status: "RESERVED", type: "BOX" };

		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
			];
		}

		const items = await postgres.AssignedCard.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [{ model: postgres.Card, include: postgres.CardType }],
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

/**
 * reserved cards by manager
 * @param {*} page
 * @param {*} limit
 * @param {*} order
 * @param {*} searchQuery
 * @param {*} limit
 * @param {*} user
 * @returns
 */
function reservedCardsByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, searchQuery, userId } = data;

		const query = { status: "RESERVED", type: "BOX" };

		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
			];
		}

		if (userId) {
			query.userId = userId;
		}

		const items = await postgres.AssignedCard.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [postgres.Card, { model: postgres.User, attributes: ["id", "name", "email", "avatar"] }],
			nest: true,
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

module.exports = {
	calculateAttributes,
	generateRandomFloat,
	addBox,
	purchaseBox,
	OpenGiftBox,
	editBox,
	getBoxAuctions,
	reservedCards,
	reservedCardsByManager,
	boxConfirmNft,
	getBoxTradesByManager,
	getBoxTradeByManager,
	getBoxesByManager,
	getBoxByManager,
	getBoxAuctionsByManager,
	getBoxAuctionByManager,
	calculateLens,
	deleteBox,
	addBoxSetting,
	editBoxSetting,
	deleteBoxSetting,
	getBoxSettingByManager,
	getBoxSettingsByManager,
	getUserBox,
	getUserBoxes,
	getUserBoxByManager,
	getUserBoxesByManager,
	getBoxAuction,
	createUserBoxesByManager,
};
