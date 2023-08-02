const {postgres} = require("../../../databases");
const {NotFoundError} = require("../../errorhandler");
const {sendPushToToken} = require("../../notification.service");


/**
 * get  giveaway list
 */
async function getGiveaways(page, limit, order, sort, assetId, userId) {
    let query = {};

    if (assetId)
        query.assetId = {[postgres.Op.in]: assetId};


    if (userId)
        query.userId = {[postgres.Op.in]: userId};


    let result = await postgres.GiveAway.findAndCountAll({
        where: query,

        include: [{
            model: postgres.Asset,
        }, {
            model: postgres.User,
        }
        ],

        limit: limit,
        offset: (page - 1) * limit,
        order: [[sort, order]]
    });

    return ({
        total: result.count,
        pageSize: limit,
        page,
        data: result.rows
    });
}


/**
 * get  giveaway
 */
async function getGiveaway(id) {
    let result = await postgres.GiveAway.findOne({
        where: {id},
        include: [{
            model: postgres.Asset,
        }, {
            model: postgres.User,
        }
        ]
    });


    return result;
}

/**
 * add  giveaway
 */
async function addGiveaway(data) {
    const {userId, amount, reason, isDeposit} = data;
    let message = "";

    const asset = await postgres.Asset.findOne({where: {coin: "STL"}});
    if (!asset)
        throw new NotFoundError("asset does not exists")

    const user = await postgres.User.findOne({where: {id: userId}});
    if (!user)
        throw new NotFoundError("user does not exists")

    let transaction = await postgres.sequelize.transaction();

    try {
        const wallet = await postgres.UserWallet.findOne({
            where: {assetId: asset.id, userId: userId},
            transaction: transaction
        })

        if (isDeposit) {
            await wallet.increment("amount", {by: Math.abs(parseFloat(amount)), transaction: transaction})
            message = `You have earned ${amount} ${asset.name} ${reason}`;

        } else {
            if ((parseFloat(wallet.amount) - Math.abs(parseFloat(amount))) <= 0)
                await wallet.update({amount: 0}, {transaction: transaction})
            else
                await wallet.decrement("amount", {by: Math.abs(parseFloat(amount)), transaction: transaction})
            message = `You have lost ${amount} ${asset.name} ${reason}`;

        }
        await postgres.GiveAway.create({
            assetId: asset.id,
            userId,
            amount,
            reason,
            isDeposit
        }, {transaction: transaction})

        await transaction.commit()


    } catch (e) {
        await transaction.rollback();
        throw e;
    }


    sendPushToToken(user, {}, {
        title: "giveaway",
        body: message
    });

    await postgres.UserNotification.create({userId: userId, title: "giveaway", description: message, tag: "giveaway"})

    return ("success")

}

/**
 * update  giveaway
 */
async function editGiveaway(id, assetId, userId, amount, reason, isDeposit) {

    const asset = await postgres.Asset.findOne({where: {id: assetId}});
    if (!asset)
        throw new NotFoundError("asset does not exists")

    const user = await postgres.User.findOne({where: {id: userId}});
    if (!user)
        throw new NotFoundError("user does not exists")

    let update = {};

    if (assetId) update.assetId = assetId;
    if (userId) update.userId = userId;
    if (amount) update.amount = amount;
    if (reason) update.reason = reason;
    if (isDeposit) update.isDeposit = isDeposit;

    await postgres.GiveAway.update(update, {where: {id}});
    return await postgres.GiveAway.findOne({
        where: {id},
        include: [{
            model: postgres.Asset,
        }, {
            model: postgres.User,
        }
        ]
    });
}


/**
 * delete  giveaway
 */
async function delGiveaway(id) {

    await postgres.GiveAway.destroy({where: {id}});
    return ("Successful");
}

module.exports = {
    getGiveaways,
    addGiveaway,
    editGiveaway,
    getGiveaway,
    delGiveaway
};
