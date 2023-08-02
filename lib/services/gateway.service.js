

const { EnPayment, BahamtaPayment } = require("./gateways");
const { postgres, redis } = require("./../databases");
const { paymentStatus } = require("../data/constans");
const dataTypes = require("./../data/constans");
const config = require("config");
const walletService = require("./wallet.service");
const em = require("exact-math");
const crypto = require("crypto");

const uuid = require("uuid");

const { UserPayment, UserWallet, Asset, SystemWallet } = postgres;
const { NotFoundError, HumanError, InvalidRequestError, ConflictError, InternalError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const { User } = require("../databases/postgres");
const hooks = require("../hooks");
const { events } = require("../data/constans");
const { default: axios } = require("axios");
const subscriptionService = require("./subscription.service");
/**
 *
 * @param amount
 * @param resNum
 * @returns {Promise<unknown>}
 */
function callEnpayment(amount, resNum) {
	return new Promise(async (resolve, reject) => {
		let instance = new EnPayment(amount);

		try {
			await instance.merchantLogin();

			await instance.generateTransactionDataToSign(resNum);

			await instance.generateSignedDataToken();

			let token = instance.getToken();

			// let doc = `<!DOCTYPE html><html> <body onload="document.getElementsByTagName('form')[0].submit()"> <form action="https://pna.shaparak.ir/_ipgw_/payment/" method="post"> <input type="hidden" name="token" value="${token.token}"/> <input type="hidden" name="language" value="fa"/> </form> </body></html>`;

			// resolve({
			// 	payment_url: "data:text/html;base64," + Buffer.from(doc).toString("base64"),
			// });

			resolve(token);
		} catch (e) {
			reject(e);
		}
	});
}

/**
 *
 * @param {*} amount
 * @param {*} resNum
 * @returns
 */
function callBahamta(amount, resNum) {
	return new Promise(async (resolve, reject) => {
		let instance = new BahamtaPayment(amount);

		try {
			let result = await instance.createRequest(resNum, amount);

			resolve(result);
		} catch (e) {
			reject(e);
		}
	});
}

async function callAdvcash(amount, coin, resNum) {
	const {
		secret,
		ac_account_email,
		ac_sci_name,
		ac_success_url,
		ac_success_url_method,
		ac_fail_url,
		ac_fail_url_method,
		ac_status_url,
		ac_status_url_method,
		endPoint,
	} = config.get("gateways.advcash");

	const query = {
		ac_account_email,
		ac_sci_name,
		ac_amount: amount,
		ac_currency: coin,
		ac_order_id: resNum,
		ac_ps: "VISA",
		ac_success_url: ac_success_url + "?amount=" + amount + "&status=success",
		ac_success_url_method,
		ac_fail_url: ac_fail_url + "?message=Error%3A%20Payment%20failed",
		ac_fail_url_method,
		ac_status_url,
		ac_status_url_method,
	};

	const ac_sign = crypto
		.createHash("sha256")
		.update([ac_account_email, ac_sci_name, amount, coin, secret, resNum].join(":"))
		.digest("hex");

	return {
		payment_url: endPoint + new URLSearchParams({ ...query, ac_sign }).toString(),
	};
}

async function callStripe(amount, coin) {
	const { secret, redirectUrl } = config.get("gateways.stripe");
	const stripe = require("stripe")(secret);

	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		line_items: [
			{
				price_data: {
					currency: coin ? coin.toLowerCase() : "usd",
					product_data: {
						name: "Wolfin Products",
					},
					unit_amount: em.mul(amount, coin == "JPY" ? 1 : 100),
				},
				quantity: 1,
			},
		],
		mode: "payment",
		success_url: redirectUrl + `?amount=${amount}&status=success`,
		cancel_url: redirectUrl + "?message=Error%3A Payment failed",
	});

	return {
		payment_url: session.url,
		resNum: session.payment_intent,
	};
}

/**
 * verify user transaction from EnPayment gateway
 * @param data
 * @returns {Promise<unknown>}
 */
