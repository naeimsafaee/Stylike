const axios = require("axios").default;
const { postgres } = require("./../databases");
const { HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const config = require("config");
const moment = require("moment");
const { sendPushToToken } = require("./notification.service");
const logger = require("../middlewares/WinstonErrorMiddleware");
const requestService = require("./request.service");

async function checkUserHasGhostCard(userId) {
    const userCards = await postgres.AssignedCard.findAll({
        where: {
            userId: userId
        }
    });

    const GhostType = await postgres.CardType.findOne({
        where: { price: "0" }
    });

    const userGhostCards = await postgres.AssignedCard.findOne({
        where: {
            userId: userId
        },
        include: [
            {
                model: postgres.Card,
                where: {
                    cardTypeId: GhostType.id
                },
                required: true
            }
        ]
    });

    return userCards.length === 0 || userGhostCards;
}

async function swap(userId, { fromToken, toToken, balanceIn, cardId, agent }, req) {
    const userHasGhostCard = await checkUserHasGhostCard(userId);

    if (userHasGhostCard) throw new HumanError("You need to buy a camera first to use swap", 400);

    const user = await postgres.User.findOne({ where: { id: userId } });

    if (!user)
        throw new HumanError("User does not exist.", 400);

    const card = await postgres.Card.findOne({ where: { id: cardId } });

    if (!card)
        throw new HumanError("Camera does not exist.", 400);

    if (card.cardTypeId === 9)
        throw new HumanError("You can't swap with a ghost camera.", 400);

    if (card.cardTypeId === 9)
        throw new HumanError("You can't swap with a ghost camera.", 400);

    const assignCard = await postgres.AssignedCard.findOne({ where: { cardId: cardId } });
    const isLocked = await postgres.UserNftStake.count({
        where: {
            assignedCardId: assignCard.id
        }
    });

    if (isLocked > 0)
        throw new HumanError("You can't swap with a staked camera.", 400);


    if (fromToken === "BNB") {
        fromToken = "WBNB";
    }
    if (toToken === "BNB") {
        toToken = "WBNB";
    }

    let io = req.app.get("socketIo");

    const fromAssetNetwork = await postgres.AssetNetwork.findOne({ where: { apiCode: fromToken } });
    const toAssetNetwork = await postgres.AssetNetwork.findOne({ where: { apiCode: toToken } });

    if (!fromAssetNetwork || !toAssetNetwork) {
        throw new HumanError("Asset not found", 400);
    }

    const wallets = await getOrCreateWallet({
        userId,
        assetInId: fromAssetNetwork.assetId,
        assetOutId: toAssetNetwork.assetId,
        currencyIn: fromAssetNetwork.apiCode,
        currencyOut: toAssetNetwork.apiCode
    });

    if (+balanceIn > wallets.fromWallet.amount) {
        throw new HumanError("Your wallet balance is insufficient", 400);
    }

    const assetInId = fromAssetNetwork.assetId;
    const assetOutId = toAssetNetwork.assetId;

    const assetIn = await postgres.Asset.findOne({
        where: { id: assetInId }
    });
    const assetOut = await postgres.Asset.findOne({
        where: { id: assetOutId }
    });

    if (assetIn.needKyc === true) {
        if (user.isKyc === false) {
            const userRequest = await requestService.find({ userId: userId });
            if (userRequest && userRequest.status === "PENDING")
                throw new HumanError("You have a pending kyc , we are checking your docs", 400);

            if (userRequest && (userRequest.status === "DOING" || userRequest.status === "REQUESTED")) {
                return {
                    url: `${config.get("base.frontUrl")}/kyc/${userRequest.eventId}`,
                    eventId: userRequest.eventId,
                    message: "You have an incomplete kyc, you have to start it again."
                };
            }

            const createdRequest = await requestService.create(userId);

            return {
                url: `${config.get("base.frontUrl")}/kyc/${createdRequest.eventId}`,
                eventId: createdRequest.eventId,
                message: "you have to verify your identity to request this withdraw."
            };
        }
    }

    const STL = await postgres.Asset.findOne({
        where: { coin: "STL" }
    });

    let limitSwap = 0;

    if (assetInId === STL.id) {
        const damageAttributes = await postgres.UserAttribute.findAll({
            where: {
                userId: userId,
                type: "INITIAL"
            },
            include: [
                {
                    model: postgres.Attribute,
                    where: {
                        name: "DAMAGE",
                        type: "INITIAL"
                    },
                    required: true
                }
            ],
            order: [["amount", "desc"]]
        });

        if (damageAttributes.length === 0)
            throw new HumanError("Your heat damage is on Ash mode,please cool it down", 400);

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

        for (let i = 0; i < damageAttributes.length; i++) {
            const damageAttribute = damageAttributes[i];

            const heatPercent = await postgres.Attribute.findOne({
                where: {
                    name: "HEAT",
                    type: "FEE",
                    cardTypeId: damageAttribute.attribute.cardTypeId,
                    mode: {
                        [postgres.Op.lte]: damageAttribute.amount < 0 ? 0 : damageAttribute.amount - totalDamageLimit
                    }
                },
                order: [["mode", "DESC"]]
            });

            const damageAmount = heatPercent ? heatPercent.amount : 0;

            if (damageAmount >= 100) throw new HumanError("Your heat damage is on Ash mode,please cool it down", 400);
        }

        const cardTypeSwap = await postgres.Card.findAll({
            include: [
                {
                    model: postgres.CardType,
                    where: { name: { [postgres.Op.ne]: "Ghost" } },
                    required: true
                },
                {
                    model: postgres.AssignedCard,
                    where: { userId: req.userEntity.id },
                    required: true
                }
            ]
        });

        for (let i = 0; i < cardTypeSwap.length; i++) {
            const cardTypee = await postgres.CardType.findOne({ where: { id: cardTypeSwap[i].cardTypeId } });

            const userCameraLevel = await postgres.UserAttribute.findOne({
                where: {
                    userId: userId,
                    cardId: cardTypeSwap[i].id
                },
                include: [
                    {
                        model: postgres.Attribute,
                        where: { name: "LEVEL" },
                        required: true
                    }
                ]
            });

            limitSwap += parseFloat(cardTypee.swapLimit);
            const percent = (cardTypee.swapLimit * 1.5) / 100;
            if (userCameraLevel) {
                const level = Math.floor(userCameraLevel.amount);
                limitSwap += level * percent;
            }
        }

        // await applyHeat(req.userEntity.id, parseFloat(balanceIn), STL.id);
    } else {
        const setting = await postgres.Settings.findOne({
            where: {
                type: "SWAP",
                key: `${assetIn.coin}->${assetOut.coin}`
            }
        });
        if (assetIn.coin == "BUSD" && assetOut.coin == "STL" && (userId == 828 || userId == 1756)) {
            limitSwap = 10000000000;
        } else
            limitSwap = parseSetting(setting.value, "max");
    }

    if (parseFloat(balanceIn) > limitSwap) {
        throw new HumanError(`You can't swap more than ${limitSwap} ${assetIn.coin} in 24 Hours`, 400);
    }

    const systemFee = await fee({ fromTokenId: assetInId, toTokenId: assetOutId }, userId);

    let result;
    if (process.env.NODE_ENV !== "development") {
        const p = "/api/v1/wallet/swap";
        try {
            console.log({
                userId,
                agent,
                slippage: 1,
                fromToken: fromToken,
                toToken: toToken,
                balanceIn,
                systemFee: systemFee,
                apiLimit: limitSwap
            })

            result = await httpRequest(p, {
                userId,
                agent,
                slippage: 1,
                fromToken: fromToken,
                toToken: toToken,
                balanceIn,
                systemFee: systemFee,
                apiLimit: limitSwap
            });

            if (!result.data)
                throw new HumanError("The swap volume requests is currently high.please try again later", 400);

            if(result){
                const STL = await postgres.Asset.findOne({
                    where: {coin: "STL"}
                });
                if (STL && assetInId === STL.id) {
                    await applyHeat(userId, parseFloat(balanceIn) , cardId);
                }
            }

        } catch (e) {
            console.log({e})
            throw new HumanError("The swap volume requests is currently high.please try again later", 400);
        }

    } else {
        result = {
            data: {
                amount: 1234,
                txId: "11111",
                swapTxId: "1",
                systemFee: systemFee
            }
        };
    }

    io.to(`UserId:${userId}`).emit("wallet", JSON.stringify([wallets.fromWallet, wallets.toWallet]));

    return result.data;
}

async function applyHeat(userId, amount , cardId) {

    const userAttribute = await postgres.UserAttribute.findOne({
        where: {
            userId: userId,
            type: "INITIAL",
            cardId: cardId
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
                        where: {id: {[postgres.Op.ne]: 9}},
                    },
                ],
            },
        ],
        order: [
            ["amount", "ASC"],
            [postgres.Card, postgres.CardType, "price", "ASC"],
        ],
    });
    if (!userAttribute)
        return false;

    const newAmount = parseFloat(userAttribute.amount) + parseFloat(amount);

    await userAttribute.increment("amount", {by: amount});

    await postgres.UserAttribute.create({
        userId: userId,
        cardId: userAttribute.cardId,
        attributeId: userAttribute.attributeId,
        type: "FEE",
        amount: amount,
        description: `Your damage increased ${amount} because of your swap transaction.Your camera damage is ${newAmount} STL now.`
    })

    return true;
}

