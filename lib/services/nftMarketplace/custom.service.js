const {NotFoundError, HumanError, ConflictError} = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const {
    Category,
    UserToken,
    User,
    UserCollection,
    UserAuctions,
    UserAssignedToken,
    UserAuctionsOffer,
    UserExplore,
    UserCollectionStats,
    Blog,
    UserFollowLike,
    DiamondType,
    Prize
} = require("../../databases/postgres");
const {isJson} = require("../../utils");
const extractProperties = require("../../utils/extractProperties");
// const ObjectId = require("mongoose").Types.ObjectId;

const socketService = require("./socket.service");
const {postgres} = require("../../databases");

function generalSearch(page, limit, order, sort, searchQuery) {
    return new Promise(async (resolve, reject) => {
        const sortObj = {};
        sortObj[sort || "createdAt"] = order;
        const query = {
            deletedAt: null,
            $or: [
                {
                    name: {
                        $regex: searchQuery || "",
                        $options: "i"
                    }
                },
                {
                    address: {
                        $regex: searchQuery || "",
                        $options: "i"
                    }
                }
            ]
        };

        const users = await UserExplore.find({type: "USERS", ...query})
            .select("-__v")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const tokens = await UserExplore.find({type: "TOKENS", ...query})
            .select("-__v")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const collections = await UserExplore.find({type: "COLLECTIONS", ...query})
            .select("-__v")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // const mapped = {
        // 	users: [],
        // 	tokens: [],
        // 	collections: [],
        // };

        // for (let i = 0; i < result.length; i++) {
        // 	if (result[i].type == "COLLECTIONS") {
        // 		result[i].itemsCount = await UserAssignedToken.countDocuments({
        // 			collectionId: result[i].typeId,
        // 			status: { $in: ["FREE", "IN_AUCTION"] },
        // 		});
        // 		mapped.collections.push(result[i]);
        // 	}
        // 	if (result[i].type == "TOKENS") {
        // 		mapped.tokens.push(result[i]);
        // 	}
        // 	if (result[i].type == "USERS") {
        // 		mapped.users.push(result[i]);
        // 	}
        // }

        for (let i = 0; i < collections.length; i++) {
            collections[i].nftsCount = await UserAssignedToken.countDocuments({
                status: {$in: ["FREE", "IN_AUCTION"]},
                deletedAt: null,
                collectionId: collections[i].typeId
            });
        }

        resolve({users, tokens, collections});
        // const tokenQuery = {}
        // tokenQuery["$or"] = [
        // 	{
        // 		name: {
        // 			$regex: searchQuery || "",
        // 			$options: "i",
        // 		},
        // 	},
        // 	{
        // 		description: {
        // 			$regex: searchQuery || "",
        // 			$options: "i",
        // 		},
        // 	},
        // ];

        // const userQuery = {};
        // userQuery["$or"] = [
        // 	{
        // 		username: {
        // 			$regex: searchQuery || "",
        // 			$options: "i",
        // 		},
        // 	},
        // 	{
        // 		email: {
        // 			$regex: searchQuery || "",
        // 			$options: "i",
        // 		},
        // 	},
        // ];

        // const collectionQuery = {};
        // collectionQuery["$or"] = [
        // 	{
        // 		name: {
        // 			$regex: searchQuery || "",
        // 			$options: "i",
        // 		},
        // 	},
        // 	{
        // 		description: {
        // 			$regex: searchQuery || "",
        // 			$options: "i",
        // 		},
        // 	},
        // ];
        // const tokenCount = await UserToken.countDocuments(tokenQuery);
        // const tokenResult = await UserToken.find(tokenQuery)
        // 	.select("-__v")
        // 	.sort(sortObj)
        // 	.skip((page - 1) * limit)
        // 	.limit(limit)
        // 	.lean();

        // const userCount = await User.countDocuments(userQuery);
        // const userResult = await User.find(userQuery)
        // 	.select("-__v")
        // 	.sort(sortObj)
        // 	.skip((page - 1) * limit)
        // 	.limit(limit)
        // 	.lean();

        // const collectionCount = await UserCollection.countDocuments(collectionQuery);
        // const collectionResult = await UserCollection.find(collectionQuery)
        // 	.select("-__v")
        // 	.sort(sortObj)
        // 	.skip((page - 1) * limit)
        // 	.limit(limit)
        // 	.lean();

        // resolve({
        // 	user: {
        // 		total: userCount ?? 0,
        // 		pageSize: limit,
        // 		page,
        // 		data: userResult,
        // 	},
        // 	token: {
        // 		total: tokenCount ?? 0,
        // 		pageSize: limit,
        // 		page,
        // 		data: tokenResult,
        // 	},
        // 	collection: {
        // 		total: collectionCount ?? 0,
        // 		pageSize: limit,
        // 		page,
        // 		data: collectionResult,
        // 	},
        // });
    });
}

function searchUsername(username, userEntity) {
    return new Promise(async (resolve, reject) => {
        const user = await User.findOne({username});
        if (userEntity && user.id != userEntity.id) {
            return reject(
                new ConflictError(Errors.DUPLICATE_USER_USERNAME.MESSAGE, Errors.DUPLICATE_USER_USERNAME.CODE)
            );
        }
        if (!userEntity && user) {
            return reject(
                new ConflictError(Errors.DUPLICATE_USER_USERNAME.MESSAGE, Errors.DUPLICATE_USER_USERNAME.CODE)
            );
        }
        return resolve("Success");
    });
}

