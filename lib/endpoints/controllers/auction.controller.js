const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("./../../utils");
const { auctionService } = require("./../../services");
const { postgres } = require("../../databases");

/**
 * get all auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctions = async (req, res) => {
	try {
		const data = await auctionService.getAll(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get all auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuction = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getOne(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addAuction = async (req, res) => {
	try {
		const { tokenId, start, end, basePrice, immediatePrice, bookingPrice, type } = req.body;
		const data = await auctionService.add(
			req.userEntity.id,
			tokenId,
			start,
			end,
			basePrice,
			immediatePrice,
			bookingPrice,
			type,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addAuctionManager = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await auctionService.addAuctionManager(req.body, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editAuction = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const { id, start, end, basePrice, immediatePrice, bookingPrice, type } = req.body;
		const data = await auctionService.edit(
			req.userEntity.id,
			id,
			start,
			end,
			basePrice,
			immediatePrice,
			bookingPrice,
			type,
			io,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editAuctionManager = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await auctionService.editAuctionManager(req.body, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteAuction = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await auctionService.del(req.userEntity.id, req.params.id, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.delAuctionManager = async (req, res) => {
	const io = req.app.get("socketIo");
	const data = await auctionService.delAuctionManager(req.params.id, io);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get auction offers
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getOffers = async (req, res) => {
	try {
		const { id, user, auctionId, status, page, limit, order, sort, userId, createdAt, amount, searchQuery } =
			req.query;
		const data = await auctionService.getOffers({
			id,
			user,
			auctionId,
			status,
			page,
			limit,
			order,
			sort,
			userId,
			createdAt,
			amount,
			searchQuery,
		});
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get auction offers
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getOffersManager = async (req, res) => {
	try {
		const { id, user, auctionId, status, page, limit, order, sort, userId, createdAt, amount, searchQuery } =
			req.query;
		const data = await auctionService.getOffersManager({
			id,
			user,
			auctionId,
			status,
			page,
			limit,
			order,
			sort,
			userId,
			createdAt,
			amount,
			searchQuery,
		});
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get auction offers
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getOffer = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getOffer(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete auction offer
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteOffers = async (req, res) => {
	try {
		const data = await auctionService.deleteOffers(null, req.params.id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete auction offer
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteOffersManager = async (req, res) => {
	try {
		const data = await auctionService.deleteOffersManager(req.params.id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get auction trades list Manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionTradesManager = async (req, res) => {
	try {
		const data = await auctionService.getAuctionTradesManager(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get auction trade Manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionTradeManager = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getAuctionTradeManager(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get auction trades list User
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionTradesUser = async (req, res) => {
	try {
		const { auctionId, page, limit, order, sort } = req.query;
		const data = await auctionService.getAuctionTradesUser(auctionId, req.userEntity.id, page, limit, order, sort);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get auction trades list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionTradeUser = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getAuctionTradeUser(id, req.userEntity.id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.getAuctionList = async (req, res) => {
	// try {
	const data = await auctionService.getAuctionList(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
	/*} catch (e) {
		return res.status(e.statusCode).json(e);
	}*/
};

