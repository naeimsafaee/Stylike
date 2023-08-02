const {NotFoundError, HumanError, NotAuthorizedError} = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const {
    UserAuctions,
    UserAssignedToken,
    User,
    UserAuctionOffer,
    Setting,
    UserActivity,
    UserToken,
    DiamondTrade,
    UserCollection,
    UserCategory,
    Category
} = require("../../databases/postgres");
const statsService = require("./stats.service");
const {postgres} = require("../../databases");
const {where} = require("sequelize");

/**
 * add user auction
 */
async function addAuction(
    {assignTokenId, start, end, basePrice, immediatePrice, bookingPrice, signature, reserveAddress, serial},
    user,
) {
    const thisUserAssignedToken = await UserAssignedToken.findOne({
        where: {
            id: assignTokenId,
            userId: user.id,
            status: {[postgres.Op.in]: ['FREE', 'NOT_MINTED', 'IN_AUCTION']},
        },
        include: {model: UserToken},
    });

    if (!thisUserAssignedToken) {
        throw (
            new NotFoundError(
                Errors.USER_ASSIGNED_TOKEN_NOT_FOUND.MESSAGE,
                404,
            )
        );
    }


    if (signature) signature = JSON.parse(signature);

    const result = await UserAuctions.create({
        assignTokenId,
        start,
        end,
        basePrice,
        immediatePrice,
        bookingPrice,
        userId: user.id,
        signature,
        reserveAddress,
        status:"ACTIVE"
    });

    if (!result) throw (new HumanError(Errors.AUCTION_ADD_FAILED.MESSAGE, Errors.AUCTION_ADD_FAILED.CODE));

    thisUserAssignedToken.status = "IN_AUCTION";
    await thisUserAssignedToken.save();

    if (immediatePrice)
        calculateFloorPricw(thisUserAssignedToken?.collectionId, immediatePrice);

    // save user activity
    await UserActivity.create({
        from: user.id,
        to: user.id,
        tokenId: thisUserAssignedToken.tokenId,
        collectionId: thisUserAssignedToken.collectionId,
        price: immediatePrice ? immediatePrice : 0,
        type: "LIST",
    });


    return ("Successful");
}

/**
 * calaculate fllor price and save it in collection stats
 * @param {*} collectionId
 * @param {*} price
 * @returns
 */
function calculateFloorPricw(collectionId, price) {
    return new Promise(async (resolve, reject) => {
        const floorPrice = await UserAuctions.findOne({
            where: {
                status: 'ACTIVE',
                end: {
                    [postgres.Op.gte]: new Date()
                },
                [postgres.Op.and]: [
                    {immediatePrice: {[postgres.Op.not]: null}},
                    {immediatePrice: {[postgres.Op.lt]: price}}
                ]
            }
        });

        if (!floorPrice) statsService.updateCollectionStats(collectionId, null, price);

        return resolve();
    });
}

/**
 * get auction signature
 * @param {*} id
 * @returns
 */
function getAuction(id) {
    return new Promise(async (resolve, reject) => {
        const result = await UserAuctions.findOne({
            where: {
                id: id,
                status: 'ACTIVE',
                basePrice: null,
                end: {[postgres.Op.gt]: new Date()},
                // start: { [postgres.Op.lte]: new Date() },
            },
            attributes: ['signature'],
        });

        if (!result || Date.now() > result?.end)
            return reject(
                new NotFoundError(Errors.USER_AUCTION_NOT_FOUND.MESSAGE, Errors.USER_AUCTION_NOT_FOUND.CODE, {id}),
            );

        return resolve(result?.signature);
    });
}

/**
 * delete user auction and signature
 * @param {*} id
 * @param {*} user
 * @returns
 */
function deleteAuction(id, user) {
    return new Promise(async (resolve, reject) => {
        const result = await UserAuctions.update({
                where: {
                    id: id,
                    userId: user?.id,
                    status: "ACTIVE",
                    immediatePrice: null,
                },
            },
            {deletedAt: new Date(), signature: null},
        );

        if (!result)
            return reject(
                new NotFoundError(Errors.USER_AUCTION_NOT_FOUND.MESSAGE, Errors.USER_AUCTION_NOT_FOUND.CODE, {id}),
            );

        if (result.assignTokenId.tokenId.isLazyMint == true) {
            await UserAssignedToken.update(
                {status: "NOT_MINTED"},
                {
                    where: {
                        userId: user?.id,
                        id: result.assignTokenId,
                    },
                    returning: true,
                }
            );
        } else {
            await UserAssignedToken.update(
                {status: "FREE"},
                {
                    where: {
                        userId: user?.id,
                        id: result.assignTokenId,
                    },
                    returning: true,
                }
            );
        }

        return resolve("Successful");
    });
}