function verifyEnpayment(data) {
	return new Promise(async (resolve, reject) => {
		if (!data.token || !data.token.length)
			return reject(
				new NotFoundError(Errors.PAYMENT_TOKEN_NOT_FOUND.MESSAGE, Errors.PAYMENT_TOKEN_NOT_FOUND.CODE, {
					token,
				}),
			);

		let trans = await UserPayment.findOne({
			where: {
				token: data.token,
				status: paymentStatus.pending,
				resNum: data.ResNum,
			},
		});

		if (!trans)
			return reject(
				new NotFoundError(
					Errors.PAYMENT_TRANSACTION_NOT_FOUND.MESSAGE,
					Errors.PAYMENT_TRANSACTION_NOT_FOUND.CODE,
				),
			);

		let key = `trans_${data.token}_${data.ResNum}`,
			blockedTrans = await redis.client.get(key);

		if (blockedTrans)
			return reject(new HumanError(Errors.DUPLICATE_PAYMENT.MESSAGE, Errors.DUPLICATE_PAYMENT.CODE));

		try {
			await redis.client.set(key, "true", "EX", 600);

			if (data.State === "OK") {
				if (!data.RefNum || !data.RefNum.length)
					return reject(new NotFoundError(Errors.RES_NUM_NOT_FOUND.MESSAGE, Errors.RES_NUM_NOT_FOUND.CODE));

				let instance = new EnPayment();

				await instance.merchantLogin();

				let res = await instance.verifyMerchantTrans(data.token, data.RefNum);

				trans = await saveTransaction(trans, { ...data, ...res });

				await chargeAccount({
					userId: trans.userId,
					assetId: +trans.assetId,
					assetAmount: +trans.assetAmount,
				});

				await redis.client.del(key);

				resolve({ refNum: trans.traceNo, amount: trans.amount });
			} else {
				trans.status = paymentStatus.unsuccessful;

				await trans.save();

				await redis.client.del(key);

				reject(
					new InvalidRequestError(
						Errors.PAYMENT_TRANSACTION_FIELD.MESSAGE,
						Errors.PAYMENT_TRANSACTION_FIELD.CODE,
					),
				);
			}
		} catch (e) {
			reject(e);
		}
	});
}

/**
 *
 * @param {*} data
 * @returns
 */
function verifyBahamta(data) {
	return new Promise(async (resolve, reject) => {
		let { reference, state, error_key, error_message } = data;

		let trans = await UserPayment.findOne({
			where: {
				token: "",
				status: paymentStatus.pending,
				resNum: reference,
			},
		});

		if (!trans)
			return reject(
				new NotFoundError(
					Errors.PAYMENT_TRANSACTION_NOT_FOUND.MESSAGE,
					Errors.PAYMENT_TRANSACTION_NOT_FOUND.CODE,
				),
			);

		let key = `trans_bahamta_${reference}`,
			blockedTrans = await redis.client.get(key);

		if (blockedTrans)
			return reject(new HumanError(Errors.DUPLICATE_PAYMENT.MESSAGE, Errors.DUPLICATE_PAYMENT.CODE));

		try {
			await redis.client.set(key, "true", "EX", 600);

			if (state === "wait_for_confirm") {
				let instance = new BahamtaPayment();

				let result = await instance.confirmPayment(reference, +trans.amount * 10);

				if (result.state !== "paid")
					return reject(
						new HumanError(Errors.PAYMENT_CONFIRM_FIELD.MESSAGE, Errors.PAYMENT_CONFIRM_FIELD.CODE),
					);

				trans = await saveTransaction(trans, {
					Amount: result.total,
					CustomerRefNum: result.pay_ref,
					RefNum: result.pay_ref,
					TraceNo: result.pay_trace,
					CardMaskPan: result.pay_pan,
				});

				await chargeAccount({
					userId: trans.userId,
					assetId: +trans.assetId,
					assetAmount: +trans.assetAmount,
				});

				await redis.client.del(key);

				resolve({ refNum: trans.traceNo, amount: trans.amount });
			}

			if (state === "error") {
				trans.status = paymentStatus.unsuccessful;

				await trans.save();

				await redis.client.del(key);

				reject(
					new InvalidRequestError(
						Errors.PAYMENT_TRANSACTION_FIELD.MESSAGE,
						Errors.PAYMENT_TRANSACTION_FIELD.CODE,
					),
				);
			}
		} catch (e) {
			reject(e);
		}
	});
}

/**
 *
 * @param {*} data
 * @returns
 */
async function verifyAdvcash(data) {
	const {
		ac_src_wallet,
		ac_dest_wallet,
		ac_amount,
		ac_merchant_amount,
		ac_merchant_currency,
		ac_fee,
		ac_buyer_amount_without_commission,
		ac_buyer_amount_with_commission,
		ac_buyer_currency,
		ac_transfer,
		ac_sci_name,
		ac_start_date,
		ac_order_id,
		ac_ps,
		ac_transaction_status, // COMPLETED
		ac_buyer_email,
		ac_buyer_verified,
		ac_comments,
		ac_hash,
	} = data;

	// check
	if (ac_transaction_status != "COMPLETED") return;

	const payment = await postgres.UserPayment.findOne({
		where: { resNum: ac_order_id, status: paymentStatus.pending },
		raw: true,
	});

	if (!payment) return;

	const { secret } = config.get("gateways.advcash");

	const ac_hash_assertion = crypto
		.createHash("sha256")
		.update(
			[
				ac_transfer,
				ac_start_date,
				ac_sci_name,
				ac_src_wallet,
				ac_dest_wallet,
				ac_order_id,
				ac_amount,
				ac_merchant_currency,
				secret,
			].join(":"),
		)
		.digest("hex");

	if (ac_hash != ac_hash_assertion) return;

	await postgres.UserPayment.update({ status: paymentStatus.successful }, { where: { id: payment.id } });

	await chargeAccount({
		userId: +payment.userId,
		assetId: +payment.assetId,
		assetAmount: +payment.assetAmount,
	});
}

