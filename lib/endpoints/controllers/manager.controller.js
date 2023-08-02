const {
    httpResponse: { response },
    httpStatus
} = require("./../../utils");
const {
    managerService,
    requestService,
    categoryService
} = require("./../../services");
const { postgres } = require("../../databases");
const { paginate } = require("../../utils/httpResponse");
const { sendPushToToken } = require("../../services/notification.service");

/**
 * get manager info
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.info = async (req, res) => {
    try {
        const data = await managerService.info(req.userEntity.id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get manager list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getManagers = async (req, res) => {
    try {
        const data = await managerService.getManagers();
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * manager login
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.login = async (req, res) => {
    const { email, password } = req.body;
    const data = await managerService.login(email, password);
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.checkManagerLoginCode = async (req, res) => {
    const { email, code } = req.body;
    const data = await managerService.checkManagerLoginCode(email, code);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * manager forget password request
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.forgetPassword = async (req, res) => {
    try {
        const { email, mobile } = req.body;
        const data = await managerService.forgetPassword(email, mobile);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * manager reset password request
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;
        const data = await managerService.resetPassword(token, password);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * manager login or any thing else verify
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.verify = async (req, res) => {
    try {
        const { token, code } = req.body;
        const data = await managerService.verify(token, code);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * manager refresh token
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.refreshToken = async (req, res) => {
    try {
        const data = await managerService.refreshToken(req.sessionEntity, req.userEntity);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * manager logout
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.logout = async (req, res) => {
    try {
        const data = await managerService.logout(req.sessionEntity);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

///////////////////////////////// Setting CRUD /////////////////////////////////////////////////
/**
 * Add Setting
 * @param {*} req
 * @param {*} res
 */