async function explore(page, limit, order, sort, category, user, collection) {
    let sortObj = [["createdAt", "DESC"]];

    const query = {
        deletedAt: null,
        isExplorer: true
    };
    const categoryQuery = {};

    if (category) {
        categoryQuery.id = category;
    }

    if (user) {
        query.user = user;
    }

    if (collection) {
        query.id = collection;
    }

    const count = await UserCollection.count({
        where: query
    });

    const result = await UserCollection.findAndCountAll({
        where: query,
        include: [
            {
                model: User,
                as: "user",
                attributes: ["id", "username", "avatar"]
            },
            {
                model: Category,
                as: "category",
                where: categoryQuery,
                required: true,
                attributes: ["id", "title", "description", "icon"]
            }
        ],
        order: sortObj,
        offset: (page - 1) * limit,
        limit: limit
    });

    return ({
        total: count ?? 0,
        pageSize: limit,
        page,
        data: result.rows
    });
}

async function customExplorer(data, userId, ip) {
    const {page, limit, order, sort, user, collections, status, properties, chain, min, max, search} = data;
    let sortObj = {
        createdAt: order === "DESC" ? -1 : 1
    };
    const currentDateAuction = new Date();
    const query = {
        userId: user,
    };

    if (min && !max) {
        query["auctions.status"] = {$in: ["ACTIVE"]};
        query.$or.push({"auctions.basePrice": {$gte: min}}, {"auctions.immediatePrice": {$gte: min}});
    }

    if (max && !min) {
        query["auctions.status"] = {$in: ["ACTIVE"]};
        query.$or.push({"auctions.basePrice": {$lte: max}}, {"auctions.immediatePrice": {$lte: max}});
    }

    if (min && max) {
        query["auctions.status"] = {$in: ["ACTIVE"]};
        query.$and.push(
            {
                $or: [{"auctions.basePrice": {$gte: min}}, {"auctions.immediatePrice": {$gte: min}}]
            },

            {
                $or: [{"auctions.basePrice": {$lte: max}}, {"auctions.immediatePrice": {$lte: max}}]
            }
        );
    }

    if (sort == "mostFavorited") {
        sortObj = {"tokens.favoriteCount": -1};
    }

    if (sort == "recentlyListed") {
        query["status"] = "IN_AUCTION";
    }

    if (sort == "recentlySold") {
        query.status = "IN_AUCTION";
        sortObj = {updatedAt: -1};
    }
    if (sort == "recentlySold") {
        sortObj = {updatedAt: -1};
        query.status = "SOLD";
    }

    if (sort == "recentlyReceived") {
        query.status = "TRANSFERRED";
        sortObj = {updatedAt: -1};
    }

    if (sort == "endingSoon") {
        const currentDate = new Date();
        query.status = "IN_AUCTION";
        query["auctions.status"] = "ACTIVE";
        query["auctions.end"] = {$gt: currentDate};
        sortObj = {["auctions.end"]: 1};
    }

    if (sort == "priceLowToHigh") {
        query["auctions.status"] = "ACTIVE";
        sortObj = {"auctions.basePrice": 1, "auctions.immediatePrice": 1};
    }

    if (sort == "priceHighToLow") {
        query["auctions.status"] = "ACTIVE";
        sortObj = {"auctions.basePrice": -1, "auctions.immediatePrice": -1};
    }

    if (sort == "highestLastSale") {
        query["status"] = "SOLD";
        sortObj = {"auctions.basePrice": -1, "auctions.immediatePrice": -1};
    }

    if (collections) {
        query.collectionId = {$in: collections};
    }

    if (search) {
        query.$and.push({
            $or: [
                {
                    "tokens.name": {
                        $regex: search || "",
                        $options: "i"
                    }
                },
                {
                    "tokens.description": {
                        $regex: search || "",
                        $options: "i"
                    }
                }
            ]
        });
    }

    if (status && sort != "endingSoon" && sort != "recentlySold" && sort != "highestLastSale") {
        query["status"] = {$in: status};
    }

    if (chain) {
        query["tokens.chain"] = {$in: chain};
    }

    if (properties) {
        if (typeof properties == "string" && !isJson(properties)) {
            throw (new HumanError(Errors.INVALID_COLLECTION.MESSAGE, Errors.INVALID_COLLECTION.CODE));
        }
        const or = [];
        const filteredProperties = [];
        for (let i = 0; i < properties.length; i++) {
            const existIndex = filteredProperties.findIndex((fp) => fp.title == properties[i].title);

            if (existIndex > -1) {
                const newPropertyValues = properties[i].values;
                filteredProperties[existIndex].values =
                    filteredProperties[existIndex].values.concat(newPropertyValues);
            } else {
                filteredProperties.push(properties[i]);
            }
        }

        for (let i = 0; i < filteredProperties.length; i++) {
            or.push({
                [`tokens.properties.title`]: filteredProperties[i].title,
                [`tokens.properties.values`]: {$in: filteredProperties[i].values}
            });
        }

        query.$and.push(...or);
    }


    const result = await UserToken.findAndCountAll({
        include: {
            model: UserAssignedToken,
            as: 'assignedToken',
            where: query,
            include: [
                {
                    model: UserAuctions
                },
                {
                    model: UserAuctionsOffer
                }
            ]
        }
    })

    return {
        total: result.count,
        pageSize: limit,
        page,
        data: result.rows,
    };
}

