const CronJob = require("cron").CronJob;
const { postgres } = require("../lib/databases");
const jmoment = require("jalali-moment");
const config = require("config");
// const Handlers = require("../lib/services/auction.service/lib/handlers");
const { default: axios } = require("axios");
const em = require("exact-math");
const { sequelize } = require("../lib/databases/postgres");
const { updateCurrency } = require("../Console/UpdateCurrency");
const { its12Oclock } = require("../lib/services/swap.service");
const { HumanError } = require("../lib/services/errorhandler");
const logger = require("../lib/middlewares/WinstonErrorMiddleware");
const moment = require("moment");
var app = require("../lib/app");
const { BAD_REQUEST } = require("../lib/services/errorhandler/StatusCode");
const { ConflictError } = require("../lib/services/errorhandler");
const { sendPushToToken } = require("../lib/services/notification.service");
const {mail} = require("../lib/utils");

/**
 * change competitions status
 * @returns
 */
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

async function price(data) {
	const { fromToken, toToken, slippage, balanceIn, origin } = data;
	if (process.env.NODE_ENV === "development") {
		return { price: 240 };
	}
	try {
		const p = "/api/v1/wallet/swap/price";
		const result = await httpRequest(p, { fromToken, toToken, slippage, balanceIn, origin });
		return { price: parseFloat(result.data.price) };
	} catch (e) {
		console.log(e);
		throw new HumanError("Please try again later", 400);
	}
}

function changeCompetitions() {
	return new Promise(async (resolve, reject) => {
		let current = jmoment();

		// open competitions
		await postgres.Competition.update(
			{ status: "OPEN" },
			{ where: { status: "INACTIVE", startAt: current.format("YYYY-MM-DD"), type: "CHALLENGE" } },
		);

		resolve();
	});
}

const updateSwapRates = new CronJob("* * * * *", async () => {
	const currentBNBUSDT = await postgres.Settings.findOne({
		where: {
			type: "SWAP",
			key: "BNB->USDT",
		},
	});
	// const axiosResponse = await axios.get("https://api.binance.com/api/v3/ticker/price?symbol=BNBUSDT");
	// const apiRate = +axiosResponse.data.price;
	const apiRate = 1;

	if (currentBNBUSDT) {
		let newValues = "";

		const currentValues = currentBNBUSDT.value.split("-");

		const newData = {};
		currentValues.forEach((value, i) => {
			const currentVal = value.split("=");
			newData[currentVal[0]] = currentVal[1];
		});

		newData["rate"] = em.sub(apiRate, em.mul(apiRate, em.div(newData["fee"], 100)));

		const keys = Object.keys(newData);
		keys.forEach((key, i) => {
			newValues += `${key}=${newData[key]}`;
			if (i < keys.length - 1) newValues += "-";
		});

		// if (currentVal[0] === "rate") {
		// 	newValues += `rate=${apiRate}`;
		// } else newValues += `${currentVal[0]}=${currentVal[1]}`;
		// if (i < currentValues.length - 1) newValues += "-";

		await currentBNBUSDT.update({ value: newValues });
	}
});

const agentReportFiller = new CronJob("0 * * * *", async () => {
	const reports = await postgres.AgentReport.findAll({ raw: true });

	for (let i = 0; i < reports.length; i++) {
		if (reports[i].agentId) {
			const statistic = await postgres.AgentStatistic.findAndCountAll({
				where: { agentId: reports[i].agentId },
				attributes: [[sequelize.fn("SUM", sequelize.cast(sequelize.col("total"), "integer")), "totalAmount"]],
				raw: true,
			});

			if (statistic.count > 0) {
				const totalAmount = statistic.rows[0].totalAmount;
				const totalUsers = statistic.count;
				await postgres.AgentReport.update(
					{ totalAmount, totalUsers },
					{ where: { agentId: reports[i].agentId } },
				);
			}
		}
	}
});

const updateCurrencies = new CronJob("0 */24 * * *", updateCurrency);

// At 12:00 AM
var changeStatus = new CronJob("0 0 0 * * *", changeCompetitions);

const Fee = new CronJob("0 0 0 * * *", calculateFee);

const ChargeAiPlans = new CronJob("0 0 0 * * *", aiPlans);

async function calculateFee() {
	console.log("Decreasing fee");

	const users = await postgres.User.findAll({
		attributes: ["id"],
		order: [["id", "DESC"]],
	});

	for (let i = 0; i < users.length; i++) {
		try {
			console.log("-------------------------");
			console.log("userId : ", users[i].id);

			await its12Oclock(users[i].id);
		} catch (e) {
			logger.error(e);
			console.log("cron error", e);
		}
	}

	// await calculateUserFee(users, 0);
}

