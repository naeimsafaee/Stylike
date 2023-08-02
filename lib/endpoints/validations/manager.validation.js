
const Joi = require("joi");

const login = {
    body: {
        email: Joi.string().email().required(),
        password: Joi.string()
            // .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,64}$/)
            .required()
    }
};

const checkManagerLoginCode = {
    body: {
        email: Joi.string().email().required(),
        code: Joi.number().required()
    }
};

const verify = {
    body: {
        token: Joi.string().max(500).required(),
        code: Joi.string().length(4).required()
    }
};

const forgetPassword = {
    body: {
        mobile: Joi.string().min(8).max(20),
        email: Joi.string().email()
    }
};

const resetPassword = {
    body: {
        token: Joi.string().max(500).required(),
        password: Joi.string()
            .regex(/^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,64}$/)
            .required()
    }
};

///////////////////////////////// Setting CRUD /////////////////////////////////////////////////
const addSetting = {
    body: {
        type: Joi.string(),
        key: Joi.string(),
        value: Joi.string()
    }
};

const editSetting = {
    body: {
        id: Joi.number().required(),
        type: Joi.string(),
        key: Joi.string(),
        value: Joi.string()
    }
};

const getSettings = {
    query: {
        id: Joi.number().min(1),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        type: Joi.string(),
        key: Joi.string(),
        value: Joi.string(),
        sort: Joi.string().default("id"),
        createdAt: Joi.date()
    }
};

const findSettingById = {
    params: {
        id: Joi.number().required()
    }
};

///////////////////////////////// Wallet RU /////////////////////////////////////////////////
const editWallet = {
    body: {
        id: Joi.number().required(),
        // assetId: Joi.number(),
        // userId: Joi.number(),
        amount: Joi.number(),
        // frozen: Joi.number(),
        // pending: Joi.number(),
        isLocked: Joi.boolean()
    }
};

const getWallets = {
    query: {
        id: Joi.number().min(1),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC", "asc", "desc").default("DESC"),
        assetId: Joi.number(),
        userId: Joi.number(),
        amount: Joi.number(),
        frozen: Joi.number(),
        pending: Joi.number(),
        isLocked: Joi.boolean(),
        sort: Joi.string().default("id"),
        user: Joi.string(),
        asset: Joi.string(),
        createdAt: Joi.date(),
        searchQuery: Joi.string().allow(null, "")
    }
};

const getTotalWallets = {
    query: {
        id: Joi.number().min(1),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC", "asc", "desc").default("DESC"),
        assetId: Joi.number(),
        userId: Joi.number(),
        amount: Joi.number(),
        frozen: Joi.number(),
        pending: Joi.number(),
        isLocked: Joi.boolean(),
        sort: Joi.string().default("id"),
        user: Joi.string(),
        asset: Joi.string(),
        searchQuery: Joi.string().allow(null, "")
    }
};

const findWalletById = {
    params: {
        id: Joi.number().required()
    }
};

///////////////////////////////// Category RU /////////////////////////////////////////////////

const addCategory = {
    body: {
        title: Joi.string(),
        description: Joi.string().allow(null),
        service: Joi.string().valid("STARLEX"),
        parent: Joi.number().allow(null),
        type: Joi.valid("FAQ", "ARTICLE").default("ARTICLE")
    }
};

const addCategoryTranslation = {
    body: {
        title: Joi.string(),
        description: Joi.string(),
        blogId: Joi.number(),
        languageId: Joi.number(),
        isDefault: Joi.boolean().required()
    }
};

const getCategories = {
    query: {
        id: Joi.number(),
        title: Joi.string(),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        service: Joi.string().valid("STARLEX").default("STARLEX"),
        parent: Joi.number().allow(null),
        type: Joi.valid("FAQ", "ARTICLE"),
        createdAt: Joi.date(),
        searchQuery: Joi.string().allow(null, ""),
        sort: Joi.string().default("id"),
        order: Joi.valid("DESC", "ASC").default("DESC")
    }
};

const getCategoriesTranslation = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        title: Joi.string(),
        description: Joi.string(),
        blogId: Joi.number(),
        languageId: Joi.number(),
        createdAt: Joi.date()
    }
};
const getCategory = {
    params: {
        id: Joi.number().required()
    }
};

const editCategory = {
    body: {
        id: Joi.number().required(),
        title: Joi.string(),
        description: Joi.string().allow(null),
        service: Joi.string().valid("STARLEX"),
        parent: Joi.number().allow(null),
        type: Joi.valid("FAQ", "ARTICLE").default("ARTICLE")
    }
};

