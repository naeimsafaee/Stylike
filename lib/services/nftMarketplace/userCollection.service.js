const { NotFoundError, HumanError, ConflictError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const {
    Category,
    UserCollection,
    UserToken,
    UserExplore,
    UserCollectionStats,
    UserActivity,
    ManagerNotification,
    UserFollowLike,
    User,
    category,
    UserCollection_Category
} = require("../../databases/postgres");
const { isJson } = require("../../utils");
const { dateQueryBuilder } = require("../../utils/dateQueryBuilder");
const { postgres } = require("../../databases");
const { Op } = require("../../databases/postgres");


async function addUserCollection(name, description, category, links, explicitContent, files, user, fileValidationError) {
    const existCollection = await UserCollection.findOne({ where: { deletedAt: null, name } });
    if (existCollection) {
        throw (new HumanError(Errors.DUPLICATE_COLLECTION.MESSAGE, 400));
    }

    if (fileValidationError) {
        throw (
            new HumanError(Errors.FILE_NOT_SUPPORTED.MESSAGE, 400)
        );
    }
    let data = {};

    if (files) {
        for (let key in files) {
            let file = files[key].shift();

            data[key] = [
                {
                    name: file.newName,
                    key: file.key,
                    location: file.location
                }
            ];
        }
    }

    if (category) {
        if (typeof category == "object") {
            category = category.toString().split(",");
        }
        for (let i = 0; i < category.length; i++) {
            const cat = category[i];
            const thisCategory = await Category.findOne({ where: { id: cat, deletedAt: null } });
            if (!thisCategory)
                throw (new HumanError(Errors.CATEGORY_NOT_FOUND.MESSAGE, 404));
        }
    }

    if (links) {
        if (!isJson(links)) {
            throw (new HumanError(Errors.INVALID_LINK.MESSAGE, 400));
        }
    }

    const result = await UserCollection.create({
        userId: user.id,
        name,
        description,
        // category,
        links: links ? JSON.parse(links) : null,
        explicitContent,
        ...data
    }, {
        returning: true
    });

    console.log({ result });

    if (!result)
        throw (new HumanError(Errors.USER_COLLECTION_FAILED.MESSAGE, 400));

    if (category) {
        for (let i = 0; i < category.length; i++) {
            await UserCollection_Category.create({
                UserCollectionId: result.id,
                categoryId: category[i]
            });
        }
    }
    //save collection name in explorers table
    const collectionImage = result.image.length > 0 ? result.image[0].location : null;
    await UserExplore.create({
        name,
        type: "COLLECTIONS",
        typeId: result.id,
        collectionImage: collectionImage
    });

    return ({ data: result });
}

function editUserCollection(id, name, description, category, links, explicitContent, files, user, fileValidationError) {
    return new Promise(async (resolve, reject) => {
        if (fileValidationError) {
            return reject(
                new ConflictError(Errors.FILE_NOT_SUPPORTED.MESSAGE, Errors.FILE_NOT_SUPPORTED.CODE, {
                    fileValidationError
                })
            );
        }
        let update = {};
        if (files) {
            for (let key in files) {
                let file = files[key].shift();

                update[key] = [
                    {
                        name: file.newName,
                        key: file.key,
                        location: file.location
                    }
                ];
            }
        }

        const existCollection = await UserCollection.findOne({
            where: {
                name,
                id: { [postgres.Op.ne]: id },
                deletedAt: null
            }
        });
        if (existCollection) {
            return reject(
                new HumanError(Errors.DUPLICATE_COLLECTION.MESSAGE, Errors.DUPLICATE_COLLECTION.CODE, { name })
            );
        }

        if (name) update.name = name;
        if (description) update.description = description;
        if (category) update.category = category;
        if (explicitContent) update.explicitContent = explicitContent;

        if (links) {
            if (!isJson(links)) {
                return reject(new ConflictError(Errors.INVALID_LINK.MESSAGE, Errors.INVALID_LINK.CODE));
            }
            update.links = JSON.parse(links);
        }

        if (category) {
            if (typeof category == "object") {
                category = category.toString().split(",");
            }
            for (let i = 0; i < category.length; i++) {
                const cat = category[i];
                const thisCategory = await Category.findOne({ where: { id: cat, deletedAt: null } });
                if (!thisCategory)
                    return reject(new HumanError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE));
            }
            // update.category = category;
        }

        // if (category) {
        //     const thisCategory = await Category.findOne({id: category, deletedAt: null});
        //     if (!thisCategory)
        //         return reject(new NotFoundError(Errors.CATEGORY_NOT_FOUND.MESSAGE, Errors.CATEGORY_NOT_FOUND.CODE));
        //     update.category = category;
        // }

        const result = await UserCollection.update(update, { where: { id: id, user: user.id } });

        if (!result)
            return reject(
                new NotFoundError(Errors.USER_COLLECTION_NOT_FOUND.MESSAGE, Errors.USER_COLLECTION_NOT_FOUND.CODE, {
                    id
                })
            );

        //update collection name in explorers table
        let exploreUpdate = {};
        if (name) exploreUpdate.name = name;
        if (update.image) exploreUpdate.collectionImage = result.image[0].location;

        if (name || update.image)
            await UserExplore.update(exploreUpdate, { where: { type: "COLLECTIONS", typeId: result.id } });

        return resolve("Successful");
    });
}

