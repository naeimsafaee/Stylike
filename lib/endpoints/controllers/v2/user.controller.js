const {
    httpResponse: { response },
    httpStatus
} = require("../../../utils");
const { postgres } = require("../../../databases");
const { assignGhostCard } = require("../../../services/user.service");
const { HumanError, NotFoundError } = require("../../../services/errorhandler");
const { assignAttributes } = require("../../../services/auction.service");
const { calculateAgentFee, calculate5PercentReferral } = require("../../../services/referral.service");
const config = require("config");
const { ethers } = require("ethers");
const util = require("ethereumjs-util");
const Web3 = require("web3");
const nftAbi = require("../../../data/erc721.json");
const { date } = require("joi");
const { NOW } = require("sequelize");
const { getUserPlan } = require("./aiPlan.controller");
const logger = require("../../../middlewares/WinstonErrorMiddleware");




exports.info = async (req, res) => {
    const user = await postgres.User.findOne({
        where: { id: req.userEntity.id },
        attributes: { exclude: ["password", "salt"] }
    });

    let GhostMode = await assignGhostCard(user);

    const data = {
        user: user,
        GhostMode: GhostMode
    };

    return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserCard = async (req, res) => {
    const userId = req.userEntity.id;

    let result = await postgres.AssignedCard.findAll({
        where: { userId: userId },
        attributes: { exclude: ["updatedAt", "deletedAt", "type", "usedCount"] },
        include: [
            {
                model: postgres.Card,
                attributes: {
                    exclude: [
                        "updatedAt",
                        "deletedAt",
                        "description",
                        "chain",
                        "serialNumber",
                        "allowedUsageNumber",
                        "isImported",
                        "importCount"
                    ]
                },
                include: [
                    {
                        model: postgres.CardType,
                        required: true,
                        attributes: {
                            exclude: [
                                "updatedAt",
                                "deletedAt",
                                "coolDown",
                                "dailyCoolDown",
                                "swapConstant",
                                "swapLimit",
                                "isInBox"
                            ]
                        }
                    }
                ]
            }
        ],
        raw: true,
        nest: true
    });

    const userDamageLimit = await postgres.UserBox.findOne({
        where: {
            userId
        },
        attributes: [],
        include: [
            {
                model: postgres.Box,
                attributes: [[postgres.sequelize.fn("sum", postgres.sequelize.col("damageLimit")), "sum"]]
            }
        ],
        raw: true
    });

    const totalDamageLimit = parseFloat(userDamageLimit["box.sum"] ? userDamageLimit["box.sum"] : 0);

    for (let i = 0; i < result.length; i++) {
        const attributes = await postgres.Attribute.findAll({
            where: {
                type: "INITIAL",
                name: {
                    [postgres.Op.ne]: "MEGAPIXEL"
                }
            },
            attributes: {
                exclude: ["updatedAt", "deletedAt"]
            },
            include: {
                model: postgres.UserAttribute,
                where: {
                    userId: userId,
                    cardId: result[i].cardId,
                    type: "INITIAL"
                },
                required: true,
                attributes: {
                    exclude: [
                        "userLensId",
                        "boxTradeId",
                        "competitionTaskId",
                        "competitionLeagueId",
                        "assetId",
                        "updatedAt",
                        "deletedAt"
                    ]
                }
            },
            raw: true,
            nest: true
        });

        for (let j = 0; j < attributes.length; j++) {
            if (attributes[j].name === "DAMAGE") {
                const heatPercent = await postgres.Attribute.findOne({
                    where: {
                        name: "HEAT",
                        type: "FEE",
                        cardTypeId: attributes[j].cardTypeId,
                        mode: {
                            [postgres.Op.lte]:
                                attributes[j].userAttributes.amount < 0
                                    ? 0
                                    : attributes[j].userAttributes.amount - totalDamageLimit
                        }
                    },
                    order: [["mode", "DESC"]]
                });

                attributes[j].userAttributes.amount = heatPercent ? heatPercent.amount : 0;
            } else if (attributes[j].name === "BATTERY" || attributes[j].name === "NEGATIVE") {
                const extraAttribute = await postgres.Attribute.findAll({
                    where: {
                        name: attributes[j].name,
                        type: "EXTRA",
                        cardTypeId: attributes[j].cardTypeId
                        // mode: { [postgres.Op.lte]: attributes[j].amount }
                    },
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "icon", "status", "cardTypeId"] },
                    order: [["mode", "DESC"]]
                });

                const feeAttribute = await postgres.Attribute.findOne({
                    where: {
                        name: attributes[j].name,
                        type: "FEE",
                        cardTypeId: attributes[j].cardTypeId
                        // mode: { [postgres.Op.lte]: attributes[j].amount }
                    },
                    attributes: { exclude: ["createdAt", "updatedAt", "deletedAt", "icon", "status", "cardTypeId"] },
                    order: [["mode", "DESC"]]
                });

                attributes[j].extraAttribute = extraAttribute;
                attributes[j].feeAttribute = feeAttribute;
            }
        }

        const isLocked = await postgres.UserNftStake.count({
            where: {
                assignedCardId: result[i].id
            }
        });

        result[i].attribute = attributes;
        result[i].isStaked = isLocked > 0;
    }

    const userLenses = await postgres.UserLens.findAll({
        where: {
            userId: userId
        },
        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
        include: [
            {
                model: postgres.Lens,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                required: true,
                include: [
                    {
                        model: postgres.LensSetting,
                        attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
                        required: true
                    }
                ]
            }
        ]
    });

    let lenses = [];

    for (let i = 0; i < userLenses.length; i++) {
        const userLens = userLenses[i];

        if (userLens.usageNumber >= userLens.len.lensSetting.allowedUsageNumber) {
            await userLens.destroy();
            continue;
        }

        lenses.push(userLens);
    }

    return res.send({
        data: {
            lenses: lenses,
            data: result
        }
    });
};

