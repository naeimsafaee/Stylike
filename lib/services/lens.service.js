const { postgres } = require("../databases");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");
const { NotFoundError, HumanError, ConflictError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { sendPushToToken } = require("./notification.service");
const { createUserBoxesByManager } = require("./manager/box/box.service");

const baseUrl = require("config").get("files.S3.url");

exports.addLensSetting = async (data, files) => {
	const { type, name, amount, price, allowedUsageNumber } = data;
	let image2 = {};

	if (files && Object.keys(files).length) {
		if (files["calculator_image"]) {
			let calculator_image = files["calculator_image"].shift();
			image2 = [
				{
					name: calculator_image.newName,
					key: calculator_image.calculator_image,
					location: calculator_image.location,
				},
			];
		}
	}
	const existLensSetting = await postgres.LensSetting.findOne({
		where: { type },
		raw: true,
	});
	if (existLensSetting) {
		throw new HumanError(Errors.DUPLICATE_DATA.MESSAGE, 400, { type });
	}

	const newLensSetting = await new postgres.LensSetting({
		type,
		name,
		amount,
		price,
		allowedUsageNumber,
		calculator_image: image2,
	}).save();
	if (!newLensSetting) {
		throw new HumanError(Errors.ADD_FAILED.MESSAGE, 400);
	}

	return "Success";
};

exports.editLensSetting = async (data, files) => {
	const { id, type, name, amount, price, allowedUsageNumber } = data;

	if (name) {
		const existLensSetting = await postgres.LensSetting.findOne({
			where: { id: { [postgres.Op.ne]: id }, name },
			raw: true,
		});

		if (existLensSetting)
			throw new ConflictError(Errors.CARD_TYPE_DUPLICATE.MESSAGE, Errors.CARD_TYPE_DUPLICATE.CODE, { name });
	}

	const update = {};

	if (files && Object.keys(files).length) {
		if (files["calculator_image"]) {
			let calculator_image = files["calculator_image"].shift();
			update["calculator_image"] = [
				{
					name: calculator_image.newName,
					key: calculator_image.calculator_image,
					location: calculator_image.location,
				},
			];
		}
	}

	if (name) update.name = name;
	if (price) update.price = price;
	if (type) update.type = type;
	if (amount) update.amount = amount;
	if (allowedUsageNumber) update.allowedUsageNumber = allowedUsageNumber;
	const result = await postgres.LensSetting.update(update, { where: { id } });

	if (!result.shift())
		throw new NotFoundError(Errors.CARD_TYPE_UPDATE_FAILED.MESSAGE, Errors.CARD_TYPE_UPDATE_FAILED.CODE, { id });

	return await postgres.LensSetting.findOne({ where: { id } });
};

exports.deleteLensSetting = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentLensSetting = await postgres.LensSetting.findOne({ where: { id } });
		if (!currentLensSetting) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		await currentLensSetting.destroy();

		return resolve("Successful");
	});
};

exports.getLensSettingByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentLensSetting = await postgres.LensSetting.findOne({
			where: { id },
			nest: true,
			raw: true,
		});

		if (!currentLensSetting) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentLensSetting);
	});
};

exports.getLensSettingsByManager = async (data) => {
	const { page, limit, sort, order, createdAt, id, searchQuery, name, type } = data;

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
			{ type: { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}

	if (id)
		query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
			[postgres.Op.iLike]: `%${id}%`,
		});
	if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };
	if (type && type.length > 0) query.type = { [postgres.Op.in]: type };

	const items = await postgres.LensSetting.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		nest: true,
		raw: true,
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
};

/**
 * add lens
 * @param name
 * @param initialNumber
 * @param type
 * @param price
 * @param assetId
 * @returns
 */