function topSellers(page, limit, order, sort) {
    return new Promise(async (resolve, reject) => {
        // const temp = await UserAuctions.aggregate([
        // 	{
        // 		$match: {
        // 			status: "FINISH",
        // 		},
        // 	},
        // 	{
        // 		$group: {
        // 			id: "$userId",
        // 			auctionId: { $first: "$id" },
        // 			total: { $sum: 1 },
        // 		},
        // 	},
        // 	{
        // 		$lookup: {
        // 			from: "UserAuctionsOffer",
        // 			localField: "auctionId",
        // 			foreignField: "auctionId",
        // 			as: "offers",
        // 		},
        // 	},
        // 	{ $sort: { [sort]: order == "DESC" ? -1 : 1 } },
        // 	{
        // 		$facet: {
        // 			metadata: [{ $count: "total" }, { $addFields: { page } }],
        // 			data: [{ $skip: (page - 1) * limit }, { $limit: limit }], // add projection here wish you re-shape the docs
        // 		},
        // 	},
        // ]);

        // let thisSum = 0;
        // let totalSell = 0;
        // for (let i = 0; i < temp[0].data.length; i++) {
        // 	thisSum += temp[0].data[i].offers.reduce((n, { status, amount }) => {
        // 		if (status == "ACCEPTED") {
        // 			totalSell++;
        // 			return n + amount;
        // 		} else return n;
        // 	}, 0);

        // 	temp[0].data[i].amount = thisSum;
        // 	temp[0].data[i].totalSell = totalSell;
        // 	thisSum = 0;
        // 	totalSell = 0;
        // }

        // const metadata = temp[0].metadata[0];
        // const thisAuctions = temp[0].data.map(({ id: user, ...other }) => ({
        // 	user,
        // 	...other,
        // }));

        // await User.populate(thisAuctions, { path: "user", select: "id username image email" });

        // thisAuctions.sort((a, b) => b.amount - a.amount);

        // resolve({
        // 	data: thisAuctions.map((auc) => {
        // 		return { user: auc.user, totalSell: auc.totalSell, amount: auc.amount };
        // 	}),
        // 	...metadata,
        // });

        const topSellers = await UserCollectionStats.find({deletedAt: null, type: "ALL", volume: {$gte: 0}})
            .sort({volume: -1})
            .limit(10)
            .populate({
                path: "collectionId",
                populate: {
                    path: "user",
                    select: "image email address id username"
                }
            })
            .lean();

        const thisSellers = [];
        for (let i = 0; i < topSellers.length; i++) {
            const existIndex = thisSellers.findIndex(
                (ts) => String(ts?.id) == String(topSellers[i]?.collectionId?.user?.id)
            );
            if (existIndex > -1) {
                thisSellers[existIndex].volume += topSellers[i].volume;
            } else {
                thisSellers.push({
                    ...topSellers[i].collectionId.user,
                    volume: topSellers[i].volume
                });
            }
        }

        resolve({
            data: thisSellers
        });
    });
}

function popularCollections(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, order, sort} = data;

        const temp = await UserAssignedToken.aggregate([
            {
                $match: {deletedAt: null, collectionId: {$not: {$eq: null}}, status: "SOLD"}
            },
            {
                $group: {
                    id: "$collectionId",
                    count: {$sum: 1}
                }
            },

            {$sort: {[sort]: order == "DESC" ? -1 : 1}},
            {
                $facet: {
                    metadata: [{$count: "total"}, {$addFields: {page}}],
                    data: [{$skip: (page - 1) * limit}, {$limit: limit}] // add projection here wish you re-shape the docs
                }
            }
        ]);

        const metadata = temp[0].metadata[0];

        const thisCollections = temp[0].data.map(({id: collection, ...other}) => ({
            collection,
            ...other
        }));

        await UserCollection.populate(thisCollections, {
            path: "collection",
            select: "id name description image category background user",
            populate: {
                path: "user",
                select: "username image"
            }
        });

        resolve({data: thisCollections, ...metadata});
    });
}

