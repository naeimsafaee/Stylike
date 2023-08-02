const { postgres } = require("../databases");
const { NotFoundError } = require("../services/errorhandler");
const Errors = require("./errorhandler/MessageText");
const { paymentStatus } = require("../data/constans");
const gatewayService = require("./gateway.service");
const { dateQueryBuilder } = require("../utils/dateQueryBuilder");

function buySubscription(data, user) {
	return new Promise(async (resolve, reject) => {
		const { planId, paymentTermId } = data;
		const plan = await postgres.Plan.findByPk(planId, { raw: true });

		if (!plan)
			return reject(new NotFoundError(Errors.PLAN_NOT_FOUND.MESSAGE, Errors.PLAN_NOT_FOUND.CODE, { planId }));

		const paymentTerm = await postgres.PaymentTerm.findOne({
			where: { id: paymentTermId, type: "BUY", isActive: true },
		});

		if (!paymentTerm) {
			return reject(new NotFoundError(Errors.PAYMENT_TERM_NOT_FOUND.MESSAGE, Errors.PAYMENT_TERM_NOT_FOUND.CODE));
		}

		const gatewayData = {
			planId: plan.id,
			name: plan.name,
			amount: plan.price,
			currency: plan.currency,
			paymentTerm,
			userId: user.id,
		};

		let result;
		if (paymentTerm.partner.toLowerCase() === "stripe") result = await gatewayService.subStripeGateway(gatewayData);
		else if (paymentTerm.partner.toLowerCase() === "zarinpal")
			result = await gatewayService.subZarinaplGateway(gatewayData);
		else
			return reject(new NotFoundError(Errors.PAYMENT_TERM_NOT_FOUND.MESSAGE, Errors.PAYMENT_TERM_NOT_FOUND.CODE));

		return resolve(result);
	});
}

const buySubscriptionByWallet = async (data, user) => {
	return new Promise(async (resolve, reject) => {
		const { planId, assetId } = data;

		const plan = await postgres.Plan.findByPk(planId);

		if (!plan) {
			return reject(new NotFoundError(Errors.PLAN_NOT_FOUND.MESSAGE, Errors.PLAN_NOT_FOUND.CODE, { planId }));
		}

		const asset = await postgres.Asset.findByPk(assetId);
		if (!asset) {
			return reject(new NotFoundError(Errors.ASSET_NOT_FOUND.MESSAGE, Errors.ASSET_NOT_FOUND.CODE, { assetId }));
		}

		const planPrice = plan.prices.find((price) => price.currency === asset.coin);
		if (!planPrice) {
			return reject(
				new NotFoundError(
					Errors.CURRENCY_PRICE_NOT_DEFINED_WALLET.MESSAGE,
					Errors.CURRENCY_PRICE_NOT_DEFINED_WALLET.CODE,
					{
						assetCurrency: asset.coin,
					},
				),
			);
		}

		let wallet = await postgres.UserWallet.findOne({
			where: { userId: user.id, assetId },
		});

		if (!wallet) wallet = await new postgres.UserWallet({ userId: user.id, assetId }).save();

		if (+wallet.amount < +planPrice.amount) {
			return reject(
				new NotFoundError(
					Errors.WALLET_LOWER_THAN_PLAN_PRICE.MESSAGE,
					Errors.WALLET_LOWER_THAN_PLAN_PRICE.CODE,
					{
						walletAmount: wallet.amount,
						planAmount: planPrice.amount,
					},
				),
			);
		}

		const currentDate = new Date();
		const existActiveSubscription = await postgres.UserSubscription.findOne({
			where: {
				userId: user.id,
				end: { [postgres.Op.gt]: currentDate },
			},
		});

		const start = new Date();
		let end = new Date();

		let annual = false;
		if (plan.days >= 365) annual = true;

		end.setDate(end.getDate() + plan.days);

		if (existActiveSubscription) {
			end = new Date(existActiveSubscription.end);
			end.setDate(existActiveSubscription.end.getDate() + plan.days);
			await existActiveSubscription.update({ end, annual });
		} else {
			const subscriptionData = {
				userId: user.id,
				planId: planId,
				annual,
				start,
				end,
			};

			await new postgres.UserSubscription(subscriptionData).save();
		}
		const previousBalance = wallet.amount;
		await wallet.decrement("amount", { by: +planPrice.amount });

		await new postgres.UserTransaction({
			userId: user.id,
			type: "WSUBSCRIPTION",
			amount: planPrice.amount,
			previousBalance,
			assetId,
			status: "DONE",
		}).save();

		return resolve("Success");
	});
};