async function getOneAuction(id) {
    const currentDate = new Date();

    const query = {
        end: {$gt: currentDate},
        id: id,
        deletedAt: null,
    };

    const result = await UserAuctions.findOne({
        where: query,
        include: [
            {
                model: User,
            },
            {
                model: UserAssignedToken,
                as: "assignTokenId",
                include: [
                    {
                        model: User,
                    },
                    {
                        model: UserToken,
                    },
                    {
                        model: UserCollection,
                        include: {
                            model: Category,
                            where: {deletedAt: null},
                        },
                    },
                ],
            },
        ],
        raw: true,
    });
    const bids = await UserAuctionOffer.findAll({
        where: {auctionId: id, deletedAt: null},
        include: {
            model: User,
            attributes: ["username", "email", "description", "image"],
        },
        raw: true,
    });
    if (!result)
        throw (
            new HumanError(Errors.USER_AUCTION_NOT_FOUND.MESSAGE, 400)
        );

    return ({...result, bids});
}

function getAllAuction(data) {
    return new Promise(async (resolve, reject) => {
        const {
            page,
            limit,
            order,
            sort,
            userId,
            assignTokenId,
            start,
            end,
            basePrice,
            immediatePrice,
            bookingPrice,
            status,
            createdAt,
        } = data;

        const sortObj = {};
        sortObj[sort || "createdAt"] = order;

        const currentDate = new Date();

        const query = {
            deletedAt: null,
            // start: {$lt: currentDate},
            end: {$gt: currentDate},
        };
        if (userId) query.userId = userId;
        if (assignTokenId) query.collectionId = collectionId;

        if (status) {
            if (!isJson(status)) {
                return reject(
                    new HumanError(Errors.INVALID_AUCTION_STATUS.MESSAGE, Errors.INVALID_AUCTION_STATUS.CODE),
                );
            }
            query.status = {$in: JSON.parse(status)};
        }
        if (basePrice) query.basePrice = {$gte: Number(basePrice)};
        if (immediatePrice) query.immediatePrice = {$gte: Number(immediatePrice)};
        if (bookingPrice) query.bookingPrice = {$gte: Number(bookingPrice)};
        if (createdAt) {
            query.createdAt = {$gte: createdAt};
        }
        const count = await UserAuctions.count(query);
        const items = await UserAuctions.findAll({
            where: query,
            include: [
                {
                    model: User,
                },
                {
                    model: UserAssignedToken,
                    include: [
                        {
                            model: User,
                            attributes: {exclude: ['password']},
                        },
                        {
                            model: UserToken,
                        },
                        {
                            model: UserCollection,
                            as: 'collectionId',
                            include: [
                                {
                                    model: Category,
                                    as : 'category' ,
                                    where: {deletedAt: null}
                                }
                            ]
                        }
                    ]
                }
            ],
            order: sortObj,
            offset: (page - 1) * limit,
            limit: limit,
            raw: true
        });


        resolve({
            total: count ?? 0,
            pageSize: limit,
            page,
            data: items,
        });
    });
}

