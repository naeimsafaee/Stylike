const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
// const { serializeUser, getUserWallet, serializeManger } = require("../../../utils/serializer/user.serializer");
const { authService } = require("../../../services/nftMarketplace");

exports.managerLogin = async (req, res) => {
	const { email, password } = req.body;
	const data = await authService.managerLogin(email, password);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserInfo = async (req, res) => {
	const data = await authService.serializeUser(req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.userRegister = async (req, res) => {
	const io = req.app.get("socketIo");

	const data = await authService.userRegister(req, io);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.addReferredCode = async (req, res) => {
	const data = await authService.addReferredCode(req.userEntity._id, req.body);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.seenGhostModal = async (req, res) => {
	const data = await authService.seenGhostModal(req.userEntity);
	return response({ res, statusCode: httpStatus.OK, data });
};


exports.getManagerInfo = async (req, res) => {
	const data = await authService.managerInfo(req.userEntity._id);

	return response({ res, statusCode: httpStatus.OK, data });
};