exports.WalletCardList = async (req, res) => {
    let { addressWallet, signer } = req.body;

    const isAddressCorrect = await checkAddress(addressWallet, signer);
    if (!isAddressCorrect) throw new HumanError("Your Address wallet is not same with your signer", 400);

    addressWallet = addressWallet.toLowerCase();

    const wallets = await postgres.Owner.findAll({
        where: {
            [postgres.Op.or]: {
                toAddress: { [postgres.Op.iLike]: addressWallet },
                fromAddress: { [postgres.Op.iLike]: addressWallet }
            }
        },
        order: [["blockNumber", "ASC"]]
    });

    let editions = [];

    for (let i = 0; i < wallets.length; i++) {
        if (wallets[i].toAddress.toLowerCase() === addressWallet) editions.push(parseInt(wallets[i].cardEdition));
        else if (wallets[i].fromAddress.toLowerCase() === addressWallet)
            editions = editions.filter((v) => v !== parseInt(wallets[i].cardEdition));
    }

    if (editions.length === 0) throw new HumanError("There is no camera in your wallet", 400);

    const cards = await postgres.Card.findAll({
        where: {
            edition: {
                [postgres.Op.in]: editions
            }
        },
        attributes: { exclude: ["updatedAt", "deletedAt"] },
        include: [
            {
                model: postgres.AssignedCard,
                attributes: ["id", "userId"]
            }
        ],
        nest: true,
        raw: true
    });

    for (let i = 0; i < cards.length; i++) {
        if (cards[i].assignedCards && parseInt(cards[i].assignedCards.userId) === parseInt(req.userEntity.id))
            cards[i]["isAssigned"] = true;
        else cards[i]["isAssigned"] = false;
    }

    return res.send({
        data: cards
    });
};

