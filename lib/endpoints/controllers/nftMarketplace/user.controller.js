const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { userService, notificationService } = require("../../../services/nftMarketplace");

exports.addUsers = async (req, res) => {
	const data = await userService.addUsers(req.body, req.files, req.fileValidationError);
	return response({ res, statusCode: httpStatus.CREATED, data });
};

exports.editUsers = async (req, res) => {
	const data = await userService.editUsers(req.body, req.files, req.userEntity, req.fileValidationError);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.editUsersByManager = async (req, res) => {
	const data = await userService.editUsersByManager(req.body, req.files, req.fileValidationError);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.deleteUsers = async (req, res) => {
	const { id } = req.params;
	const data = await userService.deleteUsers(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.findUserById = async (req, res) => {
	const { id } = req.params;
	const data = await userService.findUserById(id);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.inviteLinkHandler = async (req, res) => {
	const { code } = req.params;
	const data = await userService.inviteLinkHandler(res, code);
	return response({ res, statusCode: httpStatus.OK, data });
};
exports.getUser = async (req, res) => {
	const { id } = req.params;
	const { requestedUserId } = req.query;
	const data = await userService.getUser(id, requestedUserId);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

exports.getUsers = async (req, res) => {
	const data = await userService.getUsers(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUsersSelector = async (req, res) => {
	const data = await userService.getUsersSelector(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

// exports.searchUsers = async (req, res) => {
// 	const data = await userService.getUsers(req.body);
// 	return response({ res, statusCode: httpStatus.OK, data });
// };

exports.approveNft = async (req, res) => {
	const data = await userService.approveNft(req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.tabsInfo = async (req, res) => {
	const data = await userService.tabsInfo(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.notification = async (req, res) => {
	const { type, page, limit, status } = req.query;

	const data = await notificationService.get(type, page, limit, status, req.userEntity?._id);
	return response({ res, statusCode: httpStatus.OK, data });
};

// exports.updateNotification = async (req, res) => {
// 	try {
// 		const { fcm_token } = req.body;
//
// 		const data = await notificationService.updateToken(fcm_token, Number(req.userEntity?.id));
// 		return response({ res, statusCode: httpStatus.OK, data });
// 	} catch (e) {
// 		return res.status(400).json(e);
// 	}
// };

exports.notificationStatus = async (req, res) => {
	const { notification_id } = req.params;
	const data = await notificationService.changeStatus(req.userEntity._id, notification_id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.readAllNotification = async (req, res) => {
	const data = await notificationService.readAllNotification(req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.readNotification = async (req, res) => {
	const { notification_id } = req.body;
	const data = await notificationService.readNotification(Number(req.userEntity?.id), notification_id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.sendUserNotif = async (req, res) => {
	const io = req.app.get("socketIo");
	const { userId, title, description } = req.body;
	const data = await notificationService.sendUserNotif(userId, title, description, io);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.test = async (req, res) => {
	const data = await notificationService.test();
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.referral = async (req, res) => {
	const data = await userService.referral(req.userEntity);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};
exports.referralHistory = async (req, res) => {
	const data = await userService.referralHistory(req.query, req.userEntity);
	return response({ res, statusCode: httpStatus.ACCEPTED, data });
};
