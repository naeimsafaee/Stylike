const { default: axios } = require("axios");
const em = require("exact-math");
const { postgres, redis } = require("./../databases");

/**
 * Get ALL Referral Rewards
 * @returns
 * @param data
 */
function getReferralRewards(data) {
	return new Promise(async (resolve, reject) => {
		let { id, user, referredUser, createdAt, page, limit, sort, order, type } = data;

		let offset = 0 + (page - 1) * limit,
			query = {},
			query2 = {},
			query3 = {};

		if (id) query.id = id;
		if (type) query.type = type;
		if (user) query2.name = user;
		if (referredUser) query3.name = referredUser;

		if (createdAt) query.createdAt = createdAt;
		try {
			let result = await postgres.ReferralReward.findAndCountAll({
				where: query,
				offset,
				limit,
				order: [[sort, order]],
				nest: true,
				include: [
					{
						model: postgres.User,
						require: true,
						as: "user",
						where: query2,
					},
					{
						model: postgres.User,
						require: true,
						as: "referredUser",
						where: query3,
					},
					{
						model: postgres.Asset,
						require: true,
					},
				],
				raw: true,
			});

			resolve({
				total: result.count,
				pageSize: limit,
				page,
				data: result.rows,
			});
		} catch (e) {
			console.log(e);
		}
	});
}

function calculateReferral(user, mainUserId, assetId, type, amount, auctionId) {
	return new Promise(async (resolve, reject) => {
		const transaction = await postgres.sequelize.transaction();
		try {
			// Total Transction calc is based on USDT or USD
			// So we need to check used asset if it's one of both no need to convert amount
			// But if it was different it must be converted for example if it was BNB we need to convert it using rate
			// After that we use STARZ to reward user (it's not relate used asset)[?]
			const currentAsset = await postgres.Asset.findByPk(assetId, { raw: true });

			if (currentAsset.coin !== "USDT") {
				amount = await calculateAmount(currentAsset, amount);
			}

			const referredUser = await postgres.User.findOne({
				where: { referralCode: user, status: "ACTIVE" },
			});

			let userStatistic = await postgres.ReferralStatistic.findOne({
				where: { userId: referredUser.id },
			});

			if (!userStatistic) {
				userStatistic = await postgres.ReferralStatistic.create({
					userId: referredUser.id,
				});
			}

			await userStatistic.increment("totalTransaction", { by: amount, transaction });

			const statisticSetting = await findExactSetting(userStatistic);

			if (statisticSetting) {
				let referredWallet = await postgres.UserWallet.findOne({
					where: { userId: referredUser.id, assetId: statisticSetting.assetId },
					include: [{ model: postgres.Asset, as: "asset" }],
				});

				if (!referredWallet) {
					referredWallet = await new postgres.UserWallet({
						assetId: statisticSetting.assetId,
						userId: referredUser.id,
					}).save({ transaction });
				}

				await referredWallet.increment("amount", { by: +statisticSetting.reward, transaction });

				userStatistic.level = statisticSetting.userLevel;
				await userStatistic.save({ transaction });

				await new postgres.ReferralReward({
					assetId: statisticSetting.assetId,
					type,
					amount: +statisticSetting.reward,
					userId: mainUserId,
					referredUserId: referredUser.id,
					level: statisticSetting.userLevel,
					auctionId,
				}).save({ transaction });

				const systemWallet = await postgres.SystemWallet.findOne({
					where: { assetId: statisticSetting.assetId },
					include: [{ model: postgres.Asset, as: "asset" }],
				});

				systemWallet.decrement("amount", { by: +statisticSetting.reward });
			}
			await transaction.commit();
		} catch (e) {
			console.log(e);
			await transaction.rollback();
		}
	});
}

const findExactSetting = async (statistic) => {
	const { totalTransaction, userCount: count, level } = statistic;
	const fees = await postgres.Fee.findAll({
		where: {
			userType: "NORMAL",
			userCount: { [postgres.Op.ne]: null },
			targetPrice: { [postgres.Op.ne]: null },
			reward: { [postgres.Op.ne]: null },
			assetId: { [postgres.Op.ne]: null },
		},
		raw: true,
	});

	let founded;
	for (let i = 0; i < fees.length; i++) {
		const { userCount, targetPrice, userLevel } = fees[i];
		const currentBasePrice = targetPrice;
		const nextBasePrice = fees[i + 1] ? +fees[i + 1].targetPrice : Infinity;
		const nextUserCount = fees[i + 1] ? +fees[i + 1].userCount : Infinity;

		if (
			+userLevel > level &&
			totalTransaction >= +currentBasePrice &&
			totalTransaction <= +nextBasePrice &&
			count >= +userCount &&
			count <= +nextUserCount
		) {
			founded = fees[i];
			break;
		}
	}

	return founded;
};

const calculateAmount = async (asset, amount) => {
	let swap = await postgres.Settings.findOne({ where: { type: "SWAP", key: `${asset.coin}->USDT` } });
	if (!swap) swap = await createSwap(asset.coin);

	const swapValues = extractSwapValues(swap);
	const newAmount = swapValues.rate * amount;

	return newAmount;
};

const extractSwapValues = (swap) => {
	const values = swap.value.split("-");

	const data = {};
	values.forEach((value, i) => {
		const currentVal = value.split("=");
		data[currentVal[0]] = currentVal[1];
	});

	return data;
};

