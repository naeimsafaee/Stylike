const { postgres } = require("../databases");
const { dateQueryBuilder, extractStartAndEndOfDay } = require("../utils/dateQueryBuilder");
const { HumanError, InternalError, NotFoundError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const em = require("exact-math");

exports.createLink = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { name } = data;

		const existLink = await postgres.AgentLink.findOne({ where: { name: name, agentId: user.id }, raw: true });
		if (existLink) {
			return reject(new HumanError(Errors.DUPLICATE_LINK.MESSAGE, Errors.DUPLICATE_LINK.CODE, { name }));
		}

		const code = Math.floor(100000 + Math.random() * 900000);

		const base = process.env.NODE_ENV === "development" ? "dev-api.stylike.io" : "api.stylike.io";
		const url = `https://${base}/api/user/links/go/${code}`;

		const newLink = await new postgres.AgentLink({ name, code, url, agentId: user.id }).save();
		if (!newLink) {
			return reject(new InternalError(Errors.ADD_FAILED.MESSAGE, Errors.ADD_FAILED.CODE));
		}

		return resolve("Success");
	});
};

exports.editLink = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { id, name } = data;

		const currentLink = await postgres.AgentLink.findOne({ where: { id, agentId: user.id } });
		if (!currentLink) {
			return reject(new NotFoundError(Errors.LINK_NOT_FOUND.MESSAGE, Errors.LINK_NOT_FOUND.CODE, { id }));
		}

		const existLink = await postgres.AgentLink.findOne({
			where: { name: name ? name : "null", agentId: user.id, id: { [postgres.Op.ne]: id } },
			raw: true,
		});

		if (existLink) {
			return reject(new HumanError(Errors.DUPLICATE_LINK.MESSAGE, Errors.DUPLICATE_LINK.CODE, { name }));
		}

		const updateData = {};

		if (name) updateData.name = name;

		const updatedLink = await currentLink.update(updateData);

		if (!updatedLink) {
			return reject(new InternalError(Errors.LINK_UPDATE_FAILED.MESSAGE, Errors.LINK_UPDATE_FAILED.CODE));
		}

		return resolve("Success");
	});
};

exports.deleteLink = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentLink = await postgres.AgentLink.findOne({ where: { id, agentId: user.id } });
		if (!currentLink) {
			return reject(new NotFoundError(Errors.LINK_NOT_FOUND.MESSAGE, Errors.LINK_NOT_FOUND.CODE, { id }));
		}

		const deletedLink = await currentLink.destroy();

		return resolve(deletedLink);
	});
};

exports.getLink = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentLink = await postgres.AgentLink.findOne({ where: { id, agentId: user.id } });
		if (!currentLink) {
			return reject(new NotFoundError(Errors.LINK_NOT_FOUND.MESSAGE, Errors.LINK_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentLink);
	});
};

exports.getLinks = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, name } = data;

		const query = {
			agentId: user.id,
		};

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
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${searchQuery}%`,
			});
		if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };

		const items = await postgres.AgentLink.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
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

exports.getLinkByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { id } = data;

		const currentLink = await postgres.AgentLink.findByPk(id);
		if (!currentLink) {
			return reject(new NotFoundError(Errors.LINK_NOT_FOUND.MESSAGE, Errors.LINK_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentLink);
	});
};

exports.getLinksByManager = (data) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery, name } = data;

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
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${id}%`,
			});
		if (name) query.name = { [postgres.Op.iLike]: `%${name}%` };

		const items = await postgres.AgentLink.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
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

exports.getLinkStatistics = (id, data, user) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, searchQuery } = data;

		const query = {
			"$agentLink.agentId$": user.id,
		};

		const offset = (page - 1) * limit;

		if (searchQuery) {
			query[postgres.Op.or] = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ "$agentLink.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ "$user.name$": { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		const items = await postgres.AgentLinkStatistic.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [
				{
					model: postgres.User,
					attributes: ["name", "email", "avatar"],
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

exports.getCommissionsChart = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { start, end } = data;

		let { startAt, endAt } = extractStartAndEndOfDay(start, end);

		const query = {
			agentId: user.id,
			createdAt: {
				[postgres.Op.between]: [startAt, endAt],
			},
		};

		const items = await postgres.AgentReward.findAndCountAll({
			where: query,
			attributes: ["createdAt", "commission"],
			raw: true,
		});

		const filtered = [];
		if (items.rows.length > 0) {
			items.rows.forEach((p) => {
				const foundedPriceIndex = filtered.findIndex(
					(f) =>
						f.createdAt.getDate() === p.createdAt.getDate() &&
						f.createdAt.getMonth() === p.createdAt.getMonth() &&
						f.createdAt.getFullYear() === p.createdAt.getFullYear(),
				);

				if (foundedPriceIndex !== -1) {
					filtered[foundedPriceIndex].commission = em.add(
						filtered[foundedPriceIndex].commission,
						p.commission,
					);
					filtered[foundedPriceIndex].count++;
				} else filtered.push({ ...p, count: 1 });
			});
		}

		resolve(filtered);
	});
};

