const { postgres } = require("./../databases");
const { notification } = require("../data/constans");
const { NotFoundError, HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const FCM = require("fcm-push");
const config = require("config");
const logger = require("../middlewares/WinstonErrorMiddleware")


const { mail, sms } = require("./../utils");
const { events } = require("../data/constans");

function get(type, page = 1, limit = 10, status, userId = null) {
    return new Promise(async (resolve, reject) => {
        let offset = 0 + (page - 1) * limit,
            query = { userId };

        if (type === "public")
            query.userId = null;

        if (typeof status === "boolean")
            query.status = status;

        let result = await postgres.UserNotification.findAll({
            where: query,
            limit: limit,
            offset,
            order: [["createdAt", "DESC"]],
            attributes: { exclude: ["deletedAt", "updatedAt"] }
        });

        resolve({
            total: result.length,
            pageSize: limit,
            page,
            data: result
        });
    });
}

function updateToken(token, userId) {
    return new Promise(async (resolve, reject) => {
        await postgres.User.update({
            pushToken: token
        }, {
            where: {
                id: userId
            }
        });

        return resolve({
            message: "ok"
        });
    });
}


function changeStatus(userId, notification_id, model = "UserNotification") {
    return new Promise(async (resolve, reject) => {

        let query = { userId };

        if (notification_id)
            query.id = notification_id;

        model = model === "UserNotification" ? postgres.UserNotification : postgres.ManagerNotification;

        await model.update({ status: true }, { where: query });

        return resolve("Successful");
    });
}


async function readNotification(userId, notification_id) {
    let query = {};

    query.userId = userId;
    query.id = { [postgres.Op.in]: notification_id };

    await postgres.UserNotification.update({ status: true }, { where: query });
    return await postgres.UserNotification.findAll({ where: query });

}


function set(
    userId = null,
    title = "",
    description = "",
    tag = "",
    link = "",
    image = "",
    flash = false,
    model = "UserNotification"
) {
    return new Promise(async (resolve, reject) => {
        try {
            model = model === "UserNotification" ? postgres.UserNotification : postgres.ManagerNotification;

            await model.create({
                userId,
                title,
                description,
                tag,
                link,
                image,
                flash,
                status: false
            });

            return resolve("Successful");
        } catch (e) {
            console.log(e);
            reject(e);
        }
    });
}

function addEvent(args, result, name, type) {
    return new Promise(async (resolve, reject) => {
        // if (name === events.users.add) set(null, "Create New User", "", "", "", "", true, "ManagerNotification");

        if (name === events.balance.irr)
            set(null, "Charge With IRR Gateway", "", "", "", "", true, "ManagerNotification");

        if (name === events.kyc.add) set(null, "Create New KYC", "", "", "", "", true, "ManagerNotification");

        if (name === events.withdraw.add) set(null, "Create New Withdraw", "", "", "", "", true, "ManagerNotification");

        resolve(true);
    });
}

/**
 * send web and push notification to user
 * @param {*} args
 * @param {*} result
 * @param {*} name
 * @param {*} type
 * @returns
 */
function addUserEvent(args, result, name, type) {
    return new Promise(async (resolve, reject) => {
        let { userId, assetId, amount, nftName, nftAmount } = args;

        if (!userId) return resolve(false);

        let user = await postgres.User.findOne({ where: { id: userId } });

        if (!user) return resolve(false);

        // let assetNetwork = await postgres.AssetNetwork.findOne({
        // 	where: { id: assetNetworkId },
        // 	nest: true,
        // 	include: [{ model: postgres.Asset, as: "asset" }],
        // });
        let asset;
        if (assetId)
            asset = await postgres.Asset.findOne({
                where: { id: assetId },
                raw: true
            });

        if (name === events.withdraw.completed) {
            let msg = `Withdraw Request For ${amount} ${asset?.coin} is completed`;

            set(userId, msg, "", "", "", "", true, "UserNotification");

            //send push notification
            sendPushToToken(user, {}, { title: "Withdraw", body: msg });

            //send notice email or sms
            if (user.email) mail(user.email, null, "NOTICES", { title: "Withdraw", text: msg });
            //else sms.notice(user.mobile, msg);
        }

        if (name === events.deposit.add) {
            let msg = `Deposit Request For ${amount} ${asset?.coin} is completed`;

            set(userId, msg, "", "", "", "", true, "UserNotification");

            //send push notification
            sendPushToToken(user, {}, { title: "Deposit", body: msg });

            //send notice email or sms
            if (user.email) mail(user.email, null, "NOTICES", { title: "Deposit", text: msg });
            //	else sms.notice(user.mobile, msg);
        }

        if (name === events.card.purchase) {
            let msg = `Your bought ${nftName} with amount of ${nftAmount} BNB.`;
            set(userId, msg, "", "", "", "", true, "UserNotification");

            //send push notification
            sendPushToToken(user, {}, { title: "Card purchase", body: msg });

            //send notice email or sms
            if (user.email)
                mail(user.email, null, "NOTICES_CARD_PURCHASE", { nft_code: nftName, nft_amount: nftAmount });
            //	else sms.notice(user.mobile, msg);
        }

        resolve(true);
    });
}

/**
 * send web and push notification to user if withdraw request is rejected
 * @param {*} args
 * @param {*} result
 * @param {*} name
 * @param {*} type
 * @returns
 */
function addRejectEvent(args, result, name, type) {
    return new Promise(async (resolve, reject) => {
        let { userId, assetNetworkId, amount } = args;

        if (!userId) return resolve(false);

        let user = await postgres.User.findOne({ where: { id: userId } });

        if (!user) return resolve(false);

        let assetNetwork = await postgres.AssetNetwork.findOne({
            where: { id: assetNetworkId },
            nest: true,
            include: [{ model: postgres.Asset, as: "asset" }]
        });

        let msg = `Withdraw Request For ${amount} ${assetNetwork?.asset?.coin} is rejected!`;

        set(userId, msg, "", "", "", "", true, "UserNotification");

        //send push notification
        sendPushToToken(user, {}, { title: "Withdraw", body: msg });

        //send notice email or sms
        if (user.email)
            mail(user.email, null, "NOTICES", { title: "Withdraw", text: msg });
        else
            sms.notice(user.mobile, msg);

        resolve(true);
    });
}

async function sendPushToToken(user, data = {}, notification = {}) {

    let fcm = new FCM(config.get("services.pushNotification.serverKey"));

    if (!user.pushToken)
        return;

    const message = {
        to: user.pushToken,
        collapse_key: "Stylike",
        data: data,
        notification: notification
    };

    try {
        const response = await fcm.send(message);

        console.log("Successfully sent with response: ", response);

    } catch (err) {
        // console.log("Something has gone wrong with firebase!", err);
    }

}

module.exports = {
    get,
    changeStatus,
    sendPushToToken,
    updateToken,
    addRejectEvent,
    addUserEvent,
    addEvent,
    readNotification
};