const createSwap = async (coin) => {
	const axiosResponse = await axios.get(
		`https://api.binance.com/api/v3/ticker/price?symbol=${coin.toUpperCase()}USDT`,
	);
	const apiRate = +axiosResponse.data.price;

	const rate = apiRate - em.mul(apiRate, 3 / 100);

	const newSwap = await new postgres.Settings({
		type: "SWAP",
		key: `${coin.toUpperCase()}->USDT`,
		value: `rate=${rate}-min=10-max=1000-fee=3`,
	});

	return newSwap;
};

async function calculate5PercentReferral(user, mainUserId, type, amount, auctionId, percent) {
	const transaction = await postgres.sequelize.transaction();
	try {
		const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" } }, { raw: true });

		const referredUser = await postgres.User.findOne({
			where: { referralCode: user, status: "ACTIVE" },
		});

		let referredWallet = await postgres.UserWallet.findOne({
			where: { userId: referredUser.id, assetId: bnbAsset.id },
		});

		if (!referredWallet) {
			referredWallet = await new postgres.UserWallet({
				assetId: bnbAsset.id,
				userId: referredUser.id,
			}).save({ transaction });
		}

		// Caclulate amount
		const calculatedAmount = em.mul(amount, percent);
		await referredWallet.increment("amount", { by: +calculatedAmount, transaction });

		await new postgres.ReferralReward({
			assetId: bnbAsset.id,
			type,
			amount: +calculatedAmount,
			userId: referredUser.id,
			referredUserId: mainUserId,
			auctionId,
		}).save({ transaction });

		const systemWallet = await postgres.SystemWallet.findOne({
			where: { assetId: bnbAsset.id },
		});

		await systemWallet.decrement("amount", { by: +calculatedAmount });

		await transaction.commit();
	} catch (e) {
		console.log(e);
		await transaction.rollback();
	}
}

//
//
// function calculate5PercentRef(user, mainUserId, type, amount, auctionId) {
// 	return new Promise(async (resolve, reject) => {
// 		const transaction = await postgres.sequelize.transaction();
// 		try {
// 			const bnbAsset = await postgres.Asset.findOne({ where: { coin: "BNB" } }, { raw: true });
//
// 			const referredUser = await postgres.User.findOne({
// 				where: { referralCode: user, status: "ACTIVE" },
// 			});
//
// 			let referredWallet = await postgres.UserWallet.findOne({
// 				where: { userId: referredUser.id, assetId: bnbAsset.id },
// 			});
//
// 			if (!referredWallet) {
// 				referredWallet = await new postgres.UserWallet({
// 					assetId: bnbAsset.id,
// 					userId: referredUser.id,
// 				}).save({ transaction });
// 			}
//
// 			// Caclulate amount
// 			const calculatedAmount = em.mul(amount, 0.025);
// 			await referredWallet.increment("amount", { by: +calculatedAmount, transaction });
//
// 			await new postgres.ReferralReward({
// 				assetId: bnbAsset.id,
// 				type,
// 				amount: +calculatedAmount,
// 				userId: mainUserId,
// 				referredUserId: referredUser.id,
// 				auctionId,
// 			}).save({ transaction });
//
// 			const systemWallet = await postgres.SystemWallet.findOne({
// 				where: { assetId: bnbAsset.id },
// 			});
//
// 			await systemWallet.decrement("amount", { by: +calculatedAmount });
//
// 			await transaction.commit();
// 		} catch (e) {
// 			console.log(e);
// 			await transaction.rollback();
// 		}
// 	});
// }

async function calculateAgentFee(user, mainUserId, type, amount, auctionId) {
	const transaction = await postgres.sequelize.transaction();
	try {
		const busdAsset = await postgres.Asset.findOne({ where: { coin: "BUSD" } }, { raw: true });

		const referredUser = await postgres.User.findOne({
			where: { referralCode: user, status: "ACTIVE" },
		});
		let referredWallet = await postgres.UserWallet.findOne({
			where: { userId: referredUser.id, assetId: busdAsset.id },
		});

		if (!referredWallet) {
			referredWallet = await new postgres.UserWallet({
				assetId: busdAsset.id,
				userId: referredUser.id,
			}).save({ transaction });
		}

		const fee = await postgres.Fee.findOne({ userType: "AGENT", where: { userLevel: referredUser.levelId } });

		if (fee) {
			// Calculate amount
			const calculatedAmount = em.mul(amount, fee.referralReward);

			await referredWallet.increment("amount", { by: +calculatedAmount, transaction });

			const agentLinkStatistic = await postgres.AgentLinkStatistic.findOne({
				where: { userId: mainUserId },
				transaction,
			});

			await postgres.AgentReward.create(
				{
					agentId: referredUser.id,
					userId: mainUserId,
					auctionId: auctionId,
					commission: calculatedAmount,
					agentLinkId: agentLinkStatistic ? agentLinkStatistic.agentLinkId : null,
				},
				{ transaction },
			);

			await new postgres.ReferralReward({
				assetId: busdAsset.id,
				type,
				amount: +calculatedAmount,
				userId: referredUser.id,
				referredUserId: mainUserId,
				auctionId,
			}).save({ transaction });

			const systemWallet = await postgres.SystemWallet.findOne({
				where: { assetId: busdAsset.id },
			});

			await systemWallet.decrement("amount", { by: +calculatedAmount, transaction });

			await transaction.commit();
		}
	} catch (e) {
		console.log(e);
		await transaction.rollback();
	}
}

module.exports = {
	getReferralRewards,
	calculateReferral,
	calculate5PercentReferral,
	calculateAgentFee,
};