function deleteUserCollection(id, user) {
    return new Promise(async (resolve, reject) => {
        const result = await UserCollection.destroy(
            { where: { id: id, user: user.id } }
        );

        if (!result)
            return reject(
                new NotFoundError(Errors.USER_COLLECTION_NOT_FOUND.MESSAGE, Errors.USER_COLLECTION_NOT_FOUND.CODE, {
                    id
                })
            );

        // delete collection from explorers
        await UserExplore.destroy({ where: { type: "COLLECTIONS", typeId: result.id } });

        return resolve("Successful");
    });
}

async function getUserCollection(id, user) {
    const result = await UserCollection.findOne({
            where: { id: id, deletedAt: null },
            include: { model: Category, as: "category" }
        }
    );


    const tokens = await UserToken.findOne({ where: { collectionId: result.id } });
    if (tokens)
        for (let i = 0; i < tokens.length; i++) {
            let is_liked = false;
            // if (user) {
            //     let like = await UserFollowLike.findOne({
            //         userId: user.id,
            //         likedToken: new ObjectId(tokens[i].tokenId),
            //     });
            //     if (like) is_liked = true;
            // }
            // tokens[i].is_liked = is_liked;
        }

    if (!result)
        throw (
            new NotFoundError(Errors.USER_COLLECTION_NOT_FOUND.MESSAGE, Errors.USER_COLLECTION_NOT_FOUND.CODE, {
                id
            })
        );

    return ({ result, tokens });
}

async function getUserCollections(data) {
    const { page, limit, order, createdAt, user, category, sort, searchQuery } = data;

    let query = {};
    const sortObj = {};
    if (user) query = { userId: user };
    sortObj[sort || "createdAt"] = order;
    if (category) query.category = category;
    if (createdAt) {
        query.createdAt = { [postgres.Op.gte]: createdAt };
    }

    const result = await UserCollection.findAndCountAll({
        where: { [postgres.Op.and]: [query, { deletedAt: null }] },
        order: [[sort || "createdAt", order]],
        include: [
            { model: Category, as: "category" },
            { model: User, as: "user" }
        ],
        offset: (page - 1) * limit,
        limit: limit
    });

    //todo
    const items = result.rows;
    // const output = await Promise.all(
    //     items.map(async (item) => {
    //         const thisTokens = await UserToken.findAll({
    //             where: {collectionId: item.collectionId},
    //             raw: true
    //         });
    //         return {
    //             ...item,
    //             tokens: thisTokens,
    //         };
    //     }),
    // );

    return ({
        total: result.count,
        pageSize: limit,
        page,
        data: items
    });
}