async function price(data) {
    const { fromToken, toToken, slippage, balanceIn, origin } = data;
    if (process.env.NODE_ENV === "development") {
        return { price: "240" };
    }
    try {
        const p = "/api/v1/wallet/swap/price";
        const result = await httpRequest(p, { fromToken, toToken, slippage, balanceIn, origin });
        return { price: result.data.price };
    } catch (e) {
        console.log(e);
        throw new HumanError("Please try again later", 400);
    }
}

function parseSetting(string, field) {
    let chain = -1;

    let string1 = string.split("-");

    for (let i = 0; i < string1.length; i++) {
        const item = string1[i];

        if (item.search(field) > -1) {
            chain = item.split("=")[1];
            return chain;
        }
    }
    return undefined;
}

async function fee(data, userId) {
    const { fromTokenId, toTokenId } = data;

    const fromToken = await postgres.Asset.findOne({
        where: { id: fromTokenId }
    });
    const toToken = await postgres.Asset.findOne({
        where: { id: toTokenId }
    });

    if (!fromToken || !toToken) throw new HumanError("from or to not found!", 400);

    let totalFee = 0;

    const STL = await postgres.Asset.findOne({
        where: { coin: "STL" }
    });

    if (fromTokenId !== STL.id) {
        const setting = await postgres.Settings.findOne({
            where: {
                type: "SWAP",
                key: `${fromToken.coin}->${toToken.coin}`
            }
        });
        if (fromToken.coin == "BUSD" && toToken.coin == "STL" && (userId == 828 || userId == 1756)) {
            totalFee = 0;
        } else totalFee = parseSetting(setting.value, "fee");

        return totalFee;
    }
    /*
      let userFee = await postgres.UserFee.findOne({
          where: {
              userId: userId,
              assetId: STL.id
          }
      });

      if (!userFee)
          userFee = await postgres.UserFee.create(
              {
                  userId: userId,
                  assetId: STL.id,
                  amount: 1
              },
              { returning: true }
          );

      totalFee = userFee.amount;*/
    return 1;
}