exports.addSetting = async (req, res) => {
    try {
        const data = await managerService.addSetting(req.body);
        return response({ res, statusCode: httpStatus.CREATED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Edit Setting
 * @param {*} req
 * @param {*} res
 */
exports.editSetting = async (req, res) => {
    try {
        const data = managerService.editSetting(req.body);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get Settings
 * @param {*} req
 * @param {*} res
 */
exports.getSettings = async (req, res) => {
    try {
        const data = await managerService.getSettings(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Find Setting By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.findSettingById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.findSettingById(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Delete Setting
 * @param {*} req
 * @param {*} res
 */
exports.deleteSetting = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.deleteSetting(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

///////////////////////////////// Wallet RU /////////////////////////////////////////////////
/**
 * Edit Wallet
 * @param {*} req
 * @param {*} res
 */
exports.editWallet = async (req, res) => {
    try {
        const data = managerService.editWallet(req.body);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get Wallets
 * @param {*} req
 * @param {*} res
 */
exports.getWallets = async (req, res) => {
    try {
        const data = await managerService.getWallets(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        // console.log(e);
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get Wallets
 * @param {*} req
 * @param {*} res
 */
exports.getTotalWallets = async (req, res) => {
    try {
        const data = await managerService.getTotalWallets(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        // console.log(e);
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Find Wallet By Id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.findWalletById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.findWalletById(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

///////////////////////////////// Category /////////////////////////////////////////////////
/**
 * Add category
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addCategory = async (req, res) => {
    try {
        const { service, parent, type, title, description } = req.body;

        const data = await categoryService.addCategory(service, parent, type, title, description, req.files);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.addCategoryTranslation = async (req, res) => {
    try {
        const { title, description, categoryId, languageId } = req.body;

        const data = await categoryService.addCategoryTranslation(
            title,
            description,
            categoryId,
            languageId,
            req.files
        );
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get all categories
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCategories = async (req, res) => {
    try {
        const { page, limit, id, title, service, parent, type, createdAt, searchQuery, sort, order } = req.query;
        const data = await categoryService.getCategories(
            page,
            limit,
            id,
            title,
            service,
            parent,
            type,
            createdAt,
            searchQuery,
            sort,
            order
        );
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get all categories Translation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCategoriesTranslation = async (req, res) => {
    try {
        const { page, limit, title, order, description, categoryId, languageId, createdAt } = req.query;
        const data = await categoryService.getCategoriesTranslation(
            page,
            limit,
            order,
            title,
            description,
            categoryId,
            languageId,
            createdAt
        );
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get one category
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await categoryService.getCategory(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get one category Translation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCategoryTranslation = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await categoryService.getCategoryTranslation(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};
/**
 * Edit category
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editCategory = async (req, res) => {
    try {
        const { id, service, parent, type, title, description } = req.body;
        const data = await categoryService.editCategory(id, service, parent, type, title, description, req.files);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Edit category
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editCategoryTranslation = async (req, res) => {
    try {
        const { id, title, description, categoryId, languageId } = req.body;
        const data = await categoryService.editCategoryTranslation(
            id,
            title,
            description,
            categoryId,
            languageId,
            req.files
        );
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Delete category
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await categoryService.deleteCategory(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Delete category translation
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.deleteCategoryTranslation = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await categoryService.deleteCategoryTranslation(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Category Selector
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.categorySelector = async (req, res) => {
    try {
        const { page, limit, order, searchQuery, service, type } = req.query;
        const data = await categoryService.categorySelector(page, limit, order, searchQuery, service, type);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get User Chart
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.UserChart = async (req, res) => {
    const { fromDate, toDate } = req.query;

    const data = await managerService.UserChart(fromDate, toDate);
    return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/** *
 * get UserAuctionTrade Chart
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.AuctionTradesChart = async (req, res) => {
    const { fromDate, toDate, game } = req.query;

    const data = await managerService.AuctionTradesChart(fromDate, toDate, game);
    return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * get Competition Chart
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.CompetitionChart = async (req, res) => {
    const { fromDate, toDate, game } = req.query;

    const data = await managerService.CompetitionChart(fromDate, toDate, game);
    return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * get Withdraw Payment Chart
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.WithDrawAndPaymentChart = async (req, res) => {
    const { fromDate, toDate } = req.query;

    const data = await managerService.WithDrawAndPaymentChart(fromDate, toDate);
    return response({ res, statusCode: httpStatus.ACCEPTED, data });
};

/**
 * get Statistics
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getModelCounts = async (req, res) => {
    try {
        const data = await managerService.getModelCounts();
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**

 * Get Manager private notification

 * @param {*} req

 * @param {*} res

 */

exports.notification = async (req, res) => {
    try {
        const { type, page, limit, status } = req.query;

        const data = await managerService.getNotification(type, page, limit, status);

        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**

 * Change Manager notification status

 * @param {*} req

 * @param {*} res

 */

exports.notificationStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.changeNotificationStatus(id);

        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.getStatistics = async (req, res) => {
    try {
        const data = await managerService.getStatistics();
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

// Create Permission
/**
 * Insert init Permission
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.bulk = async (req, res) => {
    try {
        const data = await managerService.bulk();
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

// Role
/**
 * create Role
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.createRole = async (req, res) => {
    try {
        const { name, nickName, permissions } = req.body;

        const data = await managerService.createRole(name, nickName, permissions);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get Roles
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getRoles = async (req, res) => {
    try {
        const data = await managerService.getRoles(req.query);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.findRoleById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.findRoleById(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * delete Role
 * @param {*} req
 * @param {*} res
 */
exports.deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.deleteRole(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * update Role
 * @param {*} req
 * @param {*} res
 */
exports.updateRole = async (req, res) => {
    try {
        const data = await managerService.updateRole(req.body);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

// Manager
/**
 * Get Managers
 * @param {*} req
 * @param {*} res
 */
exports.getManagers = async (req, res) => {
    try {
        const data = await managerService.getManagers(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Add Managers
 * @param {*} req
 * @param {*} res
 */
exports.addManagers = async (req, res) => {
    try {
        const data = await managerService.addManagers(req.body, req.files);
        return response({ res, statusCode: httpStatus.CREATED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * edit Managers
 * @param {*} req
 * @param {*} res
 */
exports.editManagers = async (req, res) => {
    try {
        const data = await managerService.editManagers(req.body, req.files);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * delete Managers
 * @param {*} req
 * @param {*} res
 */
exports.deleteManagers = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.deleteManagers(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * find Managers by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.findManagerById = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.findManagerById(id);
        return response({ res, statusCode: httpStatus.ACCEPTED, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.getAllPermissions = async (req, res) => {
    try {
        const data = await managerService.getAllPermissions(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.getAffiliates = async (req, res) => {
    try {
        const data = await managerService.getAffiliates(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.getAffiliateStatistics = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.getAffiliateStatistics(id, req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.getAffiliateRewards = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await managerService.getAffiliateRewards(id, req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.transfer = async (req, res) => {
    const data = await managerService.transfer(req.body.cardTypeId, req.body.count);
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.userReferral = async (req, res) => {
    const userId = req.params.userId;

    const user = await postgres.User.findOne({
        where: {
            id: userId
        },
        paranoid: false
    });

    const referralUser = await postgres.User.findAll({
        where: {
            referredCode: user.referralCode
        },
        attributes: ["id", "name", "email", "createdAt"],
        nest: true,
        raw: true
    });

    for (let i = 0; i < referralUser.length; i++) {
        const auctions = await postgres.AuctionLog.findAll({
            where: { userId: referralUser[i].id, status: "FINISHED" },
            include: [
                {
                    model: postgres.Card,
                    required: true
                },
                {
                    model: postgres.Auction,
                    required: true
                }
            ]
        });

        referralUser[i]["cameras"] = auctions;
    }

    return res.send({
        data: referralUser
    });
};

exports.allRequest = async (req, res) => {

    let where = {};
    let where2 = {};

    if (req.query.status)
        where.status = { [postgres.Op.in]: req.query.status };

    if (req.query.eventId)
        where.eventId = req.query.eventId;

    if (req.query.email)
        where2.email = {[postgres.Op.like] : '%' + req.query.email + '%'};

    const requests = await requestService.all(where, req.query.limit , req.query.page , where2);
    return paginate({ req, res, data: requests });
};

exports.editRequest = async (req, res) => {
    const request = await requestService.edit(req.params.id, req.body);

    if (request) {
        let user = await postgres.User.findOne({ where: { id: request.userId } });
        if (user) {
            if (request.status === "APPROVED") {
                user.isKyc = true;

                sendPushToToken(user, {}, { title: "Stylike kyc", body: "Your kyc request has been approved." });
            } else if (request.status === "REJECTED") {
                user.isKyc = false;

                sendPushToToken(user, {}, { title: "Stylike kyc", body: "Your kyc request has been rejected." });
            }
            await user.save();
        }

    }


    return response({ res, data: request, message: "request updated successfully!" });
};

exports.getRequest = async (req, res) => {
    const request = await requestService.read(req.params.id);
    return response({ res, data: request });
};


