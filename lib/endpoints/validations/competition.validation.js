
const Joi = require("joi").extend(require('@joi/date'));

const getCompetitions = {
    query: {
        status: Joi.array().items(Joi.valid("OPEN", "LIVE", "COMPLETED", "INACTIVE")),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        type: Joi.string(),
        title: Joi.string(),
        id: Joi.number(),
        createdAt: Joi.date(),
        startAt: Joi.date(),
        endAt: Joi.date(),
        searchQuery: Joi.string().allow(null, "")
    }
};

const getCompetition = {
    params: {
        id: Joi.number().min(1)
    }
};

const addCompetition = {
    body: {
        title: Joi.string().required(),
        startAt: Joi.date().required(),
        endAt: Joi.date().required(),
        status: Joi.valid("OPEN", "LIVE", "COMPLETED", "INACTIVE").default("INACTIVE"),
        type: Joi.valid("CHALLENGE").default("CHALLENGE")
    }
};

const editCompetition = {
    body: {
        id: Joi.number().required(),
        title: Joi.string(),
        status: Joi.valid("OPEN", "COMPLETED", "INACTIVE")
    }
};

const delCompetition = {
    params: {
        id: Joi.number().required()
    }
};

const getCompetitionLeagues = {
    query: {
        competitionId: Joi.number(),
        cardTypeId: Joi.array(),
        prizeId: Joi.number(),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        id: Joi.number(),
        createdAt: Joi.date().format('YYYY-MM-DD'),
        searchQuery: Joi.string().allow(null, ""),
        entranceFee: Joi.number(),
        assetId: Joi.number(),
        title: Joi.string(),
        asset: Joi.string(),
    }
};

const countCompetitionParticipant = {
    query: {
        competitionId: Joi.number(),
    }
};


const competitionRank = {
    query: {
        competitionId: Joi.number().required(),
        cardTypeId: Joi.number().required(),
        userName: Joi.string(),
    }
};

const getCompetitionLeague = {
    params: {
        id: Joi.number().min(1)
    }
};

const addCompetitionLeague = {
    body: {
        competitionId: Joi.number().required(),
        cardTypeId: Joi.number().required(),
        entranceFee: Joi.number(),
        assetId: Joi.number(),
        title: Joi.string().required()
    }
};

const editCompetitionLeague = {
    body: {
        id: Joi.number().required(),
        competitionId: Joi.number(),
        cardTypeId: Joi.number(),
        prizeId: Joi.number(),
        entranceFee: Joi.number(),
        assetId: Joi.number(),
        title: Joi.string()
    }
};

const delCompetitionLeague = {
    params: {
        id: Joi.number().required()
    }
};

const getUserCompetition = {
    params: {
        id: Joi.number().required()
    }
};

const getUserCompetitionList = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC")
    }
};

const joinCompetition = {
    body: {
        id: Joi.number().required(),
        cards: Joi.array()
            .items({
                assignedCardId: Joi.number().required(),
                position: Joi.valid("Goalkeepers", "Defenders", "Midfielders", "Forwards", "Extra").required(),
                isCapitan: Joi.boolean().required()
            })
            .required()
    }
};

const getUserLeaderBoards = {
    query: {
        competitionId: Joi.number().min(1).required(),
        cardTypeId: Joi.number().min(1),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
    }
};

const getUserCompetitionImage = {
    query: {
        competitionId: Joi.number().min(1).required(),
        cardId: Joi.number().required(),
        userId: Joi.number().required(),
    }
};

const getUserLeaderBoardsByManager = {
    query: {
        competitionLeagueId: Joi.array(),
        competitionId: Joi.array(),
        userId: Joi.array(),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        searchQuery: Joi.string().allow(null, ""),
        userName: Joi.string(),
        leagueName: Joi.string(),
        competitionName: Joi.string(),
        score: Joi.number(),
        status: Joi.array(),
        createdAt: Joi.date(),
    }
};

const getUserRankingDetails = {
    query: {
        id: Joi.number().min(1).required(),
        userId: Joi.number().min(1).required()
    }
};

const listCompetition = {
    query: {
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(10)
    }
};

const addUserCompetition = {
    body: {
        id: Joi.number().required(),
        assign_card_id: Joi.number().required(),
        taskId: Joi.number().required(),
        lenses: Joi.array().min(0).max(4)
    }
};

const editUserCompetition = {
    body: {
        id: Joi.number().required(),
        taskId: Joi.number().required(),
        assign_card_id: Joi.number().required(),
    }
};

const getLeaderBoards = {
    query: {
        id: Joi.number().min(1).required(),
        leagueId: Joi.number().min(1),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
    }
};

const getCompetitionById = {
    params: {
        id: Joi.number().required()
    }
};

const getRankingDetails = {
    query: {
        id: Joi.number().min(1).required(),
        userId: Joi.number().min(1).required()
    }
};

const detailsCompetition = {
    params: {
        id: Joi.number().required(),
        cardTypeId: Joi.number().required(),
        assign_card_id: Joi.number().required(),
    }
};

const getAssetData = {
    query: {
        searchQuery: Joi.string().allow(null, ""),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
    }
};

// Competition Task
const getCompetitionTasks = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        id: Joi.number(),
        competitionLeagueId: Joi.number(),
        title: Joi.string(),
        description: Joi.string(),
        createdAt: Joi.date(),
        searchQuery: Joi.string().allow(null, "")
    }
};

const getCompetitionTask = {
    params: {
        id: Joi.number().min(1)
    }
};

const getCompetitionTasksByManager = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        id: Joi.number(),
        competitionLeagueId: Joi.number(),
        title: Joi.string(),
        description: Joi.string(),
        createdAt: Joi.date(),
        searchQuery: Joi.string().allow(null, "")
    }
};

const getCompetitionTaskByManager = {
    params: {
        id: Joi.number().min(1)
    }
};

const addCompetitionTask = {
    body: {
        competitionLeagueId: Joi.number().required(),
        title: Joi.string().required(),
        description: Joi.string()
    }
};

const editCompetitionTask = {
    body: {
        id: Joi.number().required(),
        competitionLeagueId: Joi.number(),
        title: Joi.string(),
        description: Joi.string()
    }
};

const delCompetitionTask = {
    params: {
        id: Joi.number().required()
    }
};

module.exports = {
    getCompetitions,
    getCompetition,
    addCompetition,
    editCompetition,
    delCompetition,
    getCompetitionLeagues,
    getCompetitionLeague,
    addCompetitionLeague,
    editCompetitionLeague,
    delCompetitionLeague,
    getUserCompetition,
    getUserCompetitionList,
    joinCompetition,
    getLeaderBoards,
    getRankingDetails,

    listCompetition,
    addUserCompetition,
    editUserCompetition,
    getUserLeaderBoards,
    getCompetitionById,
    getUserRankingDetails,
    detailsCompetition,
    getAssetData,

    addCompetitionTask,
    editCompetitionTask,
    delCompetitionTask,
    getCompetitionTask,
    getCompetitionTasks,
    getCompetitionTaskByManager,
    getCompetitionTasksByManager,
    getUserLeaderBoardsByManager,
    countCompetitionParticipant,
    competitionRank,
    getUserCompetitionImage
};