async function assets(data, userId, ip) {
    const {page, limit, sort, order, search, min, max, collections, categories, status, chain} = data;
    let sortObj = [["createdAt", "DESC"]];
    const currentDateAuction = new Date();

    const query = {
        // [postgres.Op.or]: [
        //     {'$assignedTokens.status$': 'IN_AUCTION'},
        //     {'$assignedTokens.status$': 'FREE'},
        // ],
        // [postgres.Op.and]: [],
    };

    if (min && !max) {
        query["auctions.status"] = {$in: ["ACTIVE"]};
        query.$or.push(
            {"auctions.basePrice": {$gte: min}},
            {"auctions.immediatePrice": {$gte: min}}
        );
    }


    if (max && !min) {
        query["auctions.status"] = {$in: ["ACTIVE"]};
        query.$or.push(
            {"auctions.basePrice": {$lte: max}},
            {"auctions.immediatePrice": {$lte: max}}
        );
    }


    if (min && max) {
        query["auctions.status"] = {$in: ["ACTIVE"]};
        query.$and.push(
            {
                $or: [
                    {"auctions.basePrice": {$gte: min}},
                    {"auctions.immediatePrice": {$gte: min}}
                ]
            },
            {
                $or: [
                    {"auctions.basePrice": {$lte: max}},
                    {"auctions.immediatePrice": {$lte: max}}
                ]
            }
        );
    }


    const options = [
        "recentlyListed", // recently listed
        "recentlySold",
        "recentlyReceived",
        "endingSoon",
        "priceLowToHigh",
        "priceHighToLow",
        "highestLastSale"
    ];

    if (sort === "mostFavorited") {
        sortObj = [["favoriteCount", "DESC"]];
    }

    if (sort === "recentlyListed") {
        query["assignedTokens.status"] = "IN_AUCTION";
        sortObj = [["assignedTokens.updatedAt", "DESC"]];
    }

    if (sort === "recentlySold") {
        query["assignedTokens.status"] = "SOLD";
        sortObj = [["assignedTokens.updatedAt", "DESC"]];
    }

    if (sort === "recentlyReceived") {
        query["assignedTokens.status"] = "TRANSFERRED";
        sortObj = [["assignedTokens.updatedAt", "DESC"]];
    }

    if (sort === "endingSoon") {
        const currentDate = new Date();
        query.status = "IN_AUCTION";
        query["auctions.status"] = "ACTIVE";
        query["auctions.end"] = {[postgres.Op.gt]: currentDate};
        sortObj = [["auctions.end", "ASC"]];
    }

    if (sort === "priceLowToHigh") {
        query["auctions.status"] = "ACTIVE";
        sortObj = [["auctions.basePrice", "ASC"], ["auctions.immediatePrice", "ASC"]];
    }

    if (sort === "priceHighToLow") {
        query["auctions.status"] = "ACTIVE";
        sortObj = [["auctions.basePrice", "DESC"], ["auctions.immediatePrice", "DESC"]];
    }

    if (sort === "highestLastSale") {
        query["assignedTokens.status"] = "SOLD";
        sortObj = [["auctions.basePrice", "DESC"], ["auctions.immediatePrice", "DESC"]];
    }


    if (search) {
        query[postgres.Op.and] = query[postgres.Op.and] || [];
        query[postgres.Op.and].push({
            [postgres.Op.or]: [
                {name: {[postgres.Op.iLike]: `%${search}%`}},
                {description: {[postgres.Op.iLike]: `%${search}%`}}
            ]
        });
    }

    if (status && sort != "endingSoon" && sort != "recentlySold" && sort != "highestLastSale") {
        if (typeof status === "string" && !isJson(status)) {
            throw (
                new HumanError(
                    Errors.INVALID_ASSIGNED_TOKEN_STATUS.MESSAGE,
                    400)
            );
        }
        query["assignedTokens.status"] = {[postgres.Op.in]: status};
    }

    if (chain) {
        if (typeof chain === "string" && !isJson(chain)) {
            throw(new HumanError(Errors.INVALID_CHAIN.MESSAGE, 400));
        }

        query.chain = {[postgres.Op.in]: chain};
    }

    if (collections) {
        if (typeof collections === "string" && !isJson(collections)) {
            throw (new HumanError(Errors.INVALID_COLLECTION.MESSAGE, Errors.INVALID_COLLECTION.CODE));
        }
        query.collectionId = {$in: collections.map((id) => new ObjectId(id))};
    }

    if (categories) {
        if (typeof categories === "string" && !isJson(categories)) {
            throw (new HumanError(Errors.INVALID_CATEGORIES.MESSAGE, Errors.INVALID_CATEGORIES.CODE));
        }
        query["$collection.category$"] = {
            [postgres.Op.in]: categories.map((id) => id)
        };
    }

    if (query.$or && query.$or.length === 0) {
        delete query.$or;
    }

    if (query.$and && query.$and.length === 0) {
        delete query.$and;
    }

    console.log({query});
    const thisItems = await UserToken.findAll({
        include: [
            {
                model: UserAssignedToken,
                as: "assignedToken",
                include: [
                    {model: User},
                    {
                        model: UserAuctions,
                        where: {
                            // status: "ACTIVE",
                            // start: { [postgres.Op.lt]: currentDateAuction },
                            // end: { [postgres.Op.gt]: currentDateAuction }
                        }
                    }
                ]
            },
            {
                model: UserCollection,
                include: {model: User, as: "user"}
            }
        ],
        where: query,
        order: [sortObj],
        offset: (page - 1) * limit,
        limit: limit
    });

    console.log({thisItems});
    const totalItems = await UserToken.count({
        where: query
    });

    console.log({totalItems});

    const items = thisItems.map((userToken) => {
        const assignedTokens = userToken.assignedTokens ? [userToken.assignedTokens] : [];
        const auctions = assignedTokens.length > 0 ? [assignedTokens[0].auctions] : [];
        const {assignedTokens: _, auctions: __, ...rest} = userToken.toJSON();

        return {
            assignedTokens,
            auctions,
            ...rest
        };
    });

    console.log({items});

    for (let i = 0; i < items.length; i++) {
        let is_liked = false;

        // if (userId) {
        //     let like = await UserFollowLike.findOne({userId: userId, likedToken: new ObjectId(items[i].id)});
        //     if (like) is_liked = true;
        // }
        items[i].is_liked = is_liked;
    }

    const metadata = [{total: totalItems, page}];
    return ({data: items, ...metadata});
}

