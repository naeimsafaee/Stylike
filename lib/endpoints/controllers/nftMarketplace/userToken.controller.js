const {
    httpResponse: {response},
    httpStatus,
} = require("../../../utils");

const {userTokenService} = require("../../../services/nftMarketplace");

exports.addToken = async (req, res) => {
    const {
        name,
        description,
        supply,
        chain,
        unblockableContent,
        url,
        explicitContent,
        properties,
        collectionId,
        isLazyMint,
    } = req.body;
    const data = await userTokenService.addToken(
        name,
        description,
        supply,
        chain,
        unblockableContent,
        url,
        explicitContent,
        properties,
        req.files,
        collectionId,
        req.userEntity,
        req.fileValidationError,
        isLazyMint,
    );
    return response({res, statusCode: httpStatus.OK, data});
};

/**
 * update user token
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.updateToken = async (req, res) => {
    const {tokenId, txId} = req.body;
    const data = await userTokenService.updateToken(req.userEntity.id, tokenId, txId);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getTokens = async (req, res) => {
    const data = await userTokenService.getTokens(req.query);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getToken = async (req, res) => {
    const {id} = req.params;
    const data = await userTokenService.getToken(id, req.userEntity);
    return response({res, statusCode: httpStatus.OK, data});
};
exports.tokenSelector = async (req, res) => {
    const {page, limit, order, searchQuery} = req.query;
    const data = await userTokenService.tokenSelector(page, limit, order, searchQuery);
    return response({res, statusCode: httpStatus.OK, data});
};
exports.getTokensByManager = async (req, res) => {
    const data = await userTokenService.getTokens(req.query);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getTokenByManager = async (req, res) => {
    const {id} = req.params;
    const data = await userTokenService.getToken(id);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.tokenSelectorByManager = async (req, res) => {
    const {page, limit, order, searchQuery} = req.query;
    const data = await userTokenService.tokenSelector(page, limit, order, searchQuery);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getUserPendingTokens = async (req, res) => {
    const data = await userTokenService.getUserPendingTokens(req.query, req.userEntity);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getTokenUnblockableContent = async (req, res) => {
    const {id} = req.params;
    const data = await userTokenService.getTokenUnblockableContent(id, req.userEntity);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.editUserTokenByManager = async (req, res) => {
    const {id, isTrend, isSlider} = req.body;
    const data = await userTokenService.editUserTokenByManager(id, isTrend, isSlider);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.getTokensCount = async (req, res) => {
    const data = await userTokenService.getTokensCount(req.userEntity);
    return response({res, statusCode: httpStatus.OK, data});
};

/**
 * import existing token from user
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.importToken = async (req, res) => {
    const data = await userTokenService.importToken(req.userEntity, req.body);
    return response({res, statusCode: httpStatus.OK, data});
};

exports.userDiamonds = async (req, res) => {
    const data = await userTokenService.userDiamonds(req.query.user, req.body);
    return response({res, statusCode: httpStatus.OK, data});
};