const editCategoryTranslation = {
    body: {
        id: Joi.number().required(),
        title: Joi.string(),
        description: Joi.string(),
        blogId: Joi.number(),
        languageId: Joi.number()
    }
};

const deleteCategory = {
    params: {
        id: Joi.number().required()
    }
};

const categorySelector = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        type: Joi.valid("FAQ", "ARTICLE").default("ARTICLE"),
        service: Joi.string().valid("STARLEX").default("STARLEX"),
        searchQuery: Joi.string().allow(null, "")
    }
};
const getSelector = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        searchQuery: Joi.string().allow(null, "")
    }
};

const getStatistics = {
    query: {
        fromDate: Joi.date().timestamp(),
        toDate: Joi.date().timestamp()
    }
};

const getManagers = {
    query: {
        id: Joi.number(),
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        name: Joi.string(),
        mobile: Joi.string(),
        email: Joi.string(),
        status: Joi.array().items(Joi.valid("1", "2")),
        rule: Joi.array().items(Joi.valid("1", "2", "3"))
    }
};

const addManagers = {
    body: {
        name: Joi.string().allow(null).empty(),
        mobile: Joi.string().allow(null).empty(),
        email: Joi.string().allow(null).empty(),
        password: Joi.string().required(),
        status: Joi.valid("1", "2"),
        roleId: Joi.number()
    }
};

const editManagers = {
    body: {
        id: Joi.number().required(),
        name: Joi.string().allow(null).empty(),
        mobile: Joi.string().allow(null).empty(),
        email: Joi.string().allow(null).empty(),
        password: Joi.string().allow(null).empty(),
        status: Joi.valid("1", "2"),
        roleId: Joi.number()
    }
};

const findManagerById = {
    params: {
        id: Joi.number().required()
    }
};

const getAllPermissions = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        sort: Joi.string().default("createdAt"),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        name: Joi.string().allow("", null),
        nickName: Joi.string()
    }
};

const getAffiliates = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        search: Joi.string(),
        name: Joi.string(),
        email: Joi.string()
    }
};

const getAffiliateStatistics = {
    params: {
        id: Joi.number().required()
    },
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        name: Joi.string(),
        email: Joi.string()
    }
};

const getAffiliateRewards = {
    params: {
        id: Joi.number().required()
    },
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        order: Joi.valid("DESC", "ASC").default("DESC"),
        sort: Joi.string().default("id"),
        name: Joi.string(),
        email: Joi.string()
    }
};

const transferValidation = {
    body: {
        cardTypeId: Joi.number().required(),
        count: Joi.number().required().max(100)
    }
};

const userAiPlans = {
    query: {
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(10),
        userId: Joi.number(),
        email: Joi.string(),
        planName: Joi.string(),
        price: Joi.string(),
        remaining: Joi.string(),
    }
};


const aiSamples = {
    query: {
        page: Joi.number().min(1).default(1),
        limit: Joi.number().min(1).max(100).default(10),
        userId: Joi.number(),
        email: Joi.string(),
        prompt: Joi.string(),
        negativePrompt: Joi.string(),
        taskId: Joi.string()
    }
};


const allRequest = {
    query: {
        page: Joi.number().default(1).min(1),
        limit: Joi.number().default(10).min(1).max(100),
        status: Joi.array().items(Joi.valid("REQUESTED", "DOING", "PENDING", "APPROVED", "REJECTED")),
        eventId: Joi.string(),
        email: Joi.string()
    }
};

const editRequest = {
    body: {
        status: Joi.string().required().valid("REQUESTED", "DOING", "PENDING", "APPROVED", "REJECTED")
    }
};

const submitRequest = {
    body: {
        type: Joi.string().required().valid("STRING", "IMAGE", "VIDEO" , "COMPLETE"),
        field: Joi.string().required(),
        value: Joi.string()
    }
};



module.exports = {
    login,
    verify,
    forgetPassword,
    resetPassword,
    addSetting,
    editSetting,
    getSettings,
    findSettingById,
    editWallet,
    getWallets,
    getTotalWallets,
    findWalletById,
    addCategory,
    addCategoryTranslation,
    getCategories,
    getCategoriesTranslation,
    getCategory,
    editCategory,
    editCategoryTranslation,
    deleteCategory,
    categorySelector,
    getSelector,
    getStatistics,
    addManagers,
    editManagers,
    getManagers,
    findManagerById,
    getAllPermissions,
    getAffiliates,
    getAffiliateRewards,
    getAffiliateStatistics,
    checkManagerLoginCode,
    transferValidation,
    userAiPlans,
    aiSamples,
    allRequest,
    editRequest,
    submitRequest
};