async function verifyStripe(data) {
	const { secret, redirectUrl } = config.get("gateways.stripe");

	const stripe = require("stripe")(secret);

	// check

	if (data.type != "payment_intent.succeeded") return;

	const payment = await postgres.UserPayment.findOne({
		where: { resNum: data.data.object.id, status: paymentStatus.pending },
		raw: true,
	});

	if (!payment) return;

	await postgres.UserPayment.update({ status: paymentStatus.successful }, { where: { id: payment.id } });

	await chargeAccount({
		userId: +payment.userId,
		assetId: +payment.assetId,
		assetAmount: +payment.assetAmount,
	});
}

/**
 * Charge user's wallet and place an order if assetId specified
 * @param {object} data
 * @param {number} data.userId - Users's id
 * @param {("USD"|"EUR"|"IRT")} data.currency - Fiat currency
 * @param {number} data.amount - Amount of deposit currency
 * @param {number} data.assetId - Id of the target asset e.g. USDT
 * @returns {Promise<void>}
 */
async function chargeAccount({ userId, assetId, assetAmount }) {
	// system wallet assertion
	let payerWallet = await SystemWallet.findOne({ where: { assetId } });

	if (!payerWallet) payerWallet = await SystemWallet.create({ assetId });

	let payeeWallet = await UserWallet.findOne({ where: { userId, assetId } });

	if (!payeeWallet) payeeWallet = await UserWallet.create({ userId, assetId });

	// chargewallet
	const transaction = await postgres.sequelize.transaction();

	try {
		await payerWallet.decrement("amount", { by: assetAmount, transaction });

		await payeeWallet.increment("amount", { by: assetAmount, transaction });

		transaction.commit();
	} catch (e) {
		console.log(e);

		await transaction.rollback();
	}
}

/**
 * verify user transaction
 * @param type
 * @param data
 * @returns {Promise<*>}
 */
async function verifyTransaction(data, type) {
	let result;

	try {
		switch (type) {
			case "enpayment":
				result = await verifyEnpayment(data);
				break;
			case "bahamta":
				result = await verifyBahamta(data);
				break;
			case "advcash":
				result = await verifyAdvcash(data);
				break;
			case "stripe":
				result = await verifyStripe(data);
				break;
		}

		return result;
	} catch (e) {
		throw Error(e);
	}
}

async function callRamp({ userId, fiat, amount, assetId }) {
	const { hostApiKey, endPoint, redirectUrl } = config.get("gateways.ramp");
	const asset = await postgres.Asset.findOne({ where: { id: assetId } });
	let network;
	switch (asset.coin) {
		case "USDT":
			network = await postgres.Network.findOne({ where: { type: "ERC20" } });
			break;
		case "BTC":
			network = await postgres.Network.findOne({ where: { type: "BTC" } });
			break;
		case "ETH":
			network = await postgres.Network.findOne({ where: { type: "ETH" } });
			break;
	}
	const assetNetwork = await postgres.AssetNetwork.findOne({
		where: { assetId, networkId: network.id },
	});
	const address = await walletService.getDepositAddress({ userId, assetNetworkId: assetNetwork.id });
	return {
		payment_url:
			endPoint +
			"?" +
			"swapAsset=" +
			asset.coin +
			"&fiatCurrency=" +
			fiat +
			"&fiatValue=" +
			amount +
			"&userAddress=" +
			address.address +
			"&hostLogoUrl=https://www.stylike.io/favicon.ico" +
			"&hostAppName=Stylike" +
			"&finalUrl=" +
			redirectUrl +
			"&hostApiKey=" +
			hostApiKey,
	};
}

exports.subStripeGateway = (data) => {
	return new Promise(async (resolve, reject) => {
		const { planId, name, amount, currency, userId, paymentTerm } = data;

		const redirectUrl = config.get(`gateways.${paymentTerm.partner.toLowerCase()}.redirectUrl`);

		const request = {
			amount: +amount,
			redirectUrl: redirectUrl,
			name,
		};

		const session = await createStripeSession(request.name, request.amount, request.redirectUrl);
		if (!session) return reject(new InternalError("There was an error on Procces you request."));

		const url = session.url;

		const paymentData = {
			userId,
			planId,
			currency,
			type: "SUBSCRIPTION",
			assetId: paymentTerm.assetId,
			resNum: session.payment_intent,
			status: paymentStatus.pending,
			amount: +amount,
			gateway: paymentTerm.partner,
		};

		const payment = await new postgres.UserPayment(paymentData).save();
		if (!payment) return reject(new InternalError("There was an error on Procces you request."));
		return resolve(url);
	});
};

