const { postgres, redis } = require("../databases");
const { HumanError } = require("../services/errorhandler");
const Errors = require("../services/errorhandler/MessageText");
const { BAD_REQUEST } = require("../services/errorhandler/StatusCode");
const em = require("exact-math");
const { price } = require("./asset.service");

exports.getAllNftStake = async () => {
	const nftStakes = await postgres.NftStake.findAll({
		where: { isActive: true },
		include: [{ model: postgres.NftStakePrize, include: [{ model: postgres.CardType }] }],
	});
	const BNBtoUSDTPrice = await price({
		fromToken: "BNB",
		toToken: "USDT_BSC",
		slippage: 1,
		balanceIn: 1,
		origin: "in",
	});

	for (let stake of nftStakes) {
		for (let prize of stake.nftStakePrizes) {
			const rewardPercent = em.div(em.mul(prize.percent, stake.days), 30);
			prize.setDataValue(
				"usdtReward",
				em.div(em.mul(BNBtoUSDTPrice.price, prize.cardType.price, rewardPercent), 100).toFixed(2),
			);
		}
	}

	return nftStakes;
};

exports.storeNftStake = async (data, userId) => {
	const { assignedCardId, nftStakeId } = data;

	const assignedCard = await postgres.AssignedCard.findOne({
		where: { userId, id: assignedCardId },
		include: [{ model: postgres.Card, include: [{ model: postgres.CardType }] }],
	});

	if (!assignedCard) throw new HumanError(Errors.CARD_NOT_FOUND.MESSAGE, 400);

	const result = await checkNftUsed(assignedCard);

	if (result) throw new HumanError("You have already used your nft", 400);

	const prevPlan = await postgres.UserNftStake.findOne({
		where: { assignedCardId },
	});

	if (prevPlan) throw new HumanError("You already had a stake plan with this nft", BAD_REQUEST.code);

	const nftStake = await postgres.NftStake.findOne({
		where: { id: nftStakeId },
	});

	if (!nftStake) throw new HumanError("stake plan not found", BAD_REQUEST.code);

	const nftStakePrize = await postgres.NftStakePrize.findOne({
		where: {
			nftStakeId,
			cardTypeId: assignedCard.card.cardTypeId,
		},
		include: [ { model: postgres.NftStake } ]
	});

	let percent, days;

	if (nftStakePrize) {
		days = nftStakePrize.nftStake.days;
		percent = nftStakePrize.percent;
	} else {
		days = 30;
		percent = 10;
	}

	const rewardPercent = em.div(em.mul(percent, days), 30);
	const currentRewardAmountInBNB = em.mul(assignedCard.card.cardType.price, rewardPercent) / 100;

	const BNBtoUSDTPrice = await price({
		fromToken: "BNB",
		toToken: "USDT_BSC",
		slippage: 1,
		balanceIn: 1,
		origin: "in",
	});

	const userReward = em.mul(BNBtoUSDTPrice.price, currentRewardAmountInBNB);

	await postgres.UserNftStake.create({
		userId,
		assignedCardId: assignedCard.id,
		nftStakeId,
		percent: rewardPercent,
		amount: userReward.toFixed(2),
		days: nftStake.days,
	});

	return "Success";
};

exports.nftStakeHistory = async (data, userId) => {
	const { page, limit } = data;

	const offset = (page - 1) * limit;

	const plans = await postgres.UserNftStake.findAndCountAll({
		where: { userId },
		limit,
		offset,
		include: [
			{
				model: postgres.User,
				attributes: { exclude: ["password", "salt"] },
			},
			{
				model: postgres.NftStake,
			},
			{
				model: postgres.AssignedCard,
				include: [{ model: postgres.Card, include: [{ model: postgres.CardType }] }],
			},
		],
		order: [["createdAt", "DESC"]],
	});

	let details = { totalLockedProfit: 0, totalProfitEarned: 0, inStake: 0, finishedStake: 0 };

	for (let plan of plans.rows) {
		const lockedProfit = em
			.div(em.mul(plan.amount, em.sub(plan.nftStake.days, plan.days)), plan.nftStake.days)
			.toFixed(2);
		plan.setDataValue("lockedProfit", lockedProfit);

		if (plan.paid === false) {
			details.totalLockedProfit += parseFloat(lockedProfit);
			details.inStake++;
		} else {
			details.totalProfitEarned += parseFloat(plan.amount);
			details.finishedStake++;
		}
	}

	details.totalLockedProfit = details.totalLockedProfit.toFixed(2);
	details.totalProfitEarned = details.totalProfitEarned.toFixed(2);

	return {
		details,
		total: plans.count,
		pageSize: limit,
		page,
		data: plans.rows,
	};
};

exports.getQualifiedAssignedCards = async (userId) => {
	let assignedCards = await postgres.AssignedCard.findAll({
		where: { userId },
		include: [
			{ model: postgres.UserNftStake, required: false },
			{
				model: postgres.Card,
				include: [{ model: postgres.CardType }, { model: postgres.MatchParticipantTeam, required: false }],
			},
		],
	});

	for (let i = 0; i < assignedCards.length; i++) {
		if (assignedCards[i]?.userNftStakes.length || assignedCards[i]?.card.matchParticipantTeams.length) {
			assignedCards.splice(i, 1);
			i--;
		}
	}

	return assignedCards;
};

exports.deleteNftStake = async (id, userId) => {

	const userNftStake = await postgres.UserNftStake.findOne({
		where: { userId, id }
	})

	if (!userNftStake)
		throw new HumanError('there is no stake plan' , BAD_REQUEST.code)

	if (userNftStake.paid)
		throw new HumanError('Your stake plan is over' , BAD_REQUEST.code)


	await userNftStake.destroy()


	return "Success"

};


async function checkNftUsed(assignedCard) {
	const participant = await postgres.MatchParticipantTeam.findOne({
		where: { cardId: assignedCard.cardId },
	});

	return participant ? true : false;
}
