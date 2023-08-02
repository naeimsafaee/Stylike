const { postgres } = require("../../databases");

async function giveUserFreePlan(userId) {
	const plan = await postgres.Plan.findOne({
		where: {
			name: "Free",
		},
	});

	if (plan) {
		await new postgres.UserPlan({
			userId: userId,
			planId: plan.id,
			assetId: plan.assetId,
			price: plan.price,
			limit: plan.limit,
			remaining: plan.limit,
			isUpscalable: plan.isUpscalable,
			isWatermark: plan.isWatermark,
			hasBlueTick: plan.hasBlueTick,
			maxUpscale: plan.maxUpscale,
		}).save();
		return true;
	}
	return false;
}

async function giveUserNftHolderPlan(userId, cardType) {
	const aiCredit = parseInt(cardType.aiCredit);

	const plan = await postgres.Plan.findOne({
		where: {
			name: "NFT Holders",
		},
	});

	const userPlan = await postgres.UserPlan.findOne({
		where: {
			userId: userId,
		},
		include: [
			{
				model: postgres.Plan,
				required: true,
			},
		],
	});

	if (userPlan && userPlan.plan.name === "NFT Holders") {
		await userPlan.increment("remaining", { by: aiCredit });
	} else {
		const freePlan = await postgres.Plan.findOne({
			wehre: {
				name: "Free",
			},
		});

		const userFreePlan = await postgres.UserPlan.findOne({
			where: {
				userId,
				planId: freePlan.id,
			},
		});

		let freeCredit = 0;
		if (userFreePlan) {
			freeCredit = userFreePlan.remaining;
		}

		await postgres.UserPlan.destroy({
			where: {
				userId,
				planId: freePlan.id,
			},
			force: true,
		});

		await new postgres.UserPlan({
			userId: userId,
			planId: plan.id,
			assetId: plan.assetId,
			price: plan.price,
			limit: aiCredit + freeCredit,
			remaining: aiCredit + freeCredit,
			isUpscalable: plan.isUpscalable,
			isWatermark: plan.isWatermark,
			hasBlueTick: plan.hasBlueTick,
			maxUpscale: plan.maxUpscale,
		}).save();
	}
}

async function getAllPlans(where = {}) {
	return await postgres.Plan.findAll({ where: where });
}

async function getUserPlans(where = {}, limit = 10, page = 1) {
	return await postgres.UserPlan.findAndCountAll({
		where: where,
		limit: limit,
		offset: (page - 1) * limit,
		include: [
			{
				model: postgres.Plan,
				attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
			},
			{
				model: postgres.User,
				attributes: { exclude: ["createdAt", "updatedAt", "deletedAt"] },
			},
		],
		attributes: { exclude: ["updatedAt", "deletedAt"] },
		order: [["createdAt", "DESC"]],
	});
}

module.exports = {
	giveUserFreePlan,
	giveUserNftHolderPlan,
	getAllPlans,
	getUserPlans,
};