async function its12Oclock(userId) {
    let totalFee = 2;
    const cardType = await postgres.CardType.findOne({
        where: { name: { [postgres.Op.ne]: "Ghost" } },
        include: [
            {
                model: postgres.Card,
                required: true,
                include: [
                    {
                        model: postgres.AssignedCard,
                        where: { userId: userId },
                        required: true
                    }
                ]
            }
        ],
        order: [["price", "DESC"]]
    });

    if (!cardType) return;

    const STYL = await postgres.Asset.findOne({
        where: { coin: "STYL" }
    });

    const STL = await postgres.Asset.findOne({
        where: { coin: "STL" }
    });

    const user = await postgres.User.findOne({
        where: {
            id: userId
        }
    });

    if (!user) return console.log("This user does not exist!");

    if (STYL) {
        try {
            await StylStake(user, STYL.id);
        } catch (e) {
            logger.error("Styl stake error " + user.id);
            logger.error(e);
            console.log("Styl stake error", e);
        }
    }

    const lastSwap = await postgres.SwapTransaction.findOne({
        where: {
            userId: userId,
            assetInId: STL.id,
            status: "completed",
            createdAt: { [postgres.Op.gte]: moment().subtract(1, "days").format("YYYY-MM-DD") }
        }
    });

    if (!lastSwap) {
        try {
            const userCards = await postgres.AssignedCard.findAll({
                where: {
                    userId: userId
                },
                include: [
                    {
                        model: postgres.Card,
                        required: true,
                        include: [
                            {
                                model: postgres.CardType,
                                required: true,
                                where: { name: { [postgres.Op.ne]: "Ghost" } }
                            }
                        ]
                    }
                ]
            });

            for (let i = 0; i < userCards.length; i++) {
                const userCardType = userCards[i].card.cardType;

                const userDamage = await postgres.UserAttribute.findOne({
                    where: {
                        userId: userId,
                        cardId: userCards[i].cardId,
                        type: "INITIAL"
                    },
                    include: [
                        {
                            model: postgres.Attribute,
                            where: {
                                name: "DAMAGE",
                                cardTypeId: userCardType.id,
                                type: "INITIAL"
                            },
                            required: true
                        }
                    ]
                });

                if (userDamage && userDamage.amount && userDamage.amount > 0) {
                    if (userDamage.amount - userCardType.dailyCoolDown < 0) {
                        await userDamage.update("amount", 0);
                    } else {
                        await userDamage.decrement("amount", { by: userCardType.dailyCoolDown });
                    }

                    await postgres.UserAttribute.create({
                        userId: userId,
                        cardId: userDamage.cardId,
                        attributeId: userDamage.attributeId,
                        type: "FEE",
                        amount: -userCardType.dailyCoolDown,
                        description: `Your ${userCardType.name} damage cool down by ${userCardType.dailyCoolDown} STL`
                    });

                    await postgres.UserNotification.create({
                        userId: userId,
                        title: `Damage CoolDown`,
                        description: `Your ${userCardType.name} damage cool down by ${userCardType.dailyCoolDown} STL`
                    });
                }
            }
        } catch (e) {
            logger.error("cooling down error " + user.id);
            logger.error(e);
            console.log("cooling down error", e);
        }
    }

    /*
      const userRegisterAt = moment(user.createdAt, "YYYY-MM-DD");
      const today = moment();
  */

    // const daysDifference = today.diff(userRegisterAt, "days");

    /*const memberShip = await postgres.Membership.findOne({
          where: {
              days: { [postgres.Op.gte]: daysDifference }
          },
          order: [["days", "ASC"]]
      });
      if (memberShip) {
          totalFee += parseFloat(+memberShip.amount);
      }*/

    /*if (STYL) {
          const userStyl = await postgres.UserWallet.findOne({
              where: {
                  assetId: STYL.id,
                  userId: userId
              }
          });

          if (userStyl) {
              const stylHolding = await postgres.Holding.findOne({
                  where: {
                      assetId: STYL.id,
                      minimum: { [postgres.Op.lte]: userStyl.amount }
                  },
                  order: [["minimum", "DESC"]]
              });

              if (stylHolding) {
                  totalFee += parseFloat(+stylHolding.amount);
              }
          }
      }*/

    /* if (STL) {
          const userStl = await postgres.UserWallet.findOne({
              where: {
                  assetId: STL.id,
                  userId: userId
              }
          });

          if (userStl) {
              const stlHolding = await postgres.Holding.findOne({
                  where: {
                      assetId: STL.id,
                      minimum: { [postgres.Op.lte]: userStl.amount }
                  },
                  order: [["minimum", "DESC"]]
              });

              if (stlHolding) {
                  totalFee += parseFloat(+stlHolding.amount);
              }
          }
      }*/

    /* let userFee = await postgres.UserFee.findOne({
          where: {
              userId: userId,
              assetId: STL.id
          }
      });

      if (!userFee)
          userFee = await postgres.UserFee.create(
              {
                  userId: userId,
                  assetId: STL.id,
                  amount: 1
              },
              { returning: true }
          );
  */

    /*if (!lastSwap) {
          try {
              await StlStake(+cardType.swapConstant, STL.id, user);
          } catch (e) {
              logger.error("Stl stake error " + user.id);
              logger.error(e);
              console.log("Stl stake error", e);
          }
      }*/

    /*
      if (userFee.amount > 1 && !lastSwap) {
          userFee.amount = parseFloat(userFee.amount) - totalFee;
          if (userFee.amount <= 1) userFee.amount = 1;
          await userFee.save();

          await postgres.UserNotification.create({
              userId: userId,
              title: `Swap Fee`,
              description: `Your swap fee reduced to ${userFee.amount.toFixed(2)}%`
          });
      }*/

    return "ok";
}