exports.getRegisterChart = async (data, user) => {
	const { start, end } = data;

	const { startAt, endAt } = extractStartAndEndOfDay(start, end);

	const agent = await postgres.User.findOne({ where: { id: user.id } });
	if (!agent) throw new HumanError("Agent not found!", 400);

	const query = {
		referredCode: agent.referralCode,
		// "$agentLink.agentId$": user.id,
		// userId: { [postgres.Op.ne]: null },
		createdAt: {
			[postgres.Op.between]: [startAt, endAt],
		},
	};

	/*const items = await postgres.AgentLinkStatistic.findAndCountAll({
        where: query,
        attributes: ["createdAt"],
        raw: true,
        nest: true,
        include: postgres.AgentLink
    });*/

	const items = await postgres.User.count({
		where: query,
		attributes: [[postgres.sequelize.fn("DATE", postgres.sequelize.col("createdAt")), "date"]],
		group: ["date"],
	});

	/*const filtered = [];
    if (items.rows.length > 0) {
        items.rows.forEach((p) => {
            const foundedPriceIndex = filtered.findIndex(
                (f) =>
                    f.createdAt.getDate() === p.createdAt.getDate() &&
                    f.createdAt.getMonth() === p.createdAt.getMonth() &&
                    f.createdAt.getFullYear() === p.createdAt.getFullYear()
            );

            if (foundedPriceIndex !== -1) {
                filtered[foundedPriceIndex].count++;
            } else filtered.push({ createdAt: p.createdAt, count: 1 });
        });
    }
*/
	return items;
};

exports.getClickChart = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { start, end } = data;

		const { startAt, endAt } = extractStartAndEndOfDay(start, end);

		const query = {
			"$agentLink.agentId$": user.id,
			userId: { [postgres.Op.eq]: null },
			createdAt: {
				[postgres.Op.between]: [startAt, endAt],
			},
		};

		const items = await postgres.AgentLinkStatistic.findAll({
			where: query,
			attributes: ["createdAt"],
			raw: true,
			nest: true,
			include: postgres.AgentLink,
		});

		const filtered = [];
		if (items.length > 0) {
			items.forEach((p) => {
				const foundedPriceIndex = filtered.findIndex(
					(f) =>
						f.createdAt.getDate() === p.createdAt.getDate() &&
						f.createdAt.getMonth() === p.createdAt.getMonth() &&
						f.createdAt.getFullYear() === p.createdAt.getFullYear(),
				);

				if (foundedPriceIndex !== -1) {
					filtered[foundedPriceIndex].count++;
				} else filtered.push({ createdAt: p.createdAt, count: 1 });
			});
		}

		resolve(filtered);
	});
};