exports.importCard = async (req, res) => {
    // throw new HumanError("Importing nft is under maintenance", 400);

    let { addressWallet, cardId, signer } = req.body;

    const isAddressCorrect = await checkAddress(addressWallet, signer);
    if (!isAddressCorrect) throw new HumanError("Your Address wallet is not same with your signer", 400);

    addressWallet = addressWallet.toLowerCase();

    const wallets = await postgres.Owner.findAll({
        where: {
            [postgres.Op.or]: {
                toAddress: { [postgres.Op.iLike]: addressWallet },
                fromAddress: { [postgres.Op.iLike]: addressWallet }
            }
        },
        order: [["blockNumber", "ASC"]]
    });

    let editions = [];

    for (let i = 0; i < wallets.length; i++) {
        if (wallets[i].toAddress.toLowerCase() === addressWallet) editions.push(parseInt(wallets[i].cardEdition));
        else if (wallets[i].fromAddress.toLowerCase() === addressWallet)
            editions = editions.filter((v) => v !== parseInt(wallets[i].cardEdition));
    }

    if (editions.length === 0) throw new HumanError("There is no camera in your wallet!", 400);

    await _import(cardId, editions, req.userEntity.id);

    return res.send({
        data: {
            message: "you import the camera successfully"
        }
    });
};

async function _import(cardId, editions, userId) {
    const card = await postgres.Card.findOne({
        where: {
            id: cardId
        },
        attributes: { exclude: ["updatedAt", "deletedAt"] }
    });

    if (!card) throw new HumanError("This camera does not exist!", 400);
    if (!card.importCount >= parseInt(config.get("max_import_count"))) {
        card.deletedAt = Date.now();
        await card.save();

        throw new HumanError("This camera has been imported too many times and it's deactivate now!", 400);
    }

    const cardType = await postgres.CardType.findOne({
        where: {
            id: card.cardTypeId
        }
    });

    if (editions.indexOf(card.edition) < 0) throw new HumanError("There is no camera with this edition!", 400);

    const assignedCard = await postgres.AssignedCard.findOne({
        where: {
            cardId: card.id
        }
    });

    if (!assignedCard) throw new HumanError("This camera does not exist!", 400);

    if (assignedCard.userId === userId) throw new HumanError("You already have this camera!", 400);

    const user = await postgres.User.findByPk(userId);

    const transaction = await postgres.sequelize.transaction();

    try {
        await assignedCard.update(
            {
                userId: userId,
                type: "SOLD",
                status: "FREE"
            },
            { transaction }
        );

        const GhostType = await postgres.CardType.findOne({
            where: { price: "0" },
            transaction
        });

        if (GhostType) {
            const ghostCards = await postgres.AssignedCard.findOne({
                where: {
                    userId: userId
                },
                include: [
                    {
                        model: postgres.Card,
                        required: true,
                        where: { cardTypeId: GhostType.id }
                    }
                ],
                transaction
            });
            if (ghostCards) await ghostCards.destroy({ transaction });
        }

        await postgres.UserNftStake.destroy({
            where: {
                assignedCardId: assignedCard.id
            }
        });

        const userAttributeExists = await postgres.UserAttribute.findAll({
            where: {
                cardId: card.id,
                type: "INITIAL"
            },
            transaction
        });

        if (userAttributeExists.length > 0) {
            await postgres.UserAttribute.update(
                {
                    userId: userId
                },
                {
                    where: {
                        cardId: card.id,
                        type: "INITIAL"
                    },
                    transaction
                }
            );

            if (user.referredCode) {
                const referredUser = await postgres.User.findOne({
                    where: { referralCode: user.referredCode, status: "ACTIVE" },
                    transaction
                });

                if (referredUser) {
                    const coolDown = cardType.coolDown;

                    /*  await referredUser.update(
                                            {
                                                heatWithdraw: 0
                                            },
                                            { transaction }
                                        );*/

                    const referredUserAttribute = await postgres.UserAttribute.findOne({
                        where: {
                            userId: referredUser.id
                        },
                        include: [
                            {
                                model: postgres.Attribute,
                                where: {
                                    name: "DAMAGE",
                                    type: "INITIAL"
                                },
                                required: true
                            },
                            {
                                model: postgres.Card,
                                required: true,
                                include: [
                                    {
                                        model: postgres.CardType,
                                        required: true
                                    }
                                ]
                            }
                        ],
                        order: [
                            ["amount", "DESC"],
                            [postgres.Card, postgres.CardType, "price", "DESC"]
                        ],
                        transaction
                    });

                    if (referredUserAttribute) {
                        if (card.isImported === false) {
                            const newDamageAmount = parseFloat(referredUserAttribute.amount) - parseFloat(coolDown);
                            if (newDamageAmount < 0) await referredUserAttribute.update({ amount: 0 }, { transaction });
                            else await referredUserAttribute.decrement("amount", { by: coolDown, transaction });
                        }
                    }
                    /*if (card.isImported === false) {
                                            /!*if (referredUser.level === "AGENT") {
                                                const referralPrice = parseFloat(cardType.price) / 2;
                                                calculateAgentFee(user.referredCode, user.id, "CAMERA", referralPrice, null);
                                            }*!/

                                            /!*if (referredUser.level === "NORMAL") {
                                                calculate5PercentReferral(
                                                    user.referredCode,
                                                    user.id,
                                                    "CAMERA",
                                                    +cardType.price,
                                                    null,
                                                    0.015
                                                );
                                            }*!/
                                        }*/
                }
            }

            card.isImported = true;
            card.importCount += 1;
            await card.save({ transaction });
        } else {
            await assignAttributes(userId, card, transaction);
        }

        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        throw new HumanError("There is an error, try again later", 400);
    }
}