exports.addLens = (data) => {
	return new Promise(async (resolve, reject) => {
		const transaction = await postgres.sequelize.transaction();
		try {
			const { name, lensSettingId, initialNumber, price, assetId } = data;

			const asset = await postgres.Asset.findOne({ where: { id: assetId }, raw: true });
			if (!asset) {
				await transaction.rollback();
				return reject(
					new NotFoundError(Errors.ASSET_NOT_FOUND.MESSAGE, Errors.ASSET_NOT_FOUND.CODE, {
						assetId,
					}),
				);
			}

			const lensSetting = await postgres.LensSetting.findOne({
				where: { id: lensSettingId, status: "ACTIVE" },
				raw: true,
			});

			if (!lensSetting) {
				await transaction.rollback();
				return reject(
					new NotFoundError(Errors.LENS_SETTING_NOT_FOUND.MESSAGE, Errors.LENS_SETTING_NOT_FOUND.CODE, {
						lensSettingId,
					}),
				);
			}

			// generetate image url [x]
			const image = generateImageUrl(lensSetting.type);
			if (image === -1) {
				await transaction.rollback();
				return reject(
					new NotFoundError(Errors.CARD_TYPE_IMAGE_NOT_FOUND.MESSAGE, Errors.CARD_TYPE_IMAGE_NOT_FOUND.CODE, {
						type: lensSetting.type,
					}),
				);
			}

			// find last index of current type lens to set name correctly [x]
			const lastInsertedLens = await postgres.Lens.findOne({
				where: { lensSettingId },
				order: [["id", "DESC"]],
				limit: 1,
			});

			let startCounter = lastInsertedLens ? Number(lastInsertedLens.id) + 1 : 1;

			const lenses = [];

			for (let i = 0; i < initialNumber; i++) {
				lenses.push({
					name: `${name} #${startCounter}`,
					lensSettingId,
					image,
				});
				startCounter++;
			}

			const createdLenses = await postgres.Lens.bulkCreate(lenses, { transaction });

			const lensAuctions = [];

			for (let i = 0; i < createdLenses.length; i++) {
				lensAuctions.push({
					lensId: createdLenses[i].id,
					price,
					assetId,
				});
			}

			await postgres.LensAuction.bulkCreate(lensAuctions, { transaction });
			await transaction.commit();
			resolve("Successful");
		} catch (error) {
			await transaction.rollback();
			return reject(error);
		}
	});
};

const generateImageUrl = (typeName) => {
	const lensTypes = [
		"FISHEYE",
		"WIDEANGLE",
		"STANDARD",
		"SHORTTELEPHOTO",
		"MEDIUMTELEPHOTO",
		"SUPERTELEPHOTO",
		"MACRO",
	];

	const imageNameIndex = lensTypes.findIndex((tn) => tn.toLowerCase() === typeName.toLowerCase());
	if (imageNameIndex === -1) {
		return -1;
	}

	const imageName = lensTypes[imageNameIndex].toLowerCase();

	const url = [
		{
			key: `nft/lens/${imageName}.jpg`,
			name: `${imageName}.jpg`,
			location: `${baseUrl}nft/lens/${imageName}.jpg`,
		},
	];

	return url;
};

exports.editLens = (data) => {
	return new Promise(async (resolve, reject) => {
		try {
			const { id, name, lensSettingId, price, assetId } = data;

			const lens = await postgres.Lens.findOne({ where: { id } });

			if (!lens) {
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
			}

			if (lens.status !== "IN_AUCTION") {
				return reject(
					new ConflictError(
						Errors.BOX_ALREADY_HAS_BEEN_TRADED.MESSAGE,
						Errors.BOX_ALREADY_HAS_BEEN_TRADED.CODE,
					),
				);
			}

			const auction = await postgres.LensAuction.findOne({ where: { lensId: id } });

			const lensUpdate = {};
			const auctionUpdate = {};

			if (name) {
				const existLens = await postgres.Lens.findOne({ where: { name, id: { [postgres.Op.ne]: id } } });
				if (existLens) {
					return reject(
						new ConflictError(Errors.DUPLICATE_DATA.MESSAGE, Errors.DUPLICATE_DATA.CODE, { name }),
					);
				}
				lensUpdate.name = name;
			}

			if (lensSettingId) {
				const lensSetting = await postgres.LensSetting.findOne({
					where: { id: lensSettingId, status: "ACTIVE" },
					raw: true,
				});
				if (!lensSetting) {
					return reject(
						new NotFoundError(Errors.LENS_SETTING_NOT_FOUND.MESSAGE, Errors.LENS_SETTING_NOT_FOUND.CODE, {
							lensSettingId,
						}),
					);
				}
				lensUpdate.lensSettingId = lensSettingId;
			}

			if (price) {
				auctionUpdate.price = price;
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
				auctionUpdate.assetId = assetId;
			}

			if (Object.keys(lensUpdate)) await lens.update(lensUpdate);
			if (Object.keys(auctionUpdate)) await auction.update(auctionUpdate);

			return resolve("Successful");
		} catch (error) {
			return reject(error);
		}
	});
};