async function StlStake(swapConstant, stlId, user) {
    let systemWallet = await postgres.SystemWallet.findOne({
        where: { assetId: stlId }
    });

    let userWallet = await postgres.UserWallet.findOne({
        where: { userId: user.id, assetId: stlId }
    });

    if (!userWallet) {
        userWallet = await postgres.UserWallet.create({
            where: { userId: user.id, assetId: stlId }
        });
    }

    if (systemWallet) await systemWallet.decrement("amount", { by: swapConstant });

    await userWallet.increment("amount", { by: swapConstant });

    await postgres.UserStakePrize.create({
        userId: user.id,
        assetId: stlId,
        amount: swapConstant
    });

    await postgres.UserNotification.create({
        userId: user.id,
        title: `Staking Reward`,
        description: `You have earned ${swapConstant} STL for staking`
    });

    sendPushToToken(
        user,
        {},
        {
            title: "Staking Reward",
            body: `You have earned ${swapConstant} STL for staking`
        }
    );
}

async function StylStake(user, stylId) {
    //STYL stake
    const stake = await postgres.UserStylStake.findOne({
        where: {
            userId: user.id
        }
    });

    if (stake) {
        if (stake.days - 1 <= 0) {
            const plan = await postgres.StylStake.findOne({
                where: {
                    id: stake.stylStakeId
                },
                paranoid: false
            });

            if (plan) {
                const profit = parseFloat(stake.userAmount) * (parseFloat(stake.percent) / 100);
                const stylAmount = parseFloat(stake.userAmount) + profit;

                const userStyl = await postgres.UserWallet.findOne({
                    where: {
                        assetId: stylId,
                        userId: user.id
                    }
                });

                const transaction = await postgres.sequelize.transaction();

                let isSuccess = false;

                try {
                    if (userStyl) {
                        await userStyl.increment("amount", { by: +stylAmount, transaction });
                        await userStyl.decrement("stake", { by: +parseFloat(stake.userAmount), transaction });
                    }
                    stake.days = parseFloat(stake.days - 1);
                    stake.profit = profit;
                    await stake.save({ transaction });
                    await stake.destroy({ transaction });

                    await transaction.commit();

                    isSuccess = true;
                } catch (e) {
                    await transaction.rollback();
                    throw e;
                }

                if (isSuccess) {
                    await postgres.UserNotification.create({
                        userId: user.id,
                        title: `STYL Stake Reward`,
                        description: `Your staking days are over and you earned ${profit} STYL`
                    });

                    sendPushToToken(
                        user,
                        {},
                        {
                            title: "STYL Stake Reward",
                            body: `Your staking days are over and you earned ${profit} STYL`
                        }
                    );
                }
            } else {
                logger.error(`Plan ${stake.stylStakeId} does not exists!`);
            }
        } else {
            stake.days = parseFloat(stake.days) - 1;
            await stake.save();
        }
    }
}

