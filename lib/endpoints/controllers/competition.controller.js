const {
    httpResponse: { response, apiError },
    httpStatus
} = require("../../utils");
const { competitionService } = require("../../services");
const { postgres } = require("../../databases");

/**
 * get Competition list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCompetitions = async (req, res) => {
    const data = await competitionService.getCompetitions(req.query);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get Competition list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.getCompetition(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * add Competition
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addCompetition = async (req, res) => {
    try {
        const { title, type, startAt, endAt, status } = req.body;
        const data = await competitionService.addCompetition(title, type, startAt, endAt, status);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.countCompetitionParticipant = async (req, res) => {
    const data = await competitionService.countCompetitionParticipant(req.query);
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.competitionRank = async (req, res) => {
    const data = await competitionService.competitionRank(req.query);
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.getUserCompetitionImage = async (req, res) => {
    const data = await competitionService.getUserCompetitionImage(req.query);
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.editCompetition = async (req, res) => {
    const io = req.app.get("socketIo");

    const { id, title, status } = req.body;
    const data = await competitionService.editCompetition(id, title, status, io);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * delete Competition
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.delCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.delCompetition(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get user competition by id
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getUserCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.getUserCompetition(id, req.userEntity.id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get competition prize
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getPrizeCompetition = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.getPrizeCompetition(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get Competition list
 */
exports.getCompetitionLeagues = async (req, res) => {
    const data = await competitionService.getCompetitionLeagues(req.query);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get one Competition
 */
exports.getCompetitionLeague = async (req, res) => {
    const { id } = req.params;
    const data = await competitionService.getCompetitionLeague(id);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * add Competition
 */
exports.addCompetitionLeague = async (req, res) => {
    const { competitionId, cardTypeId, entranceFee, title, assetId } = req.body;
    const data = await competitionService.addCompetitionLeague(
        competitionId,
        cardTypeId,
        entranceFee,
        title,
        req.files,
        assetId
    );
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * edit Competition
 */
exports.editCompetitionLeague = async (req, res) => {
    const data = await competitionService.editCompetitionLeague(req.body, req.files);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * delete Competition
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.delCompetitionLeague = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.delCompetitionLeague(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.listCompetition = async (req, res) => {
    const { page, limit } = req.query;
    const data = await competitionService.listCompetition(page, limit);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * Details user competition
 * @param {*} req
 * @param {*} res
 */
exports.detailsCompetition = async (req, res) => {
    const data = await competitionService.detailsCompetition(
        req.params.id,
        req.params.cardTypeId,
        req.userEntity.id,
        req.params.assign_card_id
    );
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.addUserCompetition = async (req, res) => {
    const io = req.app.get("socketIo");

    const data = await competitionService.addUserCompetition(
        req.files,
        req.userEntity.id,
        req.body.id,
        req.body.assign_card_id,
        req.body.taskId,
        req.body.lenses,
        io
    );
    return response({ res, statusCode: httpStatus.CREATED, data });
};

exports.editUserCompetition = async (req, res) => {
    const data = await competitionService.editUserCompetition(
        req.files,
        req.userEntity.id,
        req.body.id,
        req.body.taskId,
        req.body.assign_card_id
    );

    return response({ res, statusCode: httpStatus.CREATED, data });
};

exports.getLeaderBoards = async (req, res) => {
    const { competitionId, cardTypeId, page, limit } = req.query;
    const data = await competitionService.getLeaderBoards(competitionId, cardTypeId, page, limit);
    return response({ res, statusCode: httpStatus.OK, data });
};

exports.getLeaderBoardsByManager = async (req, res) => {
    const data = await competitionService.getLeaderBoardsByManager(req.query);
    return response({ res, statusCode: httpStatus.OK, data });
};

/**
 * get user crypto competition results
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getResults = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.getResults(id, req.userEntity.id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get ranking details
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getRankingDetails = async (req, res) => {
    try {
        const { id, userId } = req.query;
        const data = await competitionService.getRankingDetails(id, userId);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get pictures count
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.picturesCount = async (req, res) => {
    try {
        const { id } = req.userEntity;
        const data = await competitionService.picturesCount(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

// Competition Task
/**
 * get Competition Task list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCompetitionTasks = async (req, res) => {
    try {
        const data = await competitionService.getCompetitionTasks(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get Competition list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCompetitionTask = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.getCompetitionTask(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get Competition Task list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCompetitionTasksByManager = async (req, res) => {
    try {
        const data = await competitionService.getCompetitionTasksByManager(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get Competition list
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.getCompetitionTaskByManager = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.getCompetitionTaskByManager(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * add Competition
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.addCompetitionTask = async (req, res) => {
    try {
        const { title, description, competitionLeagueId } = req.body;
        const data = await competitionService.addCompetitionTask(title, description, competitionLeagueId, req.files);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * edit Competition task
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.editCompetitionTask = async (req, res) => {
    try {
        // const io = req.app.get("socketIo");

        const { id, title, description, competitionLeagueId } = req.body;
        const data = await competitionService.editCompetitionTask(
            id,
            title,
            description,
            competitionLeagueId,
            req.files
        );
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * delete Competition task
 * @param {*} req
 * @param {*} res
 * @returns
 */
exports.delCompetitionTask = async (req, res) => {
    try {
        const { id } = req.params;
        const data = await competitionService.delCompetitionTask(id);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.roleBackCompetitionPrize = async (req, res) => {

    const Competition = await postgres.Competition.findOne({
        where: { id: req.body.competitionId }
    });
    if (!Competition)
        return res.status(404).send("not found!");

    let transaction = await postgres.sequelize.transaction();

    const prizes = await postgres.UserPrize.findAll({
        where: {
            competitionId: Competition.id
        } , transaction
    });

    try {
        for (let i = 0; i < prizes.length; i++) {
            const user = await postgres.User.findOne({ where: { id: prizes[i].userId }, transaction });

            if (!user)
                continue;

            const userWallet = await postgres.UserWallet.findOne({
                where: {
                    userId: user.id,
                    assetId: prizes[i].assetId
                }, transaction
            });
            if (userWallet) {
                if (userWallet.amount - prizes[i].amount >= 0)
                    await userWallet.decrement("amount", { by: prizes[i].amount, transaction });
                else
                    await userWallet.update({
                        amount: 0
                    }, { transaction });
            }
        }

        const agentPrizes = await postgres.AgentReward.findAll({
            where: {
                competitionId: Competition.id
            }, transaction
        });

        for (let i = 0; i < agentPrizes.length; i++) {

            const user = await postgres.User.findOne({ where: { id: agentPrizes[i].agentId }, transaction });

            if (!user)
                continue;

            const userWallet = await postgres.UserWallet.findOne({
                where: {
                    userId: user.id,
                    assetId: 6
                }, transaction
            });
            if (userWallet) {
                if (userWallet.amount - agentPrizes[i].commission >= 0)
                    await userWallet.decrement("amount", { by: agentPrizes[i].commission, transaction });
                else
                    await userWallet.update({
                        amount: 0
                    }, { transaction });
            }

        }

        await transaction.commit();
    } catch (e) {
        await transaction.rollback();
        return res.status(404).send("error!");
    }

    return res.send("ok");
};