exports.deleteLens = (data) => {
	return new Promise(async (resolve, reject) => {
		try {
			const { id } = data;

			const lens = await postgres.Lens.findOne({ where: { id } });

			if (!lens) {
				return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
			}

			if (lens.status !== "IN_AUCTION") {
				return reject(
					new ConflictError(
						Errors.LENS_ALREADY_HAS_BEEN_TRADED.MESSAGE,
						Errors.LENS_ALREADY_HAS_BEEN_TRADED.CODE,
					),
				);
			}

			const auction = await postgres.LensAuction.findOne({ where: { lensId: id } });

			await lens.destroy();
			await auction.destroy();

			return resolve("Successful");
		} catch (error) {
			return reject(error);
		}
	});
};

exports.getLensByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const auction = await postgres.Lens.findOne({
			where: { id },
			include: [{ model: postgres.LensSetting }],
		});

		if (!auction) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(auction);
	});
};

exports.getLensesByManager = (data, user) => {
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
		if (cardTypeId && cardTypeId.length > 0) query["$lens.cardTypeId$"] = { [postgres.Op.in]: cardTypeId };

		const items = await postgres.Lens.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [{ model: postgres.LensSetting }],
		});

		resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
		});
		return resolve(items);
	});
};

// Lens Auction
exports.getLensAuction = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const auction = await postgres.LensAuction.findOne({
			where: { id, status: "ACTIVE" },
			include: [{ model: postgres.Lens, as: "lens", include: postgres.LensSetting }, postgres.Asset],
			nest: true,
			raw: true,
		});
		if (!auction) {
			return reject(new NotFoundError(Errors.AUCTION_NOT_FOUND.MESSAGE, Errors.AUCTION_NOT_FOUND.CODE, { id }));
		}

		return resolve(auction);
	});
};

exports.getLensAuctions = async (data) => {
	const { page, limit, sort, order, type, min, max, lensSettingId } = data;

	const query = { status: "ACTIVE", price: { [postgres.Op.gte]: min, [postgres.Op.lte]: max } };

	const offset = (page - 1) * limit;

	if (type) query["$lens.lensSetting.type$"] = type;
	if (lensSettingId) query["$lens.lensSettingId"] = lensSettingId;

	const items = await postgres.LensAuction.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.Lens,
				as: "lens",
				where: {status: "IN_AUCTION"},
				required: true,
				include: postgres.LensSetting,
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
};

exports.getLensAuctionByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const auction = await postgres.LensAuction.findOne({
			where: { id },
			include: [{ model: postgres.Lens, as: "lens", include: postgres.LensSetting }, postgres.Asset],
		});
		if (!auction) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(auction);
	});
};