function auctionSelector(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, order, sort, searchQuery} = data;
        const sortObj = {};
        sortObj[sort || "createdAt"] = order;

        const currentDate = new Date();

        const query = {
            deletedAt: null,
            end: {[postgres.Op.gt]: currentDate}
        };

        if (searchQuery) {
            query[postgres.Op.or] = [{
                '$userId.username$': {
                    [postgres.Op.iLike]: `%${searchQuery}%`
                }
            },
                {
                    '$assignTokenId.tokenId.name$': {
                        [postgres.Op.iLike]: `%${searchQuery}%`
                    }
                },
                {
                    '$assignTokenId.collectionId.name$': {
                        [postgres.Op.iLike]: `%${searchQuery}%`
                    }
                }
            ];
        }


        const count = await UserAuctions.count(query);
        const result = await UserAuctions.findAll({
            where: query,
            include: [
                {
                    model: User,
                    attributes: {exclude: ['__v']}
                },
                {
                    model: UserAssignedToken,
                    attributes: {exclude: ['__v']},
                    include: [
                        {
                            model: User,
                            attributes: {exclude: ['__v']}
                        },
                        {
                            model: UserToken,
                            attributes: {exclude: ['__v']}
                        },
                        {
                            model: UserCollection,
                            attributes: {exclude: ['__v']},
                            include: [
                                {
                                    model: UserCategory,
                                    where: {deletedAt: null}
                                }
                            ]
                        }
                    ]
                }
            ],
            attributes: {exclude: ['__v']},
            order: sortObj,
            offset: (page - 1) * limit,
            limit: limit,
            raw: true
        });


        resolve({
            total: count ?? 0,
            pageSize: limit,
            page,
            data: result,
        });
    });
}

async function getOneAuctionByManager(id) {
    return new Promise(async (resolve, reject) => {
        const result = await UserAuctions.findOne({
            where: {id},
            include: [
                {
                    model: User,
                },
                {
                    model: UserAssignedToken,
                    include: [
                        {
                            model: User,

                        },
                        {
                            model: UserToken,
                        },
                        {
                            model: UserCollection,
                            include: [
                                {
                                    model: UserCategory,
                                    where: {deletedAt: null}
                                }
                            ]
                        }
                    ]
                }
            ],
            raw: true
        });


        if (!result)
            return reject(
                new NotFoundError(Errors.USER_AUCTION_NOT_FOUND.MESSAGE, Errors.USER_AUCTION_NOT_FOUND.CODE, {id}),
            );

        return resolve(result);
    });
}

function getAllAuctionByManager(data) {
    return new Promise(async (resolve, reject) => {
        const {
            page,
            limit,
            order,
            sort,
            user,
            token,
            collection,
            basePrice,
            immediatePrice,
            bookingPrice,
            status,
            start,
            end,
            searchQuery,
        } = data;

        const query = {
            deletedAt: null,
        };

        // Auction
        if (status) {
            query.status = {[postgres.Op.in]: status};
        }
        if (start) {
            const startDate = new Date(start);
            query.start = {[postgres.Op.gt]: startDate};
        }
        if (end) {
            const endDate = new Date(end);
            query.end = {[postgres.Op.lt]: endDate};
        }

        if (basePrice) query.basePrice = {[postgres.Op.gte]: parseFloat(basePrice)};
        if (immediatePrice) query.immediatePrice = {[postgres.Op.gte]: parseFloat(immediatePrice)};
        if (bookingPrice) query.bookingPrice = {[postgres.Op.gte]: parseFloat(bookingPrice)};

        if (searchQuery) {
            query[postgres.Op.or] = [{'$Token.name$': {[postgres.Op.iLike]: `%${searchQuery}%`}},
                {'$Collection.name$': {[postgres.Op.iLike]: `%${searchQuery}%`}},
                {'$User.username$': {[postgres.Op.iLike]: `%${searchQuery}%`}},
                {'$User.address$': {[postgres.Op.iLike]: `%${searchQuery}%`}},
            ];
        }


        // Token
        if (token) {
            query['$and'] = {
                'tokenId.name': {
                    [postgres.Op.iLike]: `%${token}%`,
                },
            };
        }

// User
        if (user) {
            query['$or'] = [
                {
                    '$userId.address$': {
                        [postgres.Op.iLike]: `%${user}%`,
                    },
                },
                {
                    '$userId.username$': {
                        [postgres.Op.iLike]: `%${user}%`,
                    },
                },
            ];
        }

// Collection
        if (collection) {
            query['$and'] = {
                'collectionId.name': {
                    [postgres.Op.iLike]: `%${collection}%`,
                },
            };
        }

        let sortObject = [[sort, order === 'DESC' ? 'DESC' : 'ASC']];

        if (sort === 'token') {
            sortObject = [['tokenId.name', order === 'DESC' ? 'DESC' : 'ASC']];
        }

        if (sort === 'user') {
            sortObject = [['userId.username', order === 'DESC' ? 'DESC' : 'ASC']];
        }

        if (sort === 'collection') {
            sortObject = [['collection.name', order === 'DESC' ? 'DESC' : 'ASC']];
        }

        if (sort === 'basePrice') {
            sortObject = [['basePrice', order === 'DESC' ? 'DESC' : 'ASC']];
        }

        if (sort === 'immediatePrice') {
            sortObject = [['immediatePrice', order === 'DESC' ? 'DESC' : 'ASC']];
        }

        if (sort === 'bookingPrice') {
            sortObject = [['bookingPrice', order === 'DESC' ? 'DESC' : 'ASC']];
        }
        const result = await UserAuctions.findAndCountAll({
            include: [
                {
                    model: User,
                    as: 'userId',
                    attributes: ['username']
                },
                {
                    model: UserAssignedToken,
                    as: 'assignTokenId',
                    include: [
                        {
                            model: UserToken,
                            as: 'tokenId',
                            include: [
                                {
                                    model: UserCollection,
                                    as: 'collectionId'
                                }
                            ]
                        }
                    ]
                }
            ],
            where: query,
            attributes: {
                exclude: ['basePrice', 'immediatePrice', 'bookingPrice']
            },
            order: sortObject,
            limit: limit,
            offset: (page - 1) * limit
        })

        const items = result[0].data;
        const metadata = result[0].metadata[0];

        // userId is The user that made the auction
        const mappedData = items.map(({assignTokenId, tokenId, userId, collectionId, ...rest}) => {
            return {
                ...rest,
                userId,
                assignTokenId: {
                    ...assignTokenId,
                    tokenId,
                    collectionId,
                },
            };
        });

        resolve({
            total: metadata?.total ?? 0,
            pageSize: limit,
            page: metadata?.page ?? page,
            data: mappedData,
        });
    });
}

