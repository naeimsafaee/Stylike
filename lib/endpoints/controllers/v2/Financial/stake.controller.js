const {
	httpResponse: { response },
	httpStatus,
} = require("../../../../utils");
const { postgres } = require("../../../../databases");
const { HumanError } = require("../../../../services/errorhandler");
const Errors = require("../../../../services/errorhandler/MessageText");

exports.index = async (req, res) => {
	const stake = await postgres.StylStake.findAll({
		include: {
			model: postgres.LensSetting,
			attributes: ["name", "calculator_image"],
		},
	});

	return response({ res, statusCode: httpStatus.OK, data: stake });
};

exports.store = async (req, res) => {
	const userAmount = parseInt(req.body.userAmount);

	const userStake = await postgres.UserStylStake.findOne({
		where: {
			userId: req.userEntity.id,
		},
	});
	if (userStake) throw new HumanError("You cant have more than 1 plan at the same time !", 400);

	const stake = await postgres.StylStake.findOne({
		where: {
			id: req.body.stakeId,
		},
	});

	if (!stake) throw new HumanError("plan not found !", 400);

	if (userAmount < stake.stylAmount) throw new HumanError("please enter an amount more than minimum!", 400);

	let userLens = null;

	if(stake.lensSettingId){
		userLens = await postgres.UserLens.findOne({
			include: {
				model: postgres.Lens,
				attributes: ["lensSettingId"],
				where: {
					lensSettingId: stake.lensSettingId,
				},
				required: true,
			},
			where: {
				userId: req.userEntity.id,
			},
		});

		if (!userLens)
			throw new HumanError("You dont have the required lens !", 400);

		userLens = userLens.lensId;
	}

	const oldStake = await postgres.UserStylStake.findOne({
		where: {
			userId: req.userEntity.id,
			lensId: userLens,
			stylStakeId: req.body.stakeId,
		},
	});

	if (oldStake) throw new HumanError("Your lens has already been used!", 400);

	const STYL = await postgres.Asset.findOne({
		where: {
			coin: "STYL",
		},
	});
	const userwallet = await postgres.UserWallet.findOne({
		where: {
			assetId: STYL.id,
			userId: req.userEntity.id,
		},
	});

	if (!userwallet)
		await postgres.UserWallet.create({
			assetId: STYL.id,
			userId: req.userEntity.id,
			amount: 0,
		});

	if (userwallet.amount < userAmount) throw new HumanError("You don't have enough STYL !", 400);

	const transaction = await postgres.sequelize.transaction();
	try {
		await userwallet.decrement("amount", { by: +userAmount, transaction });
		await userwallet.increment("stake", { by: +userAmount, transaction });

		await new postgres.UserStylStake({
			userId: req.userEntity.id,
			stylStakeId: stake.id,
			days: stake.days,
			userAmount: userAmount,
			lensId: userLens,
			percent: stake.percent,
			unLockable: stake.unLockable,
		}).save({ transaction });

		await transaction.commit();
	} catch (e) {
		await transaction.rollback();
		throw e;
	}

	return response({ res, statusCode: httpStatus.OK, data: { message: "success" } });
};

exports.update = async (req, res) => {
	const plan = await postgres.UserStylStake.findOne({
		where: {
			id: req.params.id,
		},
	});

	if (!plan) throw new HumanError("plan doesn't not exist", 400);

	if (plan.userId !== req.userEntity.id)
		throw new HumanError("You cant edit this plan", 400);

	if(plan.unLockable === false)
		throw new HumanError("You can't cancel this plan until the time is over.", 400);

	const STYL = await postgres.Asset.findOne({
		where: {
			coin: "STYL",
		},
	});

	const userwallet = await postgres.UserWallet.findOne({
		where: {
			assetId: STYL.id,
			userId: req.userEntity.id,
		},
	});

	if (userwallet.stake - plan.userAmount < 0)
		throw new HumanError("something went wrong !", 400);

	const transaction = await postgres.sequelize.transaction();
	try {
		await userwallet.decrement("stake", { by: +plan.userAmount, transaction });
		await userwallet.increment("amount", { by: +plan.userAmount, transaction });
		await plan.destroy({transaction});

		await transaction.commit();
	} catch (e) {
		await transaction.rollback();
		throw e;
	}

	return response({ res, statusCode: httpStatus.OK, data: { message: "success" } });
};

exports.stylStakeHistory = async (req, res) => {
	const { limit, page } = req.query;
	const offset = (page - 1) * limit;

	const result = await postgres.UserStylStake.findAndCountAll({
		where: {
			userId: req.userEntity.id,
		},
		include: {
			model: postgres.StylStake,
			attributes: ["id", "lensSettingId", "percent", "title"],
			paranoid: false,
			include: {
				model: postgres.LensSetting,
				attributes: ["name", "calculator_image"],
			},
		},
		paranoid: false,
		limit,
		offset,
		order: [["createdAt", "DESC"]],
	});

	return response({
		res,
		statusCode: httpStatus.OK,
		data: {
			total: result.count || 0,
			pageSize: limit,
			page,
			data: result.rows,
		},
	});
};

exports.stylStakeStatistic = async (req, res) => {
	const total_value_locked = await postgres.UserStylStake.sum("userAmount");
	const stake_holders = await postgres.UserStylStake.count();

	return response({
		res,
		statusCode: httpStatus.OK,
		data: {
			total_value_locked: total_value_locked,
			stake_holders: stake_holders,
		},
	});
};