exports.getLensAuctionsByManager = async (data) => {
	const { page, limit, sort, order, createdAt, id, searchQuery, name, price, asset, status } = data;

	const query = {};

	const offset = (page - 1) * limit;

	if (id) query.id = id;
	if (parseFloat(price) > 0) query.price = price;
	if (name) query["$lens.name$"] = { [postgres.Op.in]: name };
	if (asset) query["$asset.name$"] = { [postgres.Op.iLike]: "%" + asset + "%" };
	if (status) query.status = { [postgres.Op.in]: status };

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
			{ "$lens.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
			{ "$lens.cardType.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}
	const items = await postgres.LensAuction.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [{ model: postgres.Lens, as: "lens", include: postgres.LensSetting }, postgres.Asset],
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
};

// User Lens (Self)
exports.getUserLens = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const currentUserLens = await postgres.UserLens.findOne({
			where: { id, userId: user.id },
			include: [
				{
					model: postgres.Lens,
					include: postgres.LensSetting,
				},
			],
		});
		if (!currentUserLens) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentUserLens);
	});
};

exports.getUserLenses = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, name, type } = data;

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

		if (type) query["$len.lensSetting.type$"] = type;

		const items = await postgres.UserLens.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [
				{
					model: postgres.Lens,
					include: postgres.LensSetting,
				},
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
};

// User Lenses (manager)
exports.getUserLensByManager = async (data) => {
	const { userId } = data;

	const currentUserLens = await postgres.UserLens.findAll({
		where: { userId: userId },
		include: [
			{
				model: postgres.Lens,
				include: postgres.LensSetting,
			},
			{
				model: postgres.User,
				attributes: ["id", "email", "address", "name", "avatar"],
			},
		],
	});

	return currentUserLens;
};

exports.createUserLensesByManager = async (data) => {
	const lensSetting = await postgres.LensSetting.findOne({
		where: {
			id: data.lensSettingId,
		},
	});

	if (!lensSetting) throw new HumanError("Lens setting not found!", 400);

	const lens = await postgres.Lens.findOne({
		where: {
			status: "IN_AUCTION",
			lensSettingId: lensSetting.id,
		},
	});

	if (!lens) throw new HumanError("There is no lens with this setting in market!", 400);

	await postgres.UserLens.create({
		lensId: lens.id,
		type: "TRANSFER",
		lensAuctionId: null,
		userId: data.userId,
		usageNumber: 0,
	});

	await postgres.UserNotification.create({
		title: "Lens gift",
		description: `You received a lens as a gift just now.`,
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
			title: "Lens gift",
			body: `You received a lens as a gift just now`,
		},
	);

	return "success";
};

exports.getUserLensesByManager = async (data) => {
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
	if (name && name.length > 0) query.name = { [postgres.Op.in]: name };
	if (type && type.length > 0) query.type = { [postgres.Op.in]: type };
	if (userId) query.userId = userId;

	const items = await postgres.UserLens.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.Lens,
				include: postgres.LensSetting,
			},
			{ model: postgres.User, attributes: ["id", "email", "address", "name", "avatar"] },
		],
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
};

// Lens Trade
exports.getLensTradeByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;
		const trade = await postgres.LensTrade.findOne({
			where: { id },
			include: [
				{
					model: postgres.LensAuction,
					include: [
						{
							model: postgres.Lens,
							as: "lens",
							include: [{ model: postgres.LensSetting }],
						},
						postgres.Asset,
					],
				},
				{ model: postgres.User, attributes: ["id", "name", "avatar", "email"] },
			],
		});
		if (!trade) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(trade);
	});
};

exports.getLensTradesByManager = async (data) => {
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
		userName,
		lens,
		lensAuction,
		amount,
	} = data;

	const query = {};

	const offset = (page - 1) * limit;

	if (id) query.id = id;
	if (name) query.name = { [postgres.Op.in]: name };
	if (cardType) query["$cardType.name$"] = { [postgres.Op.in]: cardType };
	if (cardTypeId && cardTypeId.length > 0) query["$lens.cardTypeId$"] = { [postgres.Op.in]: cardTypeId };

	if (lens) query["lens.name"] = { [postgres.Op.iLike]: `%${lens}%` };
	if (lensAuction) query.lensAuctionId = lensAuction;
	if (parseFloat(amount) >= 0) query.amount = amount;
	if (userName) {
		query[postgres.Op.or] = [
			{ "$user.name$": { [postgres.Op.iLike]: `%${userName}%` } },
			{ "$user.email$": { [postgres.Op.iLike]: `%${userName}%` } },
		];
	}
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
	const items = await postgres.LensTrade.findAndCountAll({
		where: query,
		limit,
		offset,
		order: [[sort, order]],
		include: [
			{
				model: postgres.LensAuction,
				include: [
					{
						model: postgres.Lens,
						as: "lens",
						include: [{ model: postgres.LensSetting }],
					},
					postgres.Asset,
				],
			},
			{ model: postgres.User, attributes: ["id", "name", "avatar", "email"] },
		],
	});

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
};