function userCollectionSelector(data) {
    return new Promise(async (resolve, reject) => {
        const { page, limit, order, description, name, searchQuery } = data;
        let sort = {};
        // let query = {"category.deletedAt": null};
        //
        // //UserCollection filter
        // if (name) {
        //     query.name = new RegExp(name, "i");
        // }
        // if (description) {
        //     query.description = new RegExp(description, "i");
        // }
        //
        // //sort
        // if (order == "DESC") {
        //     sort.createdAt = -1;
        // } else if (order == "ASC") {
        //     sort.createdAt = +1;
        // }
        //
        // // if (category_deletedAt) {
        // //     query = { "category.deletedAt": null };
        // // }
        // //searchQuery
        // if (searchQuery) {
        //     query["$or"] = [
        //         {
        //             "user.username": {
        //                 $regex: searchQuery || "",
        //                 $options: "i",
        //             },
        //         },
        //         {
        //             "user.address": {
        //                 $regex: searchQuery || "",
        //                 $options: "i",
        //             },
        //         },
        //         {
        //             "category.title": {
        //                 $regex: searchQuery || "",
        //                 $options: "i",
        //             },
        //         },
        //         {
        //             name: {
        //                 $regex: searchQuery || "",
        //                 $options: "i",
        //             },
        //         },
        //     ];
        // }
        //
        // const result = await UserCollection.aggregate([
        //     {
        //         $lookup: {
        //             from: "categories",
        //             localField: "category",
        //             foreignField: "id",
        //             as: "category",
        //         },
        //     },
        //     {
        //         $lookup: {
        //             from: "users",
        //             localField: "user",
        //             foreignField: "id",
        //             as: "user",
        //         },
        //     },
        //     {$match: query},
        //     {$sort: sort},
        //     {
        //         $facet: {
        //             metadata: [{$count: "total"}, {$addFields: {page}}],
        //             data: [{$skip: (page - 1) * limit}, {$limit: limit}],
        //         },
        //     },
        // ]).collation({locale: "en"});


        let query = { deletedAt: null };

// UserCollection filter
        if (name) {
            query.name = { [postgres.Op.iLike]: `%${name}%` };
        }
        if (description) {
            query.description = { [postgres.Op.iLike]: `%${description}%` };
        }

// searchQuery
        if (searchQuery) {
            query[postgres.Op.or] = [
                {
                    "$user.username$": {
                        [postgres.Op.iLike]: `%${searchQuery}%`
                    }
                },
                {
                    "$user.address$": {
                        [postgres.Op.iLike]: `%${searchQuery}%`
                    }
                },
                {
                    "$category.title$": {
                        [postgres.Op.iLike]: `%${searchQuery}%`
                    }
                },
                {
                    name: {
                        [postgres.Op.iLike]: `%${searchQuery}%`
                    }
                }
            ];
        }

        const result = await UserCollection.findAndCountAll({
            where: query,
            order: [["createdAt", order]],
            include: [
                {
                    model: Category,
                    as: "category"
                },
                {
                    model: User,
                    as: "user"
                }
            ],
            offset: (page - 1) * limit,
            limit: limit
        });


        const items = result[0].data;
        const metadata = result[0].metadata[0];

        const output = await Promise.all(
            items.map(async (item) => {
                const thisTokens = await UserToken.findAll({
                    where: {
                        collectionId: item.collectionId
                    },
                    raw: true
                });
                return {
                    ...item,
                    tokens: thisTokens
                };
            })
        );

        resolve({
            total: metadata?.total ?? 0,
            pageSize: limit,
            page: metadata?.page ?? page,
            data: output
        });
    });
}