async function getOrCreateWallet(data) {
    const { userId, assetInId, assetOutId, currencyIn, currencyOut } = data;
    const wallets = await postgres.UserWallet.findAll({
        where: { userId, assetId: { [postgres.Op.in]: [assetInId, assetOutId] } },
        raw: true
    });

    let fromWallet = wallets.find((w) => w.assetId === assetInId);
    if (!fromWallet) {
        fromWallet = await generateWallet(userId, assetInId, currencyIn);
    }

    let toWallet = wallets.find((w) => w.assetId === assetOutId);
    if (!toWallet) {
        toWallet = await generateWallet(userId, assetOutId, currencyOut);
    }

    if (!fromWallet || !toWallet) {
        throw new HumanError(Errors.INTERNAL_ERROR.MESSAGE, Errors.INTERNAL_ERROR.CODE);
    }

    return { fromWallet, toWallet };
}

async function generateWallet(userId, assetId, currency) {
    await generateAddress(userId, currency);
    return await postgres.UserWallet.create({ userId, assetId });
}

async function generateAddress(userId, currency) {
    try {
        const baseUrl = config.get("clients.wallet.url");
        const apiKey = config.get("clients.wallet.apiKey");
        const callUrl = `/api/v1/wallet/address?currency=${currency}&userId=${userId}&clientId=1`;

        console.log({
            baseUrl: `${baseUrl}${callUrl}`,
            apiKey,
            callUrl
        });

        const result = await axios.get(`${baseUrl}${callUrl}`, {
            headers: {
                "Content-Type": "Application/json",
                Accept: "application/json",
                "X-API-KEY": apiKey
            }
        });

        if (result.status != 200) {
            throw new HumanError(Errors.INTERNAL_ERROR.MESSAGE, Errors.INTERNAL_ERROR.CODE);
        }

        return result.data;
    } catch (error) {
        throw new HumanError(Errors.INTERNAL_ERROR.MESSAGE, Errors.INTERNAL_ERROR.CODE);
    }
}

