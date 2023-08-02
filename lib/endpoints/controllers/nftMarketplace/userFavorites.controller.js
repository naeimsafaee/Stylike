const {
	httpResponse: { response, apiError },
	httpStatus,
} = require("../../../utils");
const { userFavoritesService } = require("../../../services/nftMarketplace");

exports.getOneUserFavoritesByManager = async (req, res) => {
	const { id } = req.params;
	const data = await userFavoritesService.getOneUserFavoritesByManager(id);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.getAllUserFavoritesByManager = async (req, res) => {
	const data = await userFavoritesService.getAllUserFavoritesByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};

exports.userFavoritesSelectorByManager = async (req, res) => {
	const data = await userFavoritesService.userFavoritesSelectorByManager(req.query);
	return response({ res, statusCode: httpStatus.OK, data });
};