function featuredUsers(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, sort, order} = data;
        const sortObj = {};
        sortObj[sort || "createdAt"] = order;

        const thisUsers = await User.find({isFeatured: true, deletedAt: null})
            .select("-__v")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        resolve({data: thisUsers});
    });
}

function featuredCollections(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, sort, order} = data;
        const sortObj = {};
        sortObj[sort || "createdAt"] = order;

        const thisCollections = await UserCollection.find({isFeatured: true, deletedAt: null})
            .populate("user", "username id address image")
            .select("-__v")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        resolve({data: thisCollections});
    });
}

function trendingArts(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, order, sort} = data;

        const sortObj = {
            createdAt: order === "DESC" ? -1 : 1
        };

        // const temp = await UserAuctionsOffer.aggregate([
        // 	{
        // 		$match: {
        // 			/*status: "REGISTER"*/
        // 		},
        // 	},
        // 	{
        // 		$group: {
        // 			id: "$auctionId",
        // 			count: { $sum: 1 },
        // 		},
        // 	},

        // 	{ $sort: { [sort]: order == "DESC" ? -1 : 1 } },

        // 	{
        // 		$facet: {
        // 			metadata: [{ $count: "total" }, { $addFields: { page } }],
        // 			data: [{ $skip: (page - 1) * limit }, { $limit: limit }], // add projection here wish you re-shape the docs
        // 		},
        // 	},
        // ]);

        // const temp = await UserAuctionsOffer.aggregate([
        // 	{
        // 		$match: {
        // 			status: { $in: ["REGISTER"] },
        // 			auctionId: { $ne: null },
        // 			assignedTokenId: null,
        // 			deletedAt: null,
        // 		},
        // 	},
        // 	{
        // 		$group: {
        // 			id: "$auctionId",
        // 			count: { $sum: 1 },
        // 		},
        // 	},

        // 	{ $sort: { [sort]: order == "DESC" ? -1 : 1 } },

        // 	{
        // 		$facet: {
        // 			metadata: [{ $count: "total" }, { $addFields: { page } }],
        // 			data: [{ $skip: (page - 1) * limit }, { $limit: limit }], // add projection here wish you re-shape the docs
        // 		},
        // 	},
        // ]);

        // let thisAuctionsOffers = [];

        // if (temp[0].data.length > 0) {
        // 	thisAuctionsOffers = temp[0].data.map(({ id: auction, ...other }) => ({
        // 		auction,
        // 		...other,
        // 	}));

        // 	await UserAuctions.populate(thisAuctionsOffers, {
        // 		path: "auction",
        // 		populate: {
        // 			path: "assignTokenId",
        // 			populate: [
        // 				{
        // 					path: "collectionId",
        // 					populate: {
        // 						path: "category",
        // 						match: { deletedAt: null },
        // 					},
        // 				},
        // 				{ path: "userId" },
        // 				{ path: "tokenId" },
        // 			],
        // 		},
        // 	});

        // 	for (let i = 0; i < thisAuctionsOffers.length; i++) {
        // 		let thisTokenFreeAssignedToken;
        // 		if (thisAuctionsOffers[i].auction) {
        // 			thisTokenFreeAssignedToken = await UserAssignedToken.findOne({
        // 				tokenId: thisAuctionsOffers[i].auction.assignTokenId.tokenId.id,
        // 				status: { $in: ["FREE", "IN_AUCTION"] },
        // 				deletedAt: null,
        // 			})
        // 				.populate("userId", "username image email")
        // 				.lean();
        // 		}

        // 		// const thisAddresses = thisAuctionsOffers[i].auction.assignTokenId.tokenId.royalities.map(
        // 		// 	(roy) => roy.address,
        // 		// );
        // 		// const thisOwner = await User.findOne({
        // 		// 	address: { $in: thisAddresses },
        // 		// });
        // 		thisAuctionsOffers[i].owner = thisTokenFreeAssignedToken
        // 			? { ...thisTokenFreeAssignedToken.userId }
        // 			: null;
        // 	}

        // 	await User.populate(thisAuctionsOffers, {
        // 		path: "userId",
        // 		select: "username email image",
        // 	});
        // }

        // let thisTrends = [];
        // if (thisAuctionsOffers.length > 0) {
        // 	thisTrends = thisAuctionsOffers.map((trend) => {
        // 		return {
        // 			offerCount: trend.count,
        // 			owner: trend.owner,
        // 			token: trend.auction ? trend.auction.assignTokenId.tokenId : null,
        // 			collection: trend.auction ? trend.auction.assignTokenId.collectionId : null,
        // 			// assignedToken: {
        // 			// 	id: trend.auction ? trend.auction.assignTokenId.id : null,
        // 			// 	user: trend.auction ? trend.auction.assignTokenId.userId : null,
        // 			// 	status: trend.auction ? trend.auction.assignTokenId.status : null,
        // 			// },
        // 		};
        // 	});
        // }

        // const metadata = temp[0].metadata[0];

        const thisTokens = await UserToken.find({isTrend: true, deletedAt: null})
            .select("id name description thumbnail favoriteCount")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const thisAssignedTokens = await UserAssignedToken.find({
            status: {$in: ["FREE", "IN_AUCTION"]},
            tokenId: {$in: thisTokens.map((token) => token.id)}
        })
            .populate("userId", "id address username email image")
            .lean();

        const thisTrends = [];
        thisTokens.forEach((token, i) => {
            const assignedToken = thisAssignedTokens.find((ts) => String(ts.tokenId) === String(token.id));
            if (assignedToken) thisTrends.push({...thisTokens[i], owner: assignedToken.userId});
        });

        resolve({data: thisTrends});
    });
}