function auctionSelectorByManager(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, order, sort, searchQuery, currentDate} = data;

        const query = {
            deletedAt: null,
            end: {
                [postgres.Op.gt]: new Date(),
            },
        };
        if (searchQuery) {
            query[postgres.Op.or] = [
                {
                    "$userId.username$": {
                        [postgres.Op.iLike]: `%${searchQuery}%`,
                    },
                },
                {
                    "$assignTokenId.tokenId.name$": {
                        [postgres.Op.iLike]: `%${searchQuery}%`,
                    },
                },
                {
                    "$assignTokenId.collectionId.name$": {
                        [postgres.Op.iLike]: `%${searchQuery}%`,
                    },
                },
            ];
        }

        const result = await UserAuctions.findAndCountAll({
            include: [
                {
                    model: User,
                    as: 'userId',
                    attributes: {exclude: ['__v']}
                },
                {
                    model: UserAssignedToken,
                    as: 'assignTokenId',
                    include: [
                        {
                            model: UserToken,
                            as: 'tokenId',
                            include: [
                                {
                                    model: UserCollection,
                                    as: 'collectionId',
                                    include: {
                                        model: UserCategory,
                                        as: 'category',
                                        attributes: [],
                                        where: {
                                            deletedAt: null
                                        }
                                    }
                                }
                            ]
                        },
                        {
                            model: User,
                            as: 'userId',
                        }
                    ]
                }
            ],
            where: query,
            order: sortObj,
            limit: limit,
            offset: (page - 1) * limit,
            raw: true
        });

        resolve({
            total: result.count ?? 0,
            pageSize: limit,
            page,
            data: result.rows,
        });
    });
}

/**
 * get auction settings
 * @param {*} data
 * @returns
 */
function getSettings(data) {
    return new Promise(async (resolve, reject) => {
        // declear auction fee for system
        let amount = 0,
            address = null;

        const settings = await Setting.findAll({
            where: {
                key: {
                    [postgres.Op.in]: ["AUCTION_FEE_AMOUNT", "AUCTION_FEE_ADDRESS"]
                }
            }
        });
        for (const setting of settings) {
            if (key === "AUCTION_FEE_AMOUNT") amount = setting.value;

            if (key === "AUCTION_FEE_ADDRESS") address = setting.value;
        }

        return resolve({amount, address});
    });
}


module.exports = {
    getSettings,
    addAuction,
    getAuction,
    deleteAuction,
    getOneAuction,
    getAllAuction,
    auctionSelector,
    getOneAuctionByManager,
    getAllAuctionByManager,
    auctionSelectorByManager,
};