async function aiPlans() {
	const _30DaysAgo = moment().subtract(30, "days").format("YYYY-MM-DD");
	// const _29DaysAgo = moment().subtract(29, "days").format("YYYY-MM-DD");

	const userPlans = await postgres.UserPlan.findAll({
		where: {
			[postgres.Op.and]: [
				{ createdAt: { [postgres.Op.lte]: _30DaysAgo } },
				// { createdAt: { [postgres.Op.lt]: _29DaysAgo } },
			],
		},
		include: [
			{
				model: postgres.Plan,
			},
		],
	});

	//"NFT Holders"

	for (let i = 0; i < userPlans.length; i++) {
		try {
			const userId = userPlans[i].userId;

			if (userPlans[i].plan && userPlans[i].plan.name === "NFT Holders") {
				const userCameras = await postgres.AssignedCard.findAll({
					where: {
						userId: userId,
					},
					attributes: ["id", "userId"],
					include: [
						{
							model: postgres.Card,
							attributes: ["id", "cardTypeId"],
							required: true,
							include: [
								{
									model: postgres.CardType,
									attributes: ["name", "aiCredit"],
									where: {
										id: { [postgres.Op.ne]: 9 },
									},
									required: true,
								},
							],
						},
					],
				});

				let credit = 0;
				for (let c of userCameras) {
					const aiCredit = c.card.cardType.aiCredit;

					credit += parseInt(aiCredit);
				}

				await userPlans[i].increment("remaining", { by: credit });
				userPlans[i].createdAt = new Date();
				await userPlans[i].save();


			} else if (
				(userPlans[i].plan && userPlans[i].plan.name === "Pro") ||
				(userPlans[i].plan && userPlans[i].plan.name === "Basic")
			) {
				await userPlans[i].destroy();

				const userCameras = await postgres.AssignedCard.findAll({
					where: {
						userId: userId,
					},
					attributes: ["id", "userId"],
					include: [
						{
							model: postgres.Card,
							attributes: ["id", "cardTypeId"],
							required: true,
							include: [
								{
									model: postgres.CardType,
									attributes: ["name", "aiCredit"],
									where: {
										id: { [postgres.Op.ne]: 9 },
									},
									required: true,
								},
							],
						},
					],
				});

				let credit = 0;
				for (let c of userCameras) {
					const aiCredit = c.card.cardType.aiCredit;

					credit += parseInt(aiCredit);
				}

				if (credit > 0) {
					const plan = await postgres.Plan.findOne({
						where: {
							name: "NFT Holders",
						},
					});

					await postgres.UserPlan.create({
						userId: userId,
						planId: plan.id,
						assetId: plan.assetId,
						price: plan.price,
						limit: credit,
						remaining: credit,
						isUpscalable: plan.isUpscalable,
						isWatermark: plan.isWatermark,
						hasBlueTick: plan.hasBlueTick,
						maxUpscale: plan.maxUpscale,
					});
				}
			} else {
				//Free plan
				if (userPlans[i].remaining <= 0) await userPlans[i].destroy();
			}
		} catch (e) {
			logger.error(e);
		}
	}
}

const updateNftStakePlansCJ = new CronJob("0 0 0 * * *", updateNftStakePlans);

async function updateNftStakePlans() {
	console.log("updateNftStakePlans started");

	const io = app.request.app.get("socketIo");
	let userNotifications = []

	const userNftStakes = await postgres.UserNftStake.findAll({
		where: { paid: false },
		include: [
			{ model: postgres.AssignedCard, include: [ { model: postgres.Card } ] },
			{ model: postgres.NftStake },
			{ model: postgres.User },
		]
	})

	let transaction = await postgres.sequelize.transaction();

	try {

		for (let userNftStake of userNftStakes){


			if (userNftStake.days - 1 <= 0){

				userNftStake.paid = true

				await userNftStake.save({ transaction })

				const userReward = userNftStake.amount


				const busd = await postgres.Asset.findOne({
					where: { coin: 'BUSD', isActive: true }
				})

				let busdUserWallet = await postgres.UserWallet.findOne({
					where: { userId: userNftStake.userId, assetId: busd.id }
				})

				if (!busdUserWallet) busdUserWallet = await postgres.UserWallet.create({ userId: userNftStake.userId, assetId: busd.id });

				await busdUserWallet.increment("amount", {
					by: userReward,
					transaction,
				});

				const userNotification = {
					userId: userNftStake.userId,
					user: userNftStake.user,
					title: "Stake NFT reward",
					description: `Your ${userNftStake.assignedCard.card.name} NFT staking period has been ended. You have received a prize of ${userReward}$ . You can check your equity balance on your wallet`,
				};

				userNotifications.push(userNotification)

			}
			userNftStake.days--
			await userNftStake.save({ transaction })

			if (userNftStake.days && (userNftStake.days % 3 === 0)){

				const lockedProfit = em.div(em.mul(userNftStake.amount, em.sub(userNftStake.nftStake.days, userNftStake.days)), userNftStake.nftStake.days).toFixed(2)

				const description = `Your staking profit is: ${lockedProfit}$ so far, and ${userNftStake.days} days left to unlock`

				const updateNotification = {
					userId: userNftStake.userId,
					user: userNftStake.user,
					title: "Stake NFT",
					description,
				};

				userNotifications.push(updateNotification)
			}

		}

		if (userNotifications.length)
			await postgres.UserNotification.bulkCreate(userNotifications, {transaction});


		await transaction.commit();

		for (const item of userNotifications){

			io.to(`UserId:${item.userId}`).emit("notification", JSON.stringify(item));

			sendPushToToken(item.user, {}, { title: item.title, body: item.description });

			mail(item.user.email, 1111, 'STAKE', {}, item.title, item.description);

		}

		console.log("updateNftStakePlans ended");

		return "SUCCESS";
	} catch (e) {
		await transaction.rollback();
		console.log("error for nft stake reward ===> " + e);
		throw new ConflictError("error for nft stake reward", BAD_REQUEST.CODE);
	}
}

// job.start();
updateSwapRates.start();
agentReportFiller.start();
changeStatus.start();
updateCurrencies.start();
Fee.start();
ChargeAiPlans.start();
updateNftStakePlansCJ.start();