async function collectionSearch(data, user) {
    const {id, page, limit, sort, order, search, min, max, status, properties, chain} = data;
    let sortObj = [["createdAt", "DESC"]];

    const currentDateAuction = new Date();
    const query = {
        collectionId: id,
        status: {
            [postgres.Op.in]: ["FREE", "IN_AUCTION", "NOT_MINTED"]
        },
    };

    if (min && !max) {
        query["$and"] = [
            {
                "$or": [
                    {"auctions.basePrice": {[postgres.Op.gte]: min}},
                    {"auctions.immediatePrice": {[postgres.Op.gte]: min}}
                ]
            }
        ];
    }

    if (max && !min) {
        query["$and"] = [
            {
                "$or": [
                    {"auctions.basePrice": {[postgres.Op.lte]: max}},
                    {"auctions.immediatePrice": {[postgres.Op.lte]: max}}
                ]
            }
        ];
    }

    if (min && max) {
        query["$and"] = [
            {
                "$or": [
                    {"auctions.basePrice": {[postgres.Op.gte]: min}},
                    {"auctions.immediatePrice": {[postgres.Op.gte]: min}}
                ]
            },
            {
                "$or": [
                    {"auctions.basePrice": {[postgres.Op.lte]: max}},
                    {"auctions.immediatePrice": {[postgres.Op.lte]: max}}
                ]
            }
        ];
    }


    if (sort === "mostFavorited") {
        sortObj = [["tokens.favoriteCount", "DESC"]];
    }

    if (sort === "recentlyListed") {
        query.status = "IN_AUCTION";
        sortObj = [["updatedAt", "DESC"]];
    }

    if (sort === "recentlySold") {
        query.status = "SOLD";
        sortObj = [["updatedAt", "DESC"]];
    }

    if (sort === "recentlyReceived") {
        query.status = "TRANSFERRED";
        sortObj = [["updatedAt", "DESC"]];
    }

    if (sort === "endingSoon") {
        const currentDate = new Date();
        query.status = "IN_AUCTION";
        query["auctions.status"] = "ACTIVE";
        query["auctions.end"] = {[postgres.Op.gt]: currentDate};
        sortObj = [["auctions.end", "ASC"]];
    }

// Use the query object and sortObj in your Sequelize query

    if (sort === "mostFavorited") {
        sortObj = [["tokens.favoriteCount", "DESC"]];
    }

    if (sort === "recentlyListed") {
        query.status = "IN_AUCTION";
        sortObj = [["updatedAt", "DESC"]];
    }

    if (sort === "recentlySold") {
        query.status = "SOLD";
        sortObj = [["updatedAt", "DESC"]];
    }

    if (sort === "recentlyReceived") {
        query.status = "TRANSFERRED";
        sortObj = [["updatedAt", "DESC"]];
    }

    if (sort === "endingSoon") {
        const currentDate = new Date();
        query.status = "IN_AUCTION";
        query["auctions.status"] = "ACTIVE";
        query["auctions.end"] = {[postgres.Op.gt]: currentDate};
        sortObj = [["auctions.end", "ASC"]];
    }

    if (sort === "priceLowToHigh") {
        query["auctions.status"] = "ACTIVE";
        sortObj = [["auctions.basePrice", "ASC"], ["auctions.immediatePrice", "ASC"]];
    }

    if (sort === "priceHighToLow") {
        query["auctions.status"] = "ACTIVE";
        sortObj = [["auctions.basePrice", "DESC"], ["auctions.immediatePrice", "DESC"]];
    }

    if (sort === "highestLastSale") {
        query["status"] = "SOLD";
        sortObj = [["auctions.basePrice", "DESC"], ["auctions.immediatePrice", "DESC"]];
    }

// Use the query object and sortObj in your Sequelize query


    if (search) {
        query["$and"] = [
            {
                "$or": [
                    {
                        "tokens.name": {
                            [postgres.Op.iRegexp]: search || ""
                        }
                    },
                    {
                        "tokens.description": {
                            [postgres.Op.iRegexp]: search || ""
                        }
                    }
                ]
            }
        ];
    }

    if (status && sort !== "endingSoon" && sort !== "recentlySold" && sort !== "highestLastSale") {
        query["status"] = {[postgres.Op.in]: status};
        if (status.includes("IN_AUCTION")) {
            query["auctions.status"] = "ACTIVE";
        }
    }

    if (chain) {
        query["tokens.chain"] = {[postgres.Op.in]: chain};
    }

    if (properties) {
        if (typeof properties == "string" && !isJson(properties)) {
            throw (new HumanError(Errors.INVALID_COLLECTION.MESSAGE, Errors.INVALID_COLLECTION.CODE));
        }


        const or = [];
        const filteredProperties = [];
        for (let i = 0; i < properties.length; i++) {
            const existIndex = filteredProperties.findIndex((fp) => fp.title === properties[i].title);

            if (existIndex > -1) {
                const newPropertyValues = properties[i].values;
                filteredProperties[existIndex].values =
                    filteredProperties[existIndex].values.concat(newPropertyValues);
            } else {
                filteredProperties.push(properties[i]);
            }
        }

        for (let i = 0; i < filteredProperties.length; i++) {
            or.push({
                "$tokens.properties.title$": filteredProperties[i].title,
                "$tokens.properties.values$": {[postgres.Op.contains]: filteredProperties[i].values}
            });
        }

        query["$and"] = [...query["$and"], ...or];

// Use the query object in your Sequelize query

    }

    // if (query.$or.length === 0) delete query.$or;
    // if (query.$and.length === 0) delete query.$and;

    const result = await UserToken.findAndCountAll({
        include: {
            model: UserAssignedToken,
            as: 'assignedToken',
            where: query,
            include: [
                {
                    model: UserAuctions,
                    include: {
                        model: User
                    },
                    where: {
                        start: {[postgres.Op.lt]: currentDateAuction},
                        end: {[postgres.Op.gt]: currentDateAuction},
                        deletedAt: null,
                        status: "ACTIVE"
                    },
                    required: false
                }
            ],
        },
        order: [sortObj],
        offset: (page - 1) * limit,
        limit: limit,
        subQuery: false
    })


    const tempCol = await UserCollection.findByPk(id, {
        attributes: {exclude: ["deletedAt", "updatedAt"]},
        include: [
            {
                model: User,
                as: "user",
                attributes: ["username", "email", "id", "address", "avatar"]
            }
        ],
        raw: true
    });

    let floorPrice = null; // it's in the ranking. should this be here?

    const collection = {
        ...tempCol,
        floorPrice,
        items: await UserToken.count({where: {collectionId: id}})
    };

    return {
        total: result.count,
        pageSize: limit,
        page,
        data: result.rows,
        collection
    };
}