function customCollection(page, limit, order, sort, searchQuery) {
    return new Promise(async (resolve, reject) => {

        const sortObj = {};
        sortObj[sort || "createdAt"] = order;
        const query = {
            deletedAt: null
        };
        if (searchQuery) {
            query[Op.or] = [
                {
                    name: {
                        [Op.iLike]: `%${searchQuery}%`
                    }
                },
                {
                    description: {
                        [Op.iLike]: `%${searchQuery}%`
                    }
                }
            ];
        }
        const count = await UserCollection.count({
            where: query
        });
        const result = await UserCollection.findAll({
            where: query,
            include: [
                {
                    model: Category,
                    where: { deletedAt: null }
                },
                {
                    model: User
                }
            ],
            attributes: { exclude: ["__v"] },
            order: [sortObj],
            offset: (page - 1) * limit,
            limit: limit,
            raw: true
        });

        for (let i = 0; i < result.length; i++) {
            const details = await UserCollectionStats.findOne({
                where: {
                    collectionId: result[i].id,
                    type: "ALL"
                }
            });
            result[i].detail = {
                volume: details ? details.volume : 0,
                floorPrice: details ? details.floorPrice : 0,
                owners: details ? details.owners : 0,
                items: details ? details.items : 0
            };
            result[i].tokens = await UserToken.findAll({
                where: {
                    collectionId: result[i].id
                },
                limit: limit,
                raw: true
            });
        }

        resolve({
            total: count ?? 0,
            pageSize: limit,
            page,
            data: result
        });
    });
}

function getUserCollectionByManager(id) {
    return new Promise(async (resolve, reject) => {
        const result = await UserCollection.findOne({
            where: { id },
            include: [
                {
                    model: UserCollection_Category,
                    where: { deletedAt: null }
                },
                {
                    model: User
                }
            ],
            raw: true
        });

        if (!result)
            return reject(
                new NotFoundError(Errors.USER_COLLECTION_NOT_FOUND.MESSAGE, Errors.USER_COLLECTION_NOT_FOUND.CODE, {
                    id
                })
            );

        return resolve(result);
    });
}

function getUserCollectionsByManager(data) {
    return new Promise(async (resolve, reject) => {
        const {
            page,
            limit,
            order,
            sort,
            searchQuery,
            isFeatured,
            isVerified,
            isExplorer,
            user_name,
            user_address,
            name,
            createdAt
        } = data;

        let query = {
            deletedAt: null
        };

        if (isFeatured) query.isFeatured = { $in: isFeatured.map((flag) => (flag === "true" ? true : false)) };
        if (isExplorer) query.isExplorer = { $in: isExplorer.map((flag) => (flag === "true" ? true : false)) };
        if (isVerified) query.isVerified = { $in: isVerified.map((flag) => (flag === "true" ? true : false)) };

        if (name) {
            query.name = new RegExp(name, "i");
        }

        if (createdAt) {
            const { start, end } = dateQueryBuilder(createdAt);
            query.createdAt = { $gte: start, $lte: end };
        }

        //user filters
        if (user_name) {
            query = { "user.username": new RegExp(user_name, "i") };
        }
        if (user_address) {
            query = { "user.address": new RegExp(user_address, "i") };
        }
        //searchQuery
        if (searchQuery) {
            query["$or"] = [
                {
                    "user.username": {
                        $regex: searchQuery || "",
                        $options: "i"
                    }
                },
                {
                    "user.address": {
                        $regex: searchQuery || "",
                        $options: "i"
                    }
                },
                {
                    name: {
                        $regex: searchQuery || "",
                        $options: "i"
                    }
                },
                {
                    type: {
                        $regex: searchQuery || "",
                        $options: "i"
                    }
                }
            ];
        }

        let sortObject = { [sort]: order === "DESC" ? -1 : 1 };
        if (sort === "user") {
            sortObject = { ["user.username"]: order === "DESC" ? -1 : 1 };
        }

        const result = await UserCollection.aggregate([
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            { $match: query },
            { $sort: sortObject },
            {
                $facet: {
                    metadata: [{ $count: "total" }, { $addFields: { page } }],
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
                }
            }
        ]).collation({ locale: "en" });

        const items = result[0].data;
        const metadata = result[0].metadata[0];

        resolve({
            total: metadata?.total ?? 0,
            pageSize: limit,
            page: metadata?.page ?? page,
            data: items
        });
    });
}