function httpRequest(path, data) {
    return new Promise((resolve, reject) => {
        const baseUrl = config.get("clients.wallet.url");
        const apiKey = config.get("clients.wallet.apiKey");
        axios
            .post(`${baseUrl}${path}`, data, {
                headers: {
                    "Content-Type": "Application/json",
                    Accept: "application/json",
                    "X-API-KEY": apiKey
                }
            })
            .then((res) => {
                if (res.status == 200) {
                    resolve(res.data);
                } else {
                    if (res.data && res.data.error) {
                        reject(new HumanError(res.data.error, 422));
                    } else {
                        reject(new HumanError(Errors.INTERNAL_ERROR.MESSAGE, Errors.INTERNAL_ERROR.CODE));
                    }
                }
            })
            .catch((err) => {
                if (err.response?.data && err.response?.data.error) {
                    reject(new HumanError(err.response.data.error, 422));
                } else {
                    reject(new HumanError(Errors.INTERNAL_ERROR.MESSAGE, Errors.INTERNAL_ERROR.CODE));
                }
            });
    });
}

async function activation(data) {
    const { id } = data;
    const swap = await postgres.Settings.findOne({
        where: { id: id },
        paranoid: false
    });

    if (swap.deletedAt == null) await swap.destroy();
    else await swap.restore();

    return swap;
}

module.exports = {
    swap,
    price,
    activation,
    httpRequest,
    fee,
    its12Oclock,
    checkUserHasGhostCard
};