function slider(data) {
    return new Promise(async (resolve, reject) => {
        const {page, limit, order, sort} = data;
        const sortObj = {
            createdAt: order === "DESC" ? -1 : 1
        };
        // const temp = await UserAuctionsOffer.aggregate([
        // 	{
        // 		$match: {
        // 			status: { $in: ["REGISTER"] },
        // 			auctionId: { $ne: null },
        // 			assignedTokenId: null,
        // 			deletedAt: null,
        // 		},
        // 	},
        // 	{
        // 		$group: {
        // 			id: "$auctionId",
        // 			count: { $sum: 1 },
        // 		},
        // 	},

        // 	{ $sort: { [sort]: order == "DESC" ? -1 : 1 } },

        // 	{
        // 		$facet: {
        // 			metadata: [{ $count: "total" }, { $addFields: { page } }],
        // 			data: [{ $skip: (page - 1) * limit }, { $limit: limit }], // add projection here wish you re-shape the docs
        // 		},
        // 	},
        // ]);

        // const thisAuctionsOffers = temp[0].data.map(({ id: auction, ...other }) => ({
        // 	auction,
        // 	...other,
        // }));

        // if (thisAuctionsOffers.length > 0) {
        // 	for (let i = 0; i < thisAuctionsOffers.length; i++) {
        // 		const tempHighestOffer = await UserAuctionsOffer.find({
        // 			deletedAt: null,
        // 			status: "REGISTER",
        // 			auctionId: thisAuctionsOffers[i].auction,
        // 		})
        // 			.populate("userId", "image username amount")
        // 			.sort("-amount")
        // 			.lean();

        // 		if (tempHighestOffer.length > 0) {
        // 			thisAuctionsOffers[i].highestOffer = {
        // 				price: tempHighestOffer[0].amount ? tempHighestOffer[0].amount : null,
        // 				name: tempHighestOffer[0].userId.username ? tempHighestOffer[0].userId.username : null,
        // 				image: tempHighestOffer[0].userId.image ? tempHighestOffer[0].userId.image : null,
        // 				id: tempHighestOffer[0].userId.id ? tempHighestOffer[0].userId.id : null,
        // 			};
        // 		} else {
        // 			thisAuctionsOffers[i].highestOffer = {
        // 				price: 0,
        // 				name: "",
        // 				image: "",
        // 				id: "",
        // 			};
        // 		}
        // 	}

        // 	// const highestOfferTemp = thisAuctionsOffers.reduce((max, min) => (max.amount > min.amount ? max : min));

        // 	await UserAuctions.populate(thisAuctionsOffers, {
        // 		path: "auction",
        // 		populate: {
        // 			path: "assignTokenId",
        // 			populate: [
        // 				{
        // 					path: "collectionId",
        // 					populate: {
        // 						path: "category",
        // 						match: { deletedAt: null },
        // 					},
        // 				},
        // 				{ path: "userId" },
        // 				{ path: "tokenId" },
        // 			],
        // 		},
        // 	});

        // 	await User.populate(thisAuctionsOffers, {
        // 		path: "assignTokenId.userId",
        // 		select: "username email image",
        // 	});
        // }

        // let thisCollections;
        // if (thisAuctionsOffers.length > 0) {
        // 	thisCollections = thisAuctionsOffers.map((collection) => {
        // 		return {
        // 			mainPrices: {
        // 				basePrice: collection.auction ? collection.auction.basePrice : null,
        // 				immediatePrice: collection.auction ? collection.auction.immediatePrice : null,
        // 				bookingPrice: collection.auction ? collection.auction.bookingPrice : null,
        // 			},
        // 			count: collection.auction ? collection.count : null,
        // 			token: collection.auction ? collection.auction.assignTokenId.tokenId : null,
        // 			assignedToken: {
        // 				id: collection.auction ? collection.auction.assignTokenId.id : null,
        // 				user: collection.auction ? collection.auction.assignTokenId.userId : null,
        // 				status: collection.auction ? collection.auction.assignTokenId.status : null,
        // 			},
        // 			collection: collection.auction ? collection.auction.assignTokenId.collectionId : null,
        // 			highestOffer: collection.highestOffer,
        // 		};
        // 	});
        // }

        // const metadata = temp[0].metadata[0];

        const thisTokens = await UserToken.find({isSlider: true, deletedAt: null})
            .populate("collectionId")
            .select("-__v -updatedAt -deletedAt")
            .sort(sortObj)
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const thisAssignedTokens = await UserAssignedToken.find({
            status: {$in: ["FREE", "IN_AUCTION"]},
            tokenId: {$in: thisTokens.map((token) => token.id)}
        })
            .populate("userId", "id address username email image createdAt")

            .lean();

        const thisSlider = [];

        const currentDateAuction = new Date();
        for (let i = 0; i < thisTokens.length; i++) {
            const assignedToken = thisAssignedTokens.find((ts) => String(ts.tokenId) === String(thisTokens[i].id));
            let auction = {};
            if (assignedToken) {
                let highestBid = {};
                let bids = [];
                auction = await UserAuctions.findOne({
                    deletedAt: null,
                    status: "ACTIVE",
                    assignTokenId: ObjectId(assignedToken.id),
                    start: {$lt: currentDateAuction},
                    end: {$gt: currentDateAuction}
                }).lean();

                if (auction) {
                    const bids = await UserAuctionsOffer.find({
                        deletedAt: null,
                        status: "REGISTER",
                        auctionId: ObjectId(auction.id),
                        expiresAt: {$gt: currentDateAuction}
                    })
                        .populate("userId", "id address image username createdAt")
                        .sort("-amount")
                        .lean();
                    highestBid = {...bids[0]};
                }

                const thisOffers = await UserAuctionsOffer.find({
                    deletedAt: null,
                    status: "REGISTER",
                    assignedTokenId: ObjectId(assignedToken.id),
                    expiresAt: {$gt: currentDateAuction}
                })
                    .populate("userId", "id address image username createdAt")
                    .sort("-amount")
                    .lean();

                thisSlider.push({
                    ...thisTokens[i],
                    owner: assignedToken.userId,
                    bids,
                    highestBid,
                    offers: thisOffers,
                    highestoffer: thisOffers[0],
                    assignedToken,
                    auction
                });
            }
        }

        resolve({data: thisSlider});
    });
}