function userCollectionSelectorByManager(data) {
    return new Promise(async (resolve, reject) => {
        const { page, limit, order, sort, description, name, createdAt } = data;
        const sortObj = {};
        sortObj[sort || "createdAt"] = order;
        let query = { "category.deletedAt": null };

        if (name) {
            query.name = new RegExp(name, "i");
        }
        if (description) {
            query.description = new RegExp(description, "i");
        }

        if (category_deletedAt) {
            query = { "category.deletedAt": null };
        }

        const result = await UserCollection.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: "category",
                    foreignField: "id",
                    as: "category"
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "user",
                    foreignField: "id",
                    as: "user"
                }
            },
            { $match: query },
            { $sort: sortObject },
            {
                $facet: {
                    metadata: [{ $count: "total" }, { $addFields: { page } }],
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }]
                }
            }
        ]).collation({ locale: "en" });

        const items = result[0].data;
        const metadata = result[0].metadata[0];

        resolve({
            total: metadata?.total ?? 0,
            pageSize: limit,
            page: metadata?.page ?? page,
            data: items
        });
        // if (searchQuery) {
        //     query["$or"] = [
        //         {
        //             name: {
        //                 $regex: searchQuery || "",
        //                 $options: "i",
        //             },
        //         },
        //         {
        //             description: {
        //                 $regex: searchQuery || "",
        //                 $options: "i",
        //             },
        //         },
        //     ];
        // }
        // const count = await UserCollection.countDocuments(query);
        // const result = await UserCollection.find(query)
        //     .populate({
        //         path: "category",
        //         match: {deletedAt: null},
        //     })
        //     .populate("user")

        //     .select("-__v")
        //     .sort(sortObj)
        //     .skip((page - 1) * limit)
        //     .limit(limit)
        //     .lean(); // == raw: true

        // resolve({
        //     total: count ?? 0,
        //     pageSize: limit,
        //     page,
        //     data: result,
        // });
    });
}

function editUserCollectionByManager(id, isFeatured, isVerified, isExplorer) {
    return new Promise(async (resolve, reject) => {
        const thisCollcetion = await UserCollection.findOne({ id: new ObjectId(id), deletedAt: null });

        if (!thisCollcetion) {
            return reject(
                new NotFoundError(Errors.USER_COLLECTION_NOT_FOUND.MESSAGE, Errors.USER_COLLECTION_NOT_FOUND.CODE)
            );
        }

        thisCollcetion.isFeatured = isFeatured;
        thisCollcetion.isVerified = isVerified;
        thisCollcetion.isExplorer = isExplorer;

        await thisCollcetion.save();
        return resolve("Successful");
    });
}

/**
 * get token or collection user activity
 */
async function userActivity(data) {
    const { page, limit, sort, order, collectionId, tokenId, from, to } = data;
    const sortObj = {};
    sortObj[sort || "createdAt"] = order;
    const where = {
        deletedAt: null
    };

    if (collectionId) where.collectionId = collectionId;
    if (tokenId) where.tokenId = tokenId;
    if (from) where.from = from;
    if (to) where.to = to;

    const { count, rows: items } = await UserActivity.findAndCountAll({
        where,
        include: [
            //todo (as from)
            { model: User, as: "fromUser", attributes: ["id", "username", "address", "avatar", "name"] },
            { model: User, as: 'toUser', attributes: ['id', 'username', 'address', 'avatar' , 'name'] },
        ],
        order: [["createdAt", "DESC"]],
        offset: (page - 1) * limit,
        limit,
        raw: true
    });

    return ({
        total: count ?? 0,
        pageSize: limit,
        page,
        data: items
    });
}

module.exports = {
    addUserCollection,
    editUserCollection,
    deleteUserCollection,
    getUserCollection,
    getUserCollections,
    userCollectionSelector,
    getUserCollectionByManager,
    getUserCollectionsByManager,
    userCollectionSelectorByManager,
    customCollection,
    editUserCollectionByManager,
    userActivity
};