exports.importCustomCard = async (req, res) => {
    const { cardName, addressWallet, signer } = req.body;

    const isAddressCorrect = await checkAddress(addressWallet, signer);
    if (!isAddressCorrect) throw new HumanError("Your Address wallet is not same with your signer", 400);

    const cardEdition = parseInt(cardName.split("#")[1]);

    if (!/^[a-zA-Z]+? #+\d+$/.test(cardName)) throw new HumanError("Please enter your camera name correctly!", 400);

    let address;

    try {
        console.log(cardEdition);
        const provider = new Web3.providers.WebsocketProvider(config.get("RPC.BSC"));
        const web3 = new Web3(provider);

			const stylContract = new web3.eth.Contract(nftAbi, config.get("CONTRACT.STYLIKE"));

			address = await stylContract.methods.ownerOf(cardEdition).call();
    } catch (e) {
        console.log(e);
        logger.error(e);
        return res.status(400).send({
            message: "Please try again later"
        });
    }

    if (address && addressWallet.toLowerCase() === address.toLowerCase()) {
        const card = await postgres.Card.findOne({
            where: {
                edition: cardEdition
            }
        });

        await _import(card.id, [cardEdition], req.userEntity.id);

        return res.send({
            data: {
                message: "you import the camera successfully"
            }
        });
    } else {
        throw new HumanError("You don't own this camera!", 400);
    }
};

exports.purchasePlan = async (req, res) => {
    const userId = req.userEntity.id;
    const { planId } = req.body;

    const transaction = await postgres.sequelize.transaction();

    try {
        const user = await postgres.User.findByPk(userId);

        if (!user) throw new HumanError("User not found", 400);

        const plan = await postgres.Plan.findByPk(planId);

        if (!plan) throw new HumanError("Plan does not exist", 400);

        if (plan.name === "Free") {
            throw new HumanError(`You Can't buy Free plan`, 400);
        }

        const userPlan = await postgres.UserPlan.findOne({
            where: {
                userId
            },
            include: [
                {
                    model: postgres.Asset,
                    attributes: ["name", "coin", "type"]
                },
                {
                    model: postgres.Plan,
                    attributes: ["name"]
                }
            ],
            attributes: { exclude: ["updatedAt", "deletedAt"] }
        });

        if (userPlan) {
            await userPlan.destroy({ transaction });
            // throw new HumanError("You have already purchased a plan");
        }

        let limit = 0;

        if (plan.name !== "NFT Holders") {
            let userWallet = await postgres.UserWallet.findOne({
                where: {
                    userId,
                    assetId: plan.assetId
                },
                transaction
            });

            if (!userWallet)
                userWallet = await postgres.UserWallet.create({
                    assetId: plan.assetId,
                    userId,
                    amount: 0
                });

            if (+userWallet.amount < +plan.price)
                throw new HumanError("You do not have enough credit to buy this plan", 400);

            await userWallet.decrement("amount", { by: +plan.price, transaction });

            limit = plan.limit;
        } else {
            const userCameras = await postgres.AssignedCard.findAll({
                where: {
                    userId: userId
                },
                attributes: ["id"],
                include: [
                    {
                        model: postgres.Card,
                        attributes: ["id"],
                        required: true,
                        include: [
                            {
                                model: postgres.CardType,
                                attributes: ["name", "aiCredit"],
                                where: {
                                    id: { [postgres.Op.ne]: 9 }
                                },
                                required: true
                            }
                        ]
                    }
                ]
            });

            let limit = 0;
            for (let c of userCameras) {
                const aiCredit = c.card.cardType.aiCredit;

                limit += aiCredit;
            }
        }

        await new postgres.UserPlan({
            userId,
            planId: plan.id,
            assetId: plan.assetId,
            price: plan.price,
            limit: limit,
            remaining: limit,
            isUpscalable: plan.isUpscalable,
            isWatermark: plan.isWatermark,
            hasBlueTick: plan.hasBlueTick,
            maxUpscale: plan.maxUpscale
        }).save({ transaction });

        await transaction.commit();

        return res.send({
            data: {
                message: "Plan was purchased successfully"
            }
        });
    } catch (e) {
        await transaction.rollback();
        throw e;
    }
};

exports.getPlan = async (req, res) => {
    const userId = req.userEntity.id;

    const userPlan = await postgres.UserPlan.findOne({
        where: {
            userId
        },
        include: [
            {
                model: postgres.Asset,
                attributes: ["name", "coin", "type"]
            },
            {
                model: postgres.Plan,
                attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] }
            }
        ],
        attributes: { exclude: ["updatedAt", "deletedAt"] },
        raw: true,
        nest: true
    });

    let title = "";

    if (userPlan && userPlan.name === "NFT Holders") {
        const userCameras = await postgres.AssignedCard.findAll({
            where: {
                userId: userId
            },
            attributes: ["id"],
            include: [
                {
                    model: postgres.Card,
                    attributes: ["id"],
                    required: true,
                    include: [
                        {
                            model: postgres.CardType,
                            attributes: ["name", "aiCredit"],
                            where: {
                                id: { [postgres.Op.ne]: 9 }
                            },
                            required: true
                        }
                    ]
                }
            ]
        });

        let credit = 0;
        for (let c of userCameras) {
            const aiCredit = c.card.cardType.aiCredit;

            title += c.card.cardType.name + " , ";

            credit += aiCredit;
        }

        userPlan.limit = credit;
    }

    if (userPlan && userPlan.name === "Free" && userPlan.remaining === 0)
        return response({ res, statusCode: httpStatus.OK, data: null });

    if (userPlan) userPlan.title = title;

    return response({ res, statusCode: httpStatus.OK, data: userPlan });
};

async function checkAddress(address, signer) {
    const recoveredAddress = ethers.utils.verifyMessage("Please sign your wallet", signer);

    if (recoveredAddress !== address) return false;

    return true;
}
