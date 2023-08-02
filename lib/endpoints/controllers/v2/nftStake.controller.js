const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const NftStakeService = require("../../../services/nftStake.service");
const { postgres } = require("./../../../databases");

exports.getAllNftStake = async (req, res, next) => {
	let data = await NftStakeService.getAllNftStake();
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.storeNftStake = async (req, res) => {
	let data = await NftStakeService.storeNftStake(req.body, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.nftStakeHistory = async (req, res, next) => {
	let data = await NftStakeService.nftStakeHistory(req.query, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getQualifiedAssignedCards = async (req, res, next) => {
	let data = await NftStakeService.getQualifiedAssignedCards(req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.deleteNftStake = async (req, res, next) => {
	let data = await NftStakeService.deleteNftStake(req.body.id, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};


