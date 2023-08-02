const {
	httpResponse: { response },
	httpStatus,
} = require("./../../utils");
const { userService, notificationServices, auctionService, bonusService } = require("./../../services");

const excelJS = require("exceljs");
const { postgres } = require("../../databases");
const { findUserDamageAttribute } = require("../../services/Game/attributes.service");
const { HumanError } = require("../../services/errorhandler");
const { ConflictError } = require("../../services/errorhandler");
const { sendPushToToken } = require("../../services/notification.service");
const em = require("exact-math");


//? Detect user ip location
exports.detect = async (req, res) => {
	/* #swagger.tags = ['Test'] */
	try {
		const data = await userService.detect(req);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.info = async (req, res) => {
	const data = await userService.info(req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

//? User signup
exports.signUp = async (req, res) => {
	const { name, mobile, email, password, referredCode, countryId, link } = req.body;
	const data = await userService.signUp(name, mobile, email, password, referredCode, req, countryId, link);
	return response({ res, statusCode: httpStatus.OK, data });
};

//? User signup
exports.updateCred = async (req, res) => {
	const { mobile, email } = req.body;
	const data = await userService.updateCred(mobile, email, req.userEntity.id, req);
	return response({ res, statusCode: httpStatus.OK, data });
};

//? User login
exports.login = async (req, res) => {
	const { mobile, email, password } = req.body;
	const data = await userService.login(mobile, email, password);
	return response({ res, statusCode: httpStatus.OK, data });
};

//? User Edit Profile
exports.editProfile = async (req, res) => {
	try {
		const { name, countryId } = req.body;
		const data = await userService.editProfile({ name, id: req.userEntity.id, files: req.files, countryId });
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete user account
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteAccount = async (req, res) => {
	try {
		const { password } = req.body;
		const data = await userService.deleteAccount(password, req.userEntity.id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add user wallet address
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addAddress = async (req, res) => {
	try {
		const { address } = req.body;
		const data = await userService.addAddress(req.userEntity, address);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

//? User forget password request
exports.forgetPassword = async (req, res) => {
	try {
		const { email, mobile } = req.body;
		const data = await userService.forgetPassword(email, mobile, req);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

//? User reset password request
exports.resetPassword = async (req, res) => {
	try {
		const { token, password } = req.body;
		const data = await userService.resetPassword(token, password);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

//? User reset password request
exports.changePassword = async (req, res) => {
	try {
		const { oldPassword, newPassword } = req.body;
		const data = await userService.changePassword(oldPassword, newPassword, req.userEntity.id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.verify = async (req, res) => {
	const io = req.app.get("socketIo");

	const { token, code, pushToken } = req.body;

	const data = await userService.verify(req, token, code, pushToken, io);

	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * user refresh token
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.refreshToken = async (req, res) => {
	try {
		const data = await userService.refreshToken(req.sessionEntity, req.userEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * logout user and delete active token
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.logout = async (req, res) => {
	try {
		const data = await userService.logout(req.sessionEntity);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.notification = async (req, res) => {
	try {
		const { type, page, limit, status } = req.query;

		const data = await notificationServices.get(type, page, limit, status, Number(req.userEntity?.id));
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.updateNotification = async (req, res) => {
	try {
		const { fcm_token } = req.body;

		const data = await notificationServices.updateToken(fcm_token, Number(req.userEntity?.id));
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(400).json(e);
	}
};

exports.notificationStatus = async (req, res) => {
	try {
		const { notification_id } = req.params;
		const data = await notificationServices.changeStatus(Number(req.userEntity?.id), notification_id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

exports.readNotification = async (req, res) => {
	const { notification_id } = req.body;
	const data = await notificationServices.readNotification(Number(req.userEntity?.id), notification_id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.referral = async (req, res) => {
	const data = await userService.referral(req.userEntity);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * get list user referral history
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.referralHistory = async (req, res) => {
	const data = await userService.referralHistory(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * get list user referral commission
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.referralCommission = async (req, res) => {
	try {
		const data = await userService.referralCommission(req.query, req.userEntity.id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		if (!e.statusCode) e = { statusCode: 500, status: "Internal Error", message: e.message };
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuctions = async (req, res) => {
	try {
		const { status, page, limit, order } = req.query;
		const data = await auctionService.getAll({ status, page, limit, order, userId: req.userEntity.id });
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user auctions
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserAuctions = async (req, res) => {
	try {
		const data = await auctionService.getUserAuctions({ userId: req.userEntity.id, ...req.query });
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserAuction = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getUserAuction({ userId: req.userEntity.id, id });
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getAuction = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await auctionService.getOne(id, req.userEntity.id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add new auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addAuction = async (req, res) => {
	try {
		const io = req.app.get("socketIo");

		const { assignedCardId, start, end, basePrice, immediatePrice, bookingPrice, auctionType } = req.body;

		const data = await auctionService.add(
			req.userEntity.id,
			assignedCardId,
			start,
			end,
			basePrice,
			immediatePrice,
			bookingPrice,
			null,
			io,
			auctionType,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editAuction = async (req, res) => {
	try {
		const io = req.app.get("socketIo");

		const { id, start, end, basePrice, immediatePrice, bookingPrice } = req.body;
		const data = await auctionService.edit(
			req.userEntity.id,
			id,
			start,
			end,
			basePrice,
			immediatePrice,
			bookingPrice,
			null,
			io,
		);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		// console.log(e);
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteAuction = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await auctionService.del(req.userEntity.id, req.params.id, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		// console.log(e);
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user offers for auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getOffers = async (req, res) => {
	try {
		const { auctionId, status, page, limit, order } = req.query;
		const data = await auctionService.getOffers({
			auctionId,
			status,
			page,
			limit,
			order,
			userId: req.userEntity.id,
		});
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get user offer for auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getOffer = async (req, res) => {
	try {
		const { id } = req.query;
		const data = await auctionService.getOffer(id);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * add offer for auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addOffers = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const { auctionId, amount } = req.body;
		const data = await auctionService.addOffers(req.userEntity.id, auctionId, amount, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * edit offer for auction
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editOffers = async (req, res) => {
	try {
		const { id, amount } = req.body;
		const data = await auctionService.editOffers(req.userEntity.id, id, amount);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * delete auction offer
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteOffers = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await auctionService.deleteOffers(req.userEntity.id, req.params.id, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

///////////////////////////////// User CRUD /////////////////////////////////////////////////
/**
 * Get Users for manager
 * @param {*} req
 * @param {*} res
 */
exports.getUsers = async (req, res) => {
	const data = await userService.getUsers(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Get Users for manager
 * @param {*} req
 * @param {*} res
 */
exports.getUsersSelector = async (req, res) => {
	try {
		const data = await userService.getUsersSelector(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Add Users by manager
 * @param {*} req
 * @param {*} res
 */
exports.addUsers = async (req, res) => {
	try {
		const data = await userService.addUsers(req.body, req.files);
		return response({ res, statusCode: httpStatus.CREATED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.damageAttribute = async (req, res) => {
	const damageAttribute = await findUserDamageAttribute(req.body.cardId, req.userEntity.id);

	if (damageAttribute && parseFloat(damageAttribute.amount) >= 100)
		throw new HumanError("Your heat damage is on Ash mode,please cool it down", 403);

	return response({ res, statusCode: httpStatus.ACCEPTED, data: damageAttribute });
};

/**
 * edit Users by manager
 * @param {*} req
 * @param {*} res
 */
exports.editUsers = async (req, res) => {
	try {
		const data = userService.editUsers(req.body, req.files);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

exports.excelExport = async (req, res) => {
	const workbook = new excelJS.Workbook();
	const worksheet = workbook.addWorksheet("Users");
	const path = "./public";

	worksheet.columns = [
		{ header: "email", key: "email", width: 20 },
		{ header: "first_name", key: "name", width: 10 },
		{ header: "last_name", key: "", width: 10 },
		{ header: "address_line_1", key: "address", width: 10 },
		{ header: "address_line_2", key: "", width: 10 },
		{ header: "city", key: "", width: 10 },
		{ header: "state_province_region", key: "", width: 10 },
		{ header: "postal_code", key: "", width: 10 },
		{ header: "country", key: "country_name", width: 10 },
	];

	const users = await postgres.User.findAll({
		raw: true,
		attributes: { exclude: ["password", "salt"] },
		include: postgres.Country,
		nest: true,
	});

	users.forEach((user) => {
		user.country_name = user.country?.countryName;

		worksheet.addRow(user);
	});

	worksheet.getRow(1).eachCell((cell) => {
		cell.font = { bold: true };
	});

	try {
		await workbook.xlsx.writeFile(`${path}/users.xlsx`).then(() => {
			res.send({
				status: "success",
				path: `${path}/users.xlsx`,
			});
		});
	} catch (err) {
		res.send({
			status: "error",
			message: "Something went wrong",
			err: err,
		});
	}
};

exports.seed_cards = async (req, res) => {
	const cards = await postgres.Card.findAll({});

	for (let i = 0; i < cards.length; i++) {
		const assigned_card = await postgres.AssignedCard.findOne({
			where: {
				cardId: cards[i].id,
			},
		});

		if (!assigned_card) {
			await postgres.AssignedCard.create({
				cardId: cards[i].id,
				userId: null,
				type: "TRANSFER",
				usedCount: 0,
				status: "INAUCTION",
			});
		}
	}
	return res.send("ok");
};

/**
 * delete Users by manager
 * @param {*} req
 * @param {*} res
 */
exports.deleteUsers = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await userService.deleteUsers(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * find user by id by manager
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.findUserById = async (req, res) => {
	try {
		const { id } = req.params;
		const data = await userService.findUserById(id);
		return response({ res, statusCode: httpStatus.ACCEPTED, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * Get getUserActivity for manager
 * @param {*} req
 * @param {*} res
 */
exports.getUserActivity = async (req, res) => {
	try {
		const data = await userService.getUserActivity(req.query);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(e.statusCode).json(e);
	}
};

/**
 * get competition prize
 *
 */
exports.getPrizeCompetition = async (req, res) => {
	const { id } = req.params;
	const data = await userService.getPrizeCompetition(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * invite link handler
 * @param {*} req
 * @param {*} res
 * @param {*} code
 * @returns
 */
exports.inviteLinkHandler = async (req, res) => {
	try {
		const { code } = req.params;
		const data = await userService.inviteLinkHandler(res, code);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		// console.log(e);
		return res.status(e.statusCode).json(e);
	}
};

exports.testNotif = async (req, res) => {
	try {
		const io = req.app.get("socketIo");
		const data = await userService.testNotif(req.query.userId, io);
		return response({ res, statusCode: httpStatus.OK, data });
	} catch (e) {
		return res.status(500).json(e);
	}
};

exports.getAttributes = async (req, res) => {
	const data = await userService.getAttributes(req.params.userId);
	return res.send({
		data: data,
	});
};

exports.editAttribute = async (req, res) => {
	const data = await userService.editAttribute(req.params.attributeId, req.body.amount, req.body.text);
	return res.send({
		data: data,
	});
};

exports.getCompetition = async (req, res) => {
	const data = await userService.getCompetition(req.params.userId);
	return res.send({
		data: data,
	});
};

exports.getUserReferrals = async (req, res) => {
	const data = await userService.getUserReferrals(req.params.userId);
	return res.send({
		data: data,
	});
};

exports.getUserDamageHistory = async (req, res) => {
	const { userId } = req.params;
	const data = req.query;
	const result = await userService.getUserDamageHistory(userId, data);
	return res.send({
		data: result,
	});
};

exports.test = async (req, res) => {
	const io = req.app.get("socketIo");
	console.log("updateNftStakePlans started")
	// return

	// const io = app.request.app.get("socketIo");
	let userNotifications = []
	// let updateNotifications = []

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
					// description: `congratulations! You have received a prize of ${userReward} BUSD for stake your ${userNftStake.assignedCard.card.name} nft.`,
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

			// mail(item.user.email, 1111, 'STAKE', { title: item.title, text: item.description });

		}




		return "SUCCESS"

	} catch (e) {
		await transaction.rollback();
		console.log("error for nft stake reward ===> " + e)
		throw new ConflictError("error for nft stake reward", 400);
	}

};