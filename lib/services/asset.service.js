const { postgres, redis } = require("./../databases");
const { HumanError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const NotFoundError = require("./errorhandler/NotFound");
const em = require("exact-math");
const { jwt, mail, sms, otpGenerator } = require("../utils");
const job = require("../job/index");
const requestService = require("./request.service");
const config = require("config");
const axios = require("axios");

async function checkUserHasGhostCard(userId) {
	let userCards;

	if (parseInt(userId) < 50000) {
		userCards = await postgres.AssignedCard.findAll({
			where: {
				userId: userId,
			},
		});
	} else {
		userCards = await postgres.AuctionLog.findAll({
			where: {
				userId: userId,
				status: "FINISHED",
			},
		});
	}

	const GhostType = await postgres.CardType.findOne({
		where: { price: "0" },
	});

	const userGhostCards = await postgres.AssignedCard.findOne({
		where: {
			userId: userId,
		},
		include: [
			{
				model: postgres.Card,
				where: {
					cardTypeId: GhostType.id,
				},
				required: true,
			},
		],
	});

	return userCards.length === 0 || userGhostCards;
}

/**
 * get user wallet information
 * @param {*} userId
 * @returns
 */
async function getWallets(userId) {
	return await postgres.Asset.findAll({
		where: {
			isActive: true,
		},
		nest: true,
		attributes: ["id", "coin", "name", "precision", "type", "canDeposit", "canWithdraw", "icon"],
		include: {
			model: postgres.UserWallet,
			nested: true,
			where: {
				userId,
			},
			attributes: ["id", "assetId", "userId", "amount", "frozen", "pending", "isLocked"],
			as: "wallets",
			required: false,
		},
		raw: true,
	});
}

/**
 * create new wallet for old users
 */
function createWalletForUsersByAsset({ assetNetworkId }) {
	return new Promise(async (resolve, reject) => {
		const assetNetwork = await postgres.AssetNetwork.findOne({ where: { id: assetNetworkId }, raw: true });
		if (!assetNetwork) {
			return reject(
				new NotFoundError(Errors.ASSET_NETWORK_NOT_FOUND.MESSAGE, Errors.ASSET_NETWORK_NOT_FOUND.CODE),
			);
		}
		const publish = await job.publisher.send(
			"createWalletForUsers",
			JSON.stringify({ currency: assetNetwork.apiCode, assetId: assetNetwork.assetId }),
		);
		if (!publish) {
			return reject(new HumanError(Errors.INTERNAL_ERROR.MESSAGE, 400));
		}
		return resolve();
	});
}

/**
 * get assets list
 */
async function getAssets() {
	return await postgres.Asset.findAll({
		where: {
			isActive: true,
		},
		nest: true,
		attributes: ["id", "coin", "name", "precision", "type", "canDeposit", "canWithdraw", "icon"],
		raw: true,
	});
}

async function getAssetSingle(id) {
	return await postgres.Asset.findOne({
		where: { id, isActive: true },
		nest: true,
		attributes: ["id", "coin", "name", "precision", "type", "canDeposit", "canWithdraw", "icon"],
		raw: true,
	});
}

/**
 * get user transaction list
 * @param {*} data
 * @returns
 */
async function readTransactions(data) {
	const {
		page,
		limit,
		order,
		type,
		assetNetworkId,
		address,
		tag,
		status,
		txid,
		info,
		account,
		assetId,
		index,
		id,
		userId,
	} = data;
	const offset = 0 + (page - 1) * limit;

	const query = {
		...(type ? { type } : {}),
		...(assetNetworkId ? { assetNetworkId } : {}),
		...(address ? { address } : {}),
		...(tag ? { tag } : {}),
		...(status ? { status } : {}),
		...(txid ? { txid } : {}),
		...(info ? { info } : {}),
		...(account ? { account } : {}),
		...(assetId ? { assetId } : {}),
		...(index ? { index } : {}),
		...(id ? { id } : {}),
		userId,
	};

	let result = await postgres.UserTransaction.findAndCountAll({
		where: query,
		limit,
		offset,
		attributes: { exclude: ["userId", "updatedAt", "deletedAt", "assetNetworkId"] },
		order: [["createdAt", order]],
		raw: true,
		nest: true,
		include: [
			{
				model: postgres.AssetNetwork,
				as: "assetNetworks",
				attributes: ["id"],
				include: [
					{ model: postgres.Asset, as: "asset", attributes: ["id", "coin"] },
					{ model: postgres.Network, as: "network", attributes: ["id", "name", "type"] },
				],
			},
			{ model: postgres.Asset, as: "asset", attributes: ["id", "coin"] },
		],
	});

	return {
		total: result.count,
		pageSize: limit,
		page,
		data: result.rows,
	};
}

/**
 * confirm user withdraw request and save it in db
 */
async function confirmWithdraw({ token, code }, userEntity, io) {
	const payload = jwt.verify(token);

	if (!payload) throw new HumanError("The code is incorrect", 400, { token });

	let form = await redis.client.get(`_confirm_withdraw_user_${userEntity.id}_`);

	form = JSON.parse(form);

	if (!form) throw new HumanError("There is no user with the details entered in the system", 400);

	let check = false;
	switch (payload.type) {
		case "mobile": {
			const smsCheck = await sms.check(userEntity.mobile, code);
			if (smsCheck) check = true;
			break;
		}
		case "email": {
			if (code == form.otpCode) check = true;
			break;
		}
		default: {
			check = false;
			break;
		}
	}

	if (!check) throw new HumanError("An error occurred while validating the token", 400);

	let { userId, assetId, totalAmount } = form;

	//check user wallet for this asset is exist
	let wallet = await postgres.UserWallet.findOne({ where: { userId, assetId } });

	if (!wallet) throw new HumanError("User Wallet not found", 400);

	if (totalAmount > +wallet.amount) throw new HumanError("The requested amount is more than the users balance", 400);

	//save new balance in wallet
	wallet.amount = em.sub(+wallet.amount, totalAmount);
	wallet.pending = em.add(+wallet.pending, totalAmount);

	wallet.amount = wallet.amount.toFixed(2);
	wallet.pending = wallet.pending.toFixed(2);

	await wallet.save();

	const transaction = await postgres.UserTransaction.create(form);

	if (!transaction) throw new HumanError("An error occurred while registering the transaction", 400);

	const asset = await postgres.Asset.findOne({ where: { id: assetId } });

	/*const busd = await postgres.Asset.findOne({ where: { coin: "BUSD" } });
        if (busd && asset) {

            let amountForHeat = totalAmount;
            if (busd.id !== asset.id) {

                let fromToken;
                if (asset.coin === "BNB") {
                    fromToken = "BNB";
                } else {
                    fromToken = asset.coin + "_BSC";
                }

                try {

                    const result = await price({
                        fromToken: fromToken,
                        toToken: "BUSD_BSC",
                        slippage: 1,
                        balanceIn: totalAmount,
                        origin: "in"
                    });

                    amountForHeat = result.price;
                } catch (e) {
                    console.log(e)
                }

            }

            await applyHeat(userId, amountForHeat, assetId);

        }*/

	await redis.client.del(`_confirm_withdraw_user_${userEntity.id}_`);

	let title = `User ${
		userEntity.name ? (userEntity.email ? userEntity.email : userEntity.mobile) : null
	}  Successfully registered a new withdraw`;
	let notif = await postgres.ManagerNotification.create({ title, userId, tag: "TRANSACTION" });
	io.to(`Manager`).emit("notification", JSON.stringify(notif));

	return "Successful";
}

async function makeWithdrawRequest(data, io) {
	let { id, address, amount, tag, user, from_agent_panel } = data;
	let { email, id: userId, level, max_withdraw_per_day, isKyc } = user;

	let assetNetwork = await postgres.AssetNetwork.findOne({
		where: { id, isActive: true, canWithdraw: true },
		include: [
			{
				model: postgres.Asset,
				attributes: ["coin"],
				as: "asset",
			},
		],
		raw: true,
	});

	let busdAssetNetwork = await postgres.AssetNetwork.findOne({
		where: { apiCode: "BUSD_BSC", isActive: true, canWithdraw: true },
		include: [
			{
				model: postgres.Asset,
				attributes: ["coin"],
				as: "asset",
			},
		],
		raw: true,
	});

	if (!assetNetwork) throw new HumanError("Asset Network not found", 400);

	let asset = await postgres.Asset.findOne({
		where: { coin: assetNetwork["asset.coin"] === "STYL" ? "STYL" : "BUSD", isActive: true, canWithdraw: true },
	});

	if (!asset) throw new HumanError("Asset not found", 400);

	const userHasGhostCard = await checkUserHasGhostCard(userId);

	if (userHasGhostCard) throw new HumanError("You need to buy a camera to create a withdraw request!", 400);

	if (asset.needKyc === true) {
		if (isKyc === false) {
			const userRequest = await requestService.find({ userId: userId });
			if (userRequest && userRequest.status === "PENDING")
				throw new HumanError("You have a pending kyc , we are checking your docs", 400);

			if (userRequest && (userRequest.status === "DOING" || userRequest.status === "REQUESTED")) {
				return {
					url: `${config.get("base.frontUrl")}/kyc/${userRequest.eventId}`,
					eventId: userRequest.eventId,
					message: "You have an incomplete kyc, you have to start it again.",
				};
			}

			const createdRequest = await requestService.create(userId);

			return {
				url: `${config.get("base.frontUrl")}/kyc/${createdRequest.eventId}`,
				eventId: createdRequest.eventId,
				message: "you have to verify your identity to request this withdraw.",
			};
		}
	}

	// set max withdraw for bnb
	if (asset.coin === "BUSD") {
		const TODAY_START = new Date().setHours(0, 0, 0, 0);
		const NOW = new Date();

		let user_txs = await postgres.UserTransaction.findAll({
			where: {
				type: "WITHDRAW",
				status: { [postgres.Op.ne]: "REJECTED" },
				assetId: asset.id,
				userId,
				createdAt: {
					[postgres.Op.gt]: TODAY_START,
					[postgres.Op.lt]: NOW,
				},
			},
		});

		let total_amount = 0;
		user_txs.forEach(function (tx) {
			total_amount += parseInt(tx.requestedAmount);
		});

		if (+total_amount + +amount > max_withdraw_per_day)
			throw new HumanError("Maximum allowed withdraw per day is: " + max_withdraw_per_day, 400);
	}

	// check user is agent for withdraw from agent panel
	if (level !== "AGENT") from_agent_panel = false;

	let { depositFee, fee, gasPrice, gasLimit } = assetNetwork;

	let { withdrawFee, withdrawMin } = asset.coin === "STYL" ? assetNetwork : busdAssetNetwork;

	// check minimum value for withdraw
	if (amount < +withdrawMin) throw new HumanError("Minimum allowed for withdraw: " + withdrawMin, 400);

	let systemProfit = 0;
	if (+withdrawFee > 0) {
		systemProfit = (+amount * +withdrawFee) / 100;
	}

	//calculate all transfer costs
	let totalAmount = em.add(+amount, +systemProfit);

	//check user wallet for this asset is existed
	let wallet = await postgres.UserWallet.findOne({ where: { userId, assetId: asset.id } });

	if (!wallet) throw new NotFoundError("User Wallet not found", 400);

	if (totalAmount > +wallet.amount) throw new HumanError("The requested amount is more than the users balance", 400);

	// create otp Token and otp Code
	let otpToken = jwt.generate({ type: email ? "email" : "mobile" }, null, 600),
		otpCode = otpGenerator.generate(4, {
			digits: true,
			alphabets: false,
			upperCase: false,
			specialChars: false,
		});

	let basePrice = 1;
	if (asset.coin === "BUSD") {
		const doc = await price({
			fromToken: assetNetwork["asset.coin"] === "ETH" ? "USDT" : "BUSD_BSC",
			toToken: assetNetwork["asset.coin"],
			slippage: 1,
			balanceIn: 1,
			origin: "in",
		});

		basePrice = doc.price;
	}

	await mail(email, otpCode, "WITHDRAW");

	// Temporarily save the user request in the cache
	await redis.client.set(
		`_confirm_withdraw_user_${userId}_`,
		JSON.stringify({
			type: "WITHDRAW",
			assetNetworkId: id,
			userId,
			address,
			tag,
			amount: +amount * +basePrice,
			requestedAmount: +amount,
			withdrawFee: +withdrawFee,
			depositFee: +depositFee,
			fee: +fee,
			gasPrice: +gasPrice,
			gasLimit: +gasLimit,
			otpCode,
			totalAmount,
			assetId: asset.id,
			from_agent_panel,
			origin: "ADMIN",
			profit: systemProfit,
		}),
		"EX",
		600,
	);

	return { exp: 600, token: otpToken };
}

/**
 * get asset list
 * @param {*} data { type }
 * @returns
 */
function getAsset({ type }) {
	return new Promise(async (resolve, reject) => {
		let query = { isActive: true };

		if (type) query.type = type;

		let result = await postgres.Asset.findAll({
			where: query,
			raw: true,
			attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
			order: ["createdAt"],
		});

		const vlx = result.filter((r) => r.coin == "VLX")?.[0];

		if (vlx) {
			const vlxWallets = await postgres.sequelize.query(
				{
					query: `SELECT sum(amount) as balance FROM "systemWallets" WHERE "assetId" = ?`,
					values: [vlx.id],
				},
				{ type: postgres.sequelize.QueryTypes.SELECT },
			);

			vlx.price = +(
				+vlxWallets[0].balance <= 2000000 ? 0.01 : +vlxWallets[0].balance <= 3000000 ? 0.02 : 0.03
			).toPrecision(6);
		}

		resolve(result);
	});
}

async function getSwapRate(page, limit) {
	let result = await postgres.Settings.findAndCountAll({
		where: {
			type: "SWAP",
			// key: `${baseCoin.coin}->${assetCoin.coin}`
		},
		limit: limit,
		offset: (page - 1) * limit,
	});

	let newResult = result.rows.map((value) => {
		let values = value.value.split("-");
		let results = {
			key: value.key,
		};
		values.forEach((value) => {
			let tmp = value.split("=");
			results[tmp[0]] = tmp[1];
		});
		return results;
	});

	return {
		total: 0,
		pageSize: limit,
		page,
		data: [],
	};
}

async function exchange(amount, coin) {
	if (coin === "BUSD" || coin === "USDT") {
		return {
			price: +amount,
		};
	}

	const { price: basePrice } = await price({
		fromToken: coin === "ETH" ? "USDT" : "BUSD_BSC",
		toToken: coin,
		slippage: 1,
		balanceIn: 1,
		origin: "in",
	});

	return {
		price: +amount * +basePrice,
	};
}

async function price(data) {
	const { fromToken, toToken, slippage, balanceIn, origin } = data;

	if ((fromToken === "BUSD_BSC" && toToken === "USDT") || (fromToken === "BUSD_BSC" && toToken === "BUSD")) {
		return { price: balanceIn };
	}
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

function httpRequest(path, data) {
	return new Promise((resolve, reject) => {
		const baseUrl = config.get("clients.wallet.url");

		const apiKey = config.get("clients.wallet.apiKey");
		axios
			.post(`${baseUrl}${path}`, data, {
				headers: {
					"Content-Type": "Application/json",
					Accept: "application/json",
					"X-API-KEY": apiKey,
				},
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

module.exports = {
	getWallets,
	readTransactions,
	confirmWithdraw,
	makeWithdrawRequest,
	getSwapRate,
	getAsset,
	getAssets,
	getAssetSingle,
	createWalletForUsersByAsset,
	exchange,
	price,
};