/**
 * get auction offer list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctionOfferList = async (req, res) => {
	try {
		const data = await auctionService.getAuctionOfferList(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get single auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getSingleAuction = async (req, res) => {
	try {
		const data = await auctionService.getSingleAuction(req.params.id, req.query.chain);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * purchase token
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.purchaseCard = async (req, res) => {
	const io = req.app.get("socketIo");
	const { auctionId, address } = req.body;
	const data = await auctionService.purchaseCard(auctionId, req.userEntity.id, address, io);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.assign_to_users = async (req, res) => {
	// const users = await postgres.User.findAll({});
	return;
	/* const transaction = await postgres.sequelize.transaction();

     try {
         const userPrizes = await postgres.UserPrize.findAll({
             where: {
                 competitionId: 113
             }, transaction
         });

        for (let i = 0; i < userPrizes.length; i++) {

            const prize = userPrizes[i];

            const amount = parseFloat(prize.amount);
            const userId = prize.userId;
            const assetId = prize.assetId;

            const userWallet = await postgres.UserWallet.findOne({
                where: {
                    assetId: assetId,
                    userId: userId
                }, transaction
            });
            if (userWallet) {
                if (amount > parseFloat(userWallet.amount)) {
                    await postgres.UserWallet.update({
                        amount: 0
                    }, {
                        where: {
                            id: userWallet.id
                        }, transaction
                    });
                } else {
                    await postgres.UserWallet.update({
                        amount: parseFloat(userWallet.amount) - amount
                    }, {
                        where: {
                            id: userWallet.id
                        }, transaction
                    });
                }
            }

        }

        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        console.log(e)
    }*/

	/*const GhostType = await postgres.CardType.findOne({
        where: { price: "0" }
    });

    // for (let i = 0; i < users.length; i++) {
    const existAssignedCardTypes = await postgres.AssignedCard.findAll({
        include: [{
            model: postgres.Card,
            where: {
                cardTypeId: GhostType.id
            },
            required: true
        }]
    });

    for (let j = 0; j < existAssignedCardTypes.length; j++) {

        const existAssignedCardType = existAssignedCardTypes[j];

        try {
            let attributes = await postgres.Attribute.findAll({
                where: {
                    cardTypeId: existAssignedCardType.card.cardTypeId, type: "INITIAL", status: "ACTIVE"
                }
            });

            for (const attribute of attributes) {

                const exists = await postgres.UserAttribute.findAll({
                    where: {
                        userId: existAssignedCardType.userId, cardId: existAssignedCardType.cardId, attributeId: attribute.id
                    }
                });

                if (exists.length === 0) {
                    await postgres.UserAttribute.create({
                        userId: existAssignedCardType.userId,
                        cardId: existAssignedCardType.cardId,
                        attributeId: attribute.id,
                        amount: attribute.amount
                    });
                } else {
                    await postgres.UserAttribute.update({
                        amount: attribute.amount
                    }, {
                        where: {
                            userId: existAssignedCardType.userId,
                            cardId: existAssignedCardType.cardId,
                            attributeId: attribute.id
                        }
                    });
                }

            }

        } catch (error) {
            console.log(error);
        }
        console.log("one attribute updated");
    }
    // }*/

	return res.send("ok");
};

exports.decrease_competition_reward = async (req, res) => {
	const prizes = await postgres.UserPrize.findAll({
		where: {
			competitionId: 131,
			id: {
				[postgres.Op.and]: {
					[postgres.Op.gte]: 48512,
					[postgres.Op.lte]: 49469,
				},
			},
		},
	});

	const transaction = await postgres.sequelize.transaction();

	try {
		for (let i = 0; i < prizes.length; i++) {
			const user = await postgres.User.findOne({ where: { id: prizes[i].userId }, transaction });

			let userWallet = await postgres.UserWallet.findOne({
				where: { userId: user.id, assetId: 6 },
				transaction,
			});
			if (parseFloat(userWallet.amount) - parseFloat(prizes[i].amount) < 0) {
				console.log("userId = ", user.id, "amount = ", userWallet.amount);
				userWallet.amount = 0;
				await userWallet.save({ transaction });
			} else {
				await userWallet.decrement("amount", { by: +prizes[i].amount, transaction });
			}
			await prizes[i].destroy({ transaction });
		}

		await transaction.commit();
	} catch (e) {
		console.log(e);
		await transaction.rollback();
		throw e;
	}

	return res.send("ok");
};

exports.getAllAuctions = async (req, res) => {
	try {
		const data = await auctionService.getAllAuctions(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getAuctionLogs = async (req, res) => {
	try {
		const data = await auctionService.getAuctionLogs(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.getAuctionLog = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getAuctionLog(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};
