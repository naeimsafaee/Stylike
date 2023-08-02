const {
    httpResponse: { response, apiError },
    httpStatus
} = require("./../../utils");
const {
    blogService,
    categoryService,
    languageService,
    assetService,
    auctionService,
    statisticService
} = require("./../../services");
const { postgres } = require("../../databases");
const moment = require("moment");

//? Get order list
exports.getBlogs = async (req, res) => {
    try {
        const id = req?.params?.id ?? null;
        const { categoryId, sortBy, sortDirection, page, lang } = req.query;
        const data = await blogService.blogList(id, categoryId, sortBy, sortDirection, page, lang);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

exports.attributes = async (req, res) => {
    const fileName = req.params.filename;

    if (fileName.indexOf(".json")) {
        const edition = fileName.split(".")[0];

        const card = await postgres.Card.findOne({
            where: { edition: edition },
            include: [
                {
                    model: postgres.CardType,
                    required: true
                }
            ],
            paranoid: false
        });

        let attributes = card.attributes;

        if (card.deletedAt)
            return res.send({
                image: "Notfound.png",
                attributes: [
                    {
                        trait_type: "Status",
                        value: "Deactivated"
                    }
                ]
            });

       /* const userAttributes = await postgres.UserAttribute.findAll({
            where: {
                cardId: card.id,
                type: 'INITIAL'
            },
            include: [{
                model: postgres.Attribute,
                required: true
            }]
        });

        for (let i = 0; i < userAttributes.length; i++) {
            const attribute = userAttributes[i];
            attributes.push({ trait_type: attribute?.attribute?.name, value: attribute?.amount });
        }*/

        return res.send({
            name: card.name,
            description: card.description,
            image: card.ipfsImage,
            dna: card.serialNumber,
            edition: card.edition,
            category: card.cardType.name,
            date: moment(card.createdAt).unix(),
            attributes: attributes
        });
    } else {
        return res.status(404).send({});
    }
};

/**
 * Get all categories
 */
exports.getCategories = async (req, res) => {
    try {
        const { page, limit, service, parent, type, lang } = req.query;
        const data = await categoryService.getCategoriesPublic(page, limit, service, parent, type, lang);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get all categories
 */
exports.getLanguages = async (req, res) => {
    try {
        const { page, limit, order } = req.query;
        const data = await languageService.getPublic(page, limit, order);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Get one category
 */
exports.getCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { lang } = req.query;
        const data = await categoryService.getCategoryPublic(id, lang);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * Category Selector
 */
exports.categorySelector = async (req, res) => {
    try {
        // TODO images
        const { page, limit, order, searchQuery, service, type, lang } = req.query;
        const data = await categoryService.categorySelectorPublic(page, limit, order, searchQuery, service, type, lang);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get asset list
 */
exports.getAsset = async (req, res) => {
    try {
        const data = await assetService.getAsset(req.query);
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * get active notice list
 */
exports.getNotices = async (req, res) => {
    try {
        const data = await blogService.getNotices();
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * send data from socket by games
 */
exports.addSocket = async (req, res) => {
    try {
        const { roomId, eventName, data } = req.body;

        let io = req.app.get("socketIo");

        io.to(roomId).emit(eventName, data);

        return response({ res, statusCode: httpStatus.OK, data: "Successfull" });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

/**
 * check system status
 * maintenance
 */
exports.checkSystemStatus = async (req, res) => {
    const data = await statisticService.checkSystemStatus();
    return res.send({
        data: data
    });
    /*

        try {
          const data = await statisticService.checkSystemStatus();
          return response({ res, statusCode: httpStatus.OK, data });

        } catch (e) {
          return res.status(e.statusCode).json(e);
        }
      */
};

/**
 * check system status
 */
exports.checkSystemHealth = async (req, res) => {
    const data = await statisticService.checkSystemHealth(req, res);
};

exports.getAppVersion = async (req, res) => {
    try {
        const data = await statisticService.getAppVersion();
        return response({ res, statusCode: httpStatus.OK, data });
    } catch (e) {
        return res.status(e.statusCode).json(e);
    }
};

//calculator
exports.calculator = async (req, res) => {
    const data = await statisticService.calculator(req.body);
    return response({ res, statusCode: httpStatus.OK, data });
};