const subZarinaplGateway = (data) => {
	return new Promise(async (resolve, reject) => {
		const { planId, name, amount, currency, paymentTerm, userId } = data;

		const redirectUrl = config.get(`gateways.${paymentTerm.partner.toLowerCase()}.redirectUrl`);

		const request = {
			merchantid: config.get("gateways.zarinpal.merchantId"),
			amount: +planPrice,
			callback_url: redirectUrl,
			description: planPrice,
		};

		const session = await axios.post("https://sandbox.zarinpal.com/pg/v4/payment/request.json", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: request,
		});
		if (!session) return reject(new InternalError("There was an error on Procces you request."));

		const url = `https://www.zarinpal.com/pg/StartPay/${session.authority}`;

		const paymentData = {
			userId,
			// planId,
			currency,
			type: "SUBSCRIPTION",
			assetId: paymentTerm.assetId,
			resNum: session.authority,
			status: paymentStatus.pending,
			amount: +amount,
			gateway: paymentTerm.partner,
		};

		const payment = await new postgres.UserPayment(paymentData).save();
		if (!payment) return reject(new InternalError("There was an error on Procces you request."));

		return resolve(url);
	});
};

const walletChargeStripeGateway = (data) => {
	return new Promise(async (resolve, reject) => {
		const { amount, userId, paymentTerm } = data;

		const redirectUrl = config.get(`gateways.${paymentTerm.partner.toLowerCase()}.redirectUrl`);

		const session = await createStripeSession("Wallet Charge", +amount, redirectUrl);
		if (!session) return reject(new InternalError("There was an error on Procces you request."));

		const url = session.url;

		const paymentData = {
			type: "DEPOSIT", // Charge Wallet
			assetId: paymentTerm.assetId,
			userId,
			resNum: session.payment_intent,
			status: paymentStatus.pending,
			amount: +amount,
			gateway: paymentTerm.partner,
		};

		const payment = await new postgres.UserPayment(paymentData).save();

		if (!payment) return reject(new InternalError("There was an error on Procces you request."));
		return resolve(url);
	});
};

const walletChargeZarinpalGateway = (data) => {
	return new Promise(async (resolve, reject) => {
		const { amount, userId, paymentTerm } = data;

		const redirectUrl = config.get(`gateways.${paymentTerm.partner.toLowerCase()}.redirectUrl`);

		const session = createZarinpalSession(+amount, redirectUrl);

		const paymentData = {
			type: "DEPOSIT", // Charge Wallet
			assetId: paymentTerm.assetId,
			resNum: session.authority,
			status: paymentStatus.pending,
			amount: +amount,
			userId,
			gateway: paymentTerm.partner,
		};

		const payment = await new postgres.UserPayment(paymentData).save();
		if (!payment) return reject(new InternalError("There was an error on Procces you request."));

		return resolve(url);
	});
};

const createStripeSession = async (name, amount, redirectUrl) => {
	const { secret } = config.get("gateways.stripe");
	const stripe = require("stripe")(secret);

	if (typeof amount !== "number" || Number(amount) === "NaN") {
		return null;
	}
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ["card"],
		mode: "payment",
		line_items: [
			{
				price_data: {
					currency: "usd",
					product_data: {
						name,
					},
					unit_amount: Math.round(100 * parseFloat(amount)),
				},
				quantity: 1,
			},
		],
		success_url: `${redirectUrl}?success=1&provider=stripe`,
		cancel_url: `${redirectUrl}?success=0&provider=stripe`,
	});

	return session;
};

const createZarinpalSession = async (amount, redirectUrl) => {
	const requestData = {
		merchantid: config.get("gateways.zarinpal.merchantId"),
		amount: +amount,
		callback_url: redirectUrl,
		description: "شارژ کیف پول",
	};

	const session = await axios.get("https://sandbox.zarinpal.com/pg/v4/payment/request.json", {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: requestData,
	});
	const url = `https://www.zarinpal.com/pg/StartPay/${session.authority}`;

	return { ...session, url };
};

// function zarinpalCallbackHandler(data) {
// 	return new Promise(async (resolve, reject) => {});
// }

module.exports = {
	verifyTransaction,
	subZarinaplGateway,
	walletChargeStripeGateway,
	walletChargeZarinpalGateway,
};
