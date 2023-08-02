

const { postgres } = require("../../../databases");
const em = require("exact-math");
const hooks = require("../../../hooks");
const { events } = require("../../../data/constans");

class Handlers {
	constructor(transaction, amount, payerId, auction) {
		this.transaction = transaction;

		this.fee = 0.1;

		this.payerId = payerId;

		this.payeeId = auction.userId;

		this.auctionId = auction.id;

		this.amount = amount;

		this.auction = auction;
	}

	/**
	 * calculate system fee
	 * @returns
	 */
	calculateFee() {
		return new Promise(async (resolve, reject) => {
			try {
				this.systemFee = em.mul(this.amount, this.fee);

				if (this.systemFee === 0) return resolve();

				// calculate agent fee percent
				await this.calculateAgentFee();

				this.remainAmount = em.sub(this.amount, this.systemFee);

				// return remain amount
				return resolve();
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * transfer amount to payee
	 * @returns
	 */
	transferToPayee(cron = false) {
		return new Promise(async (resolve, reject) => {
			try {
				// increase system wallet
				if (!this.payeeId) await this.increaseSystemWallet(this.remainAmount);
				else await this.increaseUserWallet();

				if (cron) await this.decreaseUserWallet();

				await this.transferCardToPayer();

				return resolve();
			} catch (error) {
				return reject(error);
			}
		});
	}
	/**
	 * transfer from system or payee to payer
	 * @returns
	 */
	transferCardToPayer() {
		return new Promise(async (resolve, reject) => {
			let ids = this.auction.assignedCardId ? [this.auction.assignedCardId] : this.auction.bundleCardId;

			for (const id of ids) {
				let assignedCard = await postgres.AssignedCard.findByPk(id, { transaction: this.transaction });

				await assignedCard.update({ type: "SOLD" }, { transaction: this.transaction });

				await postgres.AssignedCard.create(
					{ userId: this.payerId, cardId: assignedCard.cardId, tokenId: assignedCard.tokenId },
					{ transaction: this.transaction },
				);
			}

			resolve();
		});
	}

	/**
	 * increase system wallet
	 * @param {*} amount
	 * @returns
	 */
	increaseSystemWallet(amount) {
		return new Promise(async (resolve, reject) => {
			let systemWallet = await postgres.SystemWallet.findOne({
				include: [{ model: postgres.Asset, as: "asset", where: { coin: "USDT" }, required: true }],
				transaction: this.transaction,
			});

			let wallet = await systemWallet.increment("amount", {
				by: amount ?? this.systemFee,
				transaction: this.transaction,
			});

			if (wallet) return resolve();

			return reject();
		});
	}

	/**
	 * calculate agent fee
	 * @returns
	 */
	calculateAgentFee() {
		return new Promise(async (resolve, reject) => {
			try {
				let statistic = await postgres.AgentStatistic.findOne({
					where: { userId: this.payeeId },
					include: [{ model: postgres.User, as: "agent" }],
					transaction: this.transaction,
				});

				// check user have a referral
				if (!statistic) return resolve(await this.increaseSystemWallet());

				let fee = await postgres.Fee.findOne({
					where: { userType: "AGENT", userLevel: statistic?.agent?.levelId },
					transaction: this.transaction,
				});

				// check agent have a referral reward
				if (!fee) return resolve(await this.increaseSystemWallet());

				//calculate agent fee
				this.agentFee = em.mul(this.systemFee, fee?.referralReward);

				if (this.agentFee === 0) return resolve(await this.increaseSystemWallet());

				//calculate system fee
				this.systemFee = em.sub(this.systemFee, this.agentFee);

				await this.increaseSystemWallet();

				await this.increaseUserWallet(statistic?.agentId, this.agentFee);

				// update agent statistics
				await statistic.increment("total", { by: this.agentFee, transaction: this.transaction });

				// save agent rewards
				await postgres.AgentReward.create(
					{
						agentId: statistic?.agentId,
						userId: this.payeeId,
						auctionId: this.auctionId,
						commission: this.agentFee,
					},
					{ transaction: this.transaction },
				);

				return resolve();
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * increase user (payee) wallet
	 * @param {*} userId
	 * @param {*} amount
	 * @returns
	 */
	increaseUserWallet(userId, amount) {
		return new Promise(async (resolve, reject) => {
			let userWallet = await postgres.UserWallet.findOne({
				where: { userId: userId ?? this.payeeId },
				include: [{ model: postgres.Asset, as: "asset", where: { coin: "USDT" }, required: true }],
				transaction: this.transaction,
			});

			let wallet = await userWallet.increment("amount", {
				by: amount ?? this.remainAmount,
				transaction: this.transaction,
			});

			if (wallet) return resolve();

			return reject();
		});
	}

	/**
	 * decrease user frozen (payee) wallet
	 * @returns
	 */
	decreaseUserWallet() {
		return new Promise(async (resolve, reject) => {
			let userWallet = await postgres.UserWallet.findOne({
				where: { userId: this.payerId },
				include: [{ model: postgres.Asset, as: "asset", where: { coin: "USDT" }, required: true }],
				transaction: this.transaction,
			});

			let wallet = await userWallet.decrement("frozen", {
				by: this.amount,
				transaction: this.transaction,
			});

			if (wallet) return resolve();

			return reject();
		});
	}

	/**
	 * save auction transaction trade
	 * @returns
	 */
	saveTransaction() {
		return new Promise(async (resolve, reject) => {
			try {
				let result = await postgres.UserAuctionTrade.create(
					{
						payerId: this.payerId,
						payeeId: this.payeeId,
						auctionId: this.auctionId,
						amount: this.amount,
						fee: this.systemFee,
					},
					{ transaction: this.transaction, returning: true },
				);

				// update user referral statistic
				await postgres.ReferralStatistic.increment("cardNumbers", {
					where: { referredUserId: this.payerId, status: "IN_PROGRESS" },
					transaction: this.transaction,
				});

				const resultReferralStatistic = await postgres.ReferralStatistic.findOne({
					where: { referredUserId: this.payerId, status: "IN_PROGRESS" },
				});

				return resolve();
			} catch (error) {
				return reject(error);
			}
		});
	}
	/**
	 * save user auction and finish current auction
	 * @returns
	 */
	changeAuctionStatus(cron = false) {
		return new Promise(async (resolve, reject) => {
			let auctionOffer;
			try {
				if (!cron)
					auctionOffer = await postgres.AuctionOffer.create(
						{ userId: this.payerId, auctionId: this.auctionId, amount: this.amount, status: "WON" },
						{ transaction: this.transaction },
					);

				await this.auction.update({ status: "FINISHED" }, { transaction: this.transaction });

				// app.get("socketIo").to("Auction").emit("auction-delete", JSON.stringify(auctionOffer));

				return resolve(auctionOffer);
			} catch (error) {
				return reject(error);
			}
		});
	}

	/**
	 * Other user get their money back
	 * @returns
	 */
	returnOtherOffers() {
		return new Promise(async (resolve, reject) => {
			let offers = await postgres.AuctionOffer.findAll({
				where: { status: "REGISTERED", auctionId: this.auctionId },
			});

			if (!offers.length) return resolve();

			for (const offer of offers) {
				await Handlers.returnUserWallet(offer.userId, offer.amount);

				await offer.update({ status: "NOTWON" });
			}

			resolve();
		});
	}

	/**
	 * return back money to user
	 * @param {*} userId
	 * @param {*} amount
	 * @returns
	 */
	static returnUserWallet(userId, amount) {
		return new Promise(async (resolve, reject) => {
			let userWallet = await postgres.UserWallet.findOne({
				where: { userId },
				include: [{ model: postgres.Asset, as: "asset", where: { coin: "USDT" }, required: true }],
				transaction: this.transaction,
			});

			await userWallet.decrement("frozen", { by: amount });

			await userWallet.increment("amount", { by: amount });

			resolve();
		});
	}
}

module.exports = Handlers;