/**
 * stats user collection ranking
 * @param {*} data
 * @returns
 */
async function ranking(data) {
    const {page, limit, sort, order, categoryId, type, collectionId} = data;

    let query = {type, ...(categoryId ? {categoryId} : {})};

    if (collectionId) {
        query.collectionId = collectionId;
    }

    const countQuery = await UserCollectionStats.findAndCountAll({
        include: [{model: postgres.UserCollection}],
        // attributes: [
        //     [postgres.sequelize.fn("COUNT", postgres.sequelize.col("items.collectionId")), "count"]
        // ],
        // group: ["items.collectionId"],
        where: query
    });

    const countResult = countQuery.count || 0;

    const result = await UserCollectionStats.findAndCountAll({
        include: [{model: postgres.UserCollection}],
        where: query,
        order: [[sort, order]],
        offset: (page - 1) * limit,
        limit: limit
    });

    return {
        total: countResult,
        pageSize: limit,
        page,
        data: result.rows
    };
}

function socketTest() {
    return new Promise(async (resolve, reject) => {
        const data = await new Blog({title: "TEST", description: "yessss"});

        await socketService.emitBidEvent(data.toObject());

        return resolve("OK");
    });
}


module.exports = {
    generalSearch,
    searchUsername,
    explore,
    topSellers,
    popularCollections,
    assets,
    featuredUsers,
    trendingArts,
    collectionSearch,
    slider,
    customExplorer,
    ranking,
    featuredCollections,
    socketTest

};