exports.directReferral = async (data, user) => {
	const { page, limit, sort, order, searchQuery } = data;

	const offset = (page - 1) * limit;

	const finalSort = sort;
	const finalOrder = order;

	const agent = await postgres.User.findOne({ where: { id: user.id } });
	if (!agent) throw new HumanError("Agent not found!", 400);

	const query = {
		referredCode: agent.referralCode,
	};

	if (searchQuery) {
		query[postgres.Op.or] = [
			{
				id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
					[postgres.Op.iLike]: `%${searchQuery}%`,
				}),
			},
			{ name: { [postgres.Op.iLike]: `%${searchQuery}%` } },
		];
	}

	// const items = await postgres.AgentReward.findAndCountAll({
	// 	where: query,
	// 	limit,
	// 	offset,
	// 	attributes: ["user.id"],
	// 	order: [[finalSort, finalOrder]],
	// 	include: [
	// 		{ model: postgres.User, attributes: [] },
	// 		{
	// 			model: postgres.AgentLink,
	// 			attributes: [],
	// 		},
	// 	],
	// 	group: "userId",
	// });

	const items = await postgres.User.findAndCountAll({
		where: query,
		attributes: {
			exclude: ["password", "salt", "deletedAt"],
			/*include: [
                [
                    postgres.sequelize.literal(`(SELECT SUM(commission) FROM agentRewards AS aR WHERE aR.userId = "user".id)`),
                    "itemTotal"
                ]
            ]*/
		},
		limit,
		offset,
		order: [[finalSort, finalOrder]],
		include: [
			{
				model: postgres.AgentLinkStatistic,
				attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
				include: [
					{
						model: postgres.AgentLink,
						attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
					},
				],
			} /*, {
            model: postgres.AgentReward,
            attributes: [],
            as: "userAgentReward"
        }*/,
		],
		raw: true,
		nest: true,
	});

	for(let item of items.rows){
		let commissions = await postgres.AgentReward.findAll({
			where: {
				userId: item.id,
			},
			attributes: [
				[
					postgres.sequelize.fn(
						"SUM",
						postgres.sequelize.cast(postgres.sequelize.col("commission"), "decimal"),
					),
					"totalCommission",
				],
			],
			group: "agentReward.id",
			include: { model: postgres.AgentLink, attributes: [] },
			raw: true,
			nest: true,
		});
		item["commission"] = commissions.reduce((acc, c) => +acc + +c.totalCommission, 0)
	}


	/*
    const items = await postgres.AgentReward.findAndCountAll({
        where: query,
        limit,
        offset,
        order: [[finalSort, finalOrder]],
        include: [
            { model: postgres.User, attributes: ["id", "name", "email", "avatar"], as: "user" },
            {
                model: postgres.AgentLink
            }
        ]
    });*/

	// const rewards = items.rows;

	/*const filtered = [];

*/

	/*rewards.forEach((reward) => {
        const foundedRewardIndex = filtered.findIndex((row) => row.userId === reward.userId);

        if (foundedRewardIndex === -1) {
            filtered.push(reward);
        } else {
            filtered[foundedRewardIndex].commission += +reward.commission;
        }
    });*/

	return {
		total: items.count,
		pageSize: limit,
		page,
		data: items.rows,
	};
};

exports.totals = (user) => {
	return new Promise(async (resolve, reject) => {
		const links = await postgres.AgentLink.findAll({
			where: { agentId: user.id },
			attributes: [
				[
					postgres.sequelize.fn(
						"SUM",
						postgres.sequelize.cast(postgres.sequelize.col("clickCount"), "integer"),
					),
					"totalClick",
				],
				[
					postgres.sequelize.fn(
						"SUM",
						postgres.sequelize.cast(postgres.sequelize.col("completedCount"), "integer"),
					),
					"totalRegister",
				],
			],
			raw: true,
		});

		const commissions = await postgres.AgentReward.findAll({
			where: {
				agentId: user.id,
			},
			attributes: [
				[
					postgres.sequelize.fn(
						"SUM",
						postgres.sequelize.cast(postgres.sequelize.col("commission"), "decimal"),
					),
					"totalCommission",
				],
			],
			group: "agentReward.id",
			include: { model: postgres.AgentLink, attributes: [] },
			raw: true,
			nest: true,
		});

		const result = {
			totalClick: links[0].totalClick,
			totalRegister: links[0].totalRegister,
			totalCommission: commissions.reduce((acc, c) => +acc + +c.totalCommission, 0),
		};

		resolve(result);
	});
};

exports.clientCommission = (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, start, end } = data;

		const offset = (page - 1) * limit;

		const finalSort = sort;
		const finalOrder = order;

		const query = {
			// "$agentLink.agentId$": user.id,
			agentId: user.id,
		};

		if (start && end) {
			const { startAt, endAt } = extractStartAndEndOfDay(start, end);

			query["createdAt"] = {
				[postgres.Op.between]: [startAt, endAt],
			};
		}

		const items = await postgres.AgentReward.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[finalSort, finalOrder]],
			include: [
				{ model: postgres.User, attributes: ["id", "name", "email", "avatar", "createdAt"], as: "user" },
				{
					model: postgres.AgentLink,
					attributes: ["id", "name", "code", "clickCount", "completedCount", "type", "url"],
				},
				{
					model: postgres.Auction,
					attributes: ["id", "assignedCardId", "start", "end", "basePrice", "immediatePrice", "bookingPrice"],
					include: [
						{
							model: postgres.AssignedCard,
							attributes: ["id", "cardId", "status"],
							include: [
								{
									model: postgres.Card,
									attributes: ["id", "name", "description", "image", "cardTypeId"],
									include: [{ model: postgres.CardType, attributes: ["name", "image"] }],
								},
							],
						},
					],
				},
			],
		});

		const rewards = items.rows;
		const totalCommission = rewards.reduce((acc, c) => +acc + +c.commission, 0);

		return resolve({
			total: items.count,
			pageSize: limit,
			page,
			data: items.rows,
			totalCommission,
		});
	});
};
