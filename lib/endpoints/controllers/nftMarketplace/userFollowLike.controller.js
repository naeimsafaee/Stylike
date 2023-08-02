const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { userFollowLikeService } = require("../../../services/nftMarketplace");

exports.followUser = async (req, res) => {
	const { address } = req.body;

	const data = await userFollowLikeService.followUser(address, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.unFollowUser = async (req, res) => {
	const { address } = req.body;
	const data = await userFollowLikeService.unFollowUser(address, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.likeToken = async (req, res) => {
	const { tokenId } = req.body;
	const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

	const data = await userFollowLikeService.likeToken(tokenId, req.userEntity?.id, ip);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.unLikeToken = async (req, res) => {
	const { tokenId } = req.body;
	const data = await userFollowLikeService.unLikeToken(tokenId, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.likeCollection = async (req, res) => {
	const { collectionId } = req.body;

	const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || null;

	const data = await userFollowLikeService.likeCollection(collectionId, req.userEntity?.id, ip);
	return response({ res, statusCode: httpStatus.OK, data });
};
exports.unLikeCollection = async (req, res) => {
	const { collectionId } = req.body;
	const data = await userFollowLikeService.unLikeCollection(collectionId, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserFollowers = async (req, res) => {
	const { page, limit, address } = req.query;

	const data = await userFollowLikeService.getUserFollowers(page, limit, address);
	return response({ res, statusCode: httpStatus.OK, data });
};
exports.getUserFollowing = async (req, res) => {
	const { page, limit, address } = req.query;

	const data = await userFollowLikeService.getUserFollowing(page, limit, address);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserFavoriteToken = async (req, res) => {
	const { page, limit } = req.query;

	const data = await userFollowLikeService.getUserFavoriteToken(page, limit, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};
exports.getUserFavoriteCollection = async (req, res) => {
	const { page, limit } = req.query;

	const data = await userFollowLikeService.getUserFavoriteCollection(page, limit, req.userEntity.id);
	return response({ res, statusCode: httpStatus.OK, data });
};