function createSubscription(data) {
	return new Promise(async (resolve, reject) => {
		const {
			type: eventType,
			data: { object: dataObject },
		} = data;

		const currentPayment = await postgres.UserPayment.findOne({
			where: {
				status: paymentStatus.pending,
				resNum: dataObject.id,
			},
			include: [{ model: postgres.Asset, as: "asset" }, { model: postgres.Plan }],
			nest: true,
		});

		const paymentUpdate = {
			userId: currentPayment.userId,
			status: paymentStatus.successful,
		};

		// Start and End Calc
		const currentDate = new Date();
		const existActiveSubscription = await postgres.UserSubscription.findOne({
			where: {
				userId: paymentUpdate.userId,
				end: { [postgres.Op.gt]: currentDate },
			},
		});

		const start = new Date();
		let end = new Date();

		let annual = false;
		if (currentPayment.plan.days >= 365) annual = true;

		end.setDate(end.getDate() + currentPayment.plan.days);

		if (existActiveSubscription) {
			end = new Date(existActiveSubscription.end);
			end.setDate(existActiveSubscription.end.getDate() + currentPayment.plan.days);
			await existActiveSubscription.update({ end, annual });
			paymentUpdate.userSubscriptionId = existActiveSubscription.id;
		} else {
			const subscriptionData = {
				userId: paymentUpdate.userId,
				planId: currentPayment.planId,
				annual,
				start,
				end,
			};

			const newSubscription = await new postgres.UserSubscription(subscriptionData).save();
			paymentUpdate.userSubscriptionId = newSubscription.id;
		}

		const updatedPayment = await currentPayment.update(paymentUpdate);
		if (updatedPayment.modifiedCount < 1) {
			return reject(new InternalError("Internal Error", 500));
		}

		const currentUser = await postgres.User.findByPk(currentPayment.userId);
		let systemWalletAmount = currentPayment.amount;
		if (currentUser.referredCode) {
			const referredUser = await postgres.User.findOne({
				where: { referralCode: currentUser.referredCode, status: "ACTIVE" },
			});
			let referredWallet = await postgres.UserWallet.findOne({
				where: { userId: referredUser.id, "$asset.coin$": "USD" },
				include: [{ model: postgres.Asset, as: "asset" }],
			});

			if (!referredWallet) {
				referredWallet = await postgres.UserWallet({ assetId: asset.id, userId: referredUser.id }).save();
			}

			const fee = await postgres.Fee.findOne({
				where: {
					userType: "NORMAL",
					userLevel: referredUser.level,
					referralReward: { [postgres.Op.ne]: null },
				},
			});

			const reward = currentPayment.amount * (+fee.referralReward / 100);

			await referredWallet.increment("amount", { by: reward });

			await new postgres.ReferralReward({
				userId: currentUser.id,
				referredUserId: referredUser.id,
				type: "SUBSCRIPTION",
				typeId: currentPayment.planId,
				amount: reward,
				feePercent: fee.referralReward,
				assetId: currentPayment.assetId,
			}).save();

			systemWalletAmount -= reward;
		}

		let systemWallet = await postgres.SystemWallet.findOne({
			where: { "$asset.coin$": "USD" },
			include: [{ model: postgres.Asset, as: "asset" }],
		});

		if (!systemWallet) systemWallet = await new postgres.SystemWallet({ assetId: currentPayment.assetId }).save();

		await systemWallet.increment("amount", { by: systemWalletAmount });

		return true;
	});
}

function userSubscription(userId) {
	return new Promise(async (resolve, reject) => {
		const currentSubscription = await postgres.UserSubscription.findOne(
			{ where: { userId, end: { [postgres.Op.gt]: Date.now() } } },
			{
				include: [postgres.User, postgres.Plan],
			},
		);
		if (!currentSubscription) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE));
		}

		return resolve(currentSubscription);
	});
}

function getSubscriptionByManager(id) {
	return new Promise(async (resolve, reject) => {
		const currentSubscription = await postgres.UserSubscription.findByPk(id, {
			include: [postgres.User, postgres.Plan],
		});
		if (!currentSubscription) {
			return reject(new NotFoundError(Errors.ITEM_NOT_FOUND.MESSAGE, Errors.ITEM_NOT_FOUND.CODE, { id }));
		}

		return resolve(currentSubscription);
	});
}

function getSubscriptionsByManager(data) {
	return new Promise(async (resolve, reject) => {
		const { page, limit, sort, order, createdAt, id, searchQuery } = data;

		const query = {};
		const offset = (page - 1) * limit;

		if (createdAt) {
			const { start, end } = dateQueryBuilder(createdAt);
			query.createdAt = { [postgres.Op.gte]: start, [postgres.Op.lte]: end };
		}

		if (searchQuery) {
			query.$or = [
				{
					id: postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
						[postgres.Op.iLike]: `%${searchQuery}%`,
					}),
				},
				{ title: { [postgres.Op.iLike]: `%${searchQuery}%` } },
				{ description: { [postgres.Op.iLike]: `%${searchQuery}%` } },
			];
		}

		if (id)
			query.id = postgres.sequelize.where(postgres.sequelize.cast(postgres.sequelize.col("id"), "varchar"), {
				[postgres.Op.iLike]: `%${id}%`,
			});

		const items = await postgres.UserSubscription.findAndCountAll({
			where: query,
			limit,
			offset,
			order: [[sort, order]],
			include: [postgres.User, postgres.Plan],
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
	buySubscription,
	buySubscriptionByWallet,
	createSubscription,
	getSubscriptionByManager,
	getSubscriptionsByManager,
	userSubscription,
};