exports.purchaseLens = async (data, userId, io) => {
	const transaction = await postgres.sequelize.transaction();
	try {
		const { lensAuctionId } = data;

		// find auction
		const auction = await postgres.LensAuction.findOne({
			where: { id: lensAuctionId, status: "ACTIVE" },
			include: [
				{
					model: postgres.Lens,
					as: "lens",
					where: { status: "IN_AUCTION" },
					include: postgres.LensSetting,
				},
				postgres.Asset,
			],
		});

		if (!auction) {
			throw new NotFoundError("auction not found", 400);
		}

		let userLens = await postgres.UserLens.findAll({
			where: {
				userId: userId,
			},
		});

		if (userLens.length >= 4) {
			throw new HumanError(
				`You already have ${userLens.length} lenses, you cannot have more than this amount`,
				400,
			);
		}

		// check user wallet
		let wallet = await postgres.UserWallet.findOne({
			where: { userId, assetId: auction.assetId },
			include: { model: postgres.Asset, as: "asset" },
		});

		if (!wallet) {
			wallet = await postgres.UserWallet.create({ userId, assetId: auction.assetId });
		}

		if (+wallet.amount < +auction.price) {
			throw new HumanError("insufficient balance to proceed the purchase", 400);
		}

		const lens = auction.lens;

		await postgres.LensTrade.create({ userId, lensAuctionId: auction.id, amount: auction.price }, { transaction });

		await auction.update({ status: "FINISHED" }, { transaction });

		await postgres.Lens.update({ status: "SOLD" }, { where: { id: lens.id }, transaction });

		await wallet.decrement("amount", { by: +auction.price, transaction });

		await postgres.UserLens.create(
			{
				userId: userId,
				lensAuctionId: auction.id,
				lensId: lens.id,
				isGifted: true,
			},
			{ transaction },
		);

		// let isGifted = false
		// for (let i = 0; i < userLens.length; i++) {
		//     if (userLens.isGifted)
		//         isGifted = true;
		// }

		/*if (userLens.length + 1 === 3) {
			const STL = await postgres.Asset.findOne({ where: { coin: "STL" } });

			const userFee = await postgres.UserFee.findOne({
				where: {
					userId: userId,
					assetId: STL.id,
				},
			});

			if (userFee) {
				userFee.amount = 1;
				await userFee.save();
			}

			// for (let i = 0; i < userLens.length; i++) {
			//     userLens[i].isGifted = true;
			//     userLens[i].save();
			// }
		}*/

		if (userLens.length + 1 === 4) {
			await createUserBoxesByManager({ userId: userId, level: 1 });
			await createUserBoxesByManager({ userId: userId, level: 1 });
		}

		await transaction.commit();

		let notif = await postgres.ManagerNotification.create({
			title: `User ${userId} purchase a lens successfully.`,
			userId: userId,
			tag: "lens",
		});
		io.to(`Manager`).emit("notification", JSON.stringify(notif));

		const user = await postgres.User.findOne({ where: { id: userId } });

		sendPushToToken(
			user,
			{},
			{
				title: "Lens purchase",
				body: `You buy lens ${lens.lensSetting.name} just now.`,
			},
		);

		return lens;
	} catch (error) {
		await transaction.rollback();
		throw error;
	}
};

exports.getLensType = async () => {
	const lensType = await postgres.LensSetting.findAll({
		where: { status: "ACTIVE" },
		attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "name"] },
	});

	return lensType;
};
