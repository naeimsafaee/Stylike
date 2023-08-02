const moment = require("moment");
const {UserCollection, UserAssignedToken, UserCollectionStats} = require("../../databases/postgres");
const {postgres} = require("../../databases");

/**
 * update user collection stats
 */
exports.updateCollectionStats = (collectionId, volume, floorPrice, owners, items) => {
    return new Promise(async (resolve, reject) => {
        let current = moment();

        // const thisCollection = await UserCollection.findById(collectionId).select("category").lean();
        const thisCollection = await UserCollection.findOne({
            // attributes: ['category'],
            where: {
                id: collectionId
            },
            raw: true
        });

        // check collection owners
        if (owners) {
            owners = await UserAssignedToken.findAll({
                where: {
                    collectionId: collectionId,
                    status: {
                        [postgres.Op.in]: ['FREE', 'IN_AUCTION'],
                    },
                },
                attributes: [
                    'userId',
                    [postgres.sequelize.fn('count', postgres.sequelize.col('*')), 'count']
                ],
                group: 'userId',
                raw: true
            });

            if (owners.length) owners = owners.length;
            else owners = null;
        }

        // update Collection statistics in the last 24 hours
        await UserCollectionStats.update(
            {
                collectionId,
                ...(volume ? {volume: postgres.sequelize.literal(`volume + ${volume}`)} : {}),
                ...(floorPrice ? {floorPrice: postgres.sequelize.literal(`floorPrice + ${floorPrice}`)} : {}),
                ...(owners ? {owners} : {}),
                ...(items ? {items: postgres.sequelize.literal(`items + ${items}`)} : {}),
                type: "24H",
                categoryId: thisCollection.category,
            },
            {
                where: {
                    collectionId,
                    createdAt: {
                        [postgres.Op.and]: [
                            {[postgres.Op.gte]: current.startOf("day").toDate()},
                            {[postgres.Op.lte]: current.endOf("day").toDate()},
                        ],
                    },
                    type: "24H",
                },
            }
        );

        // update Collection statistics in the last week
        await UserCollectionStats.update(
            {
                collectionId,
                ...(volume ? {volume: postgres.sequelize.literal(`volume + ${volume}`)} : {}),
                ...(floorPrice ? {floorPrice: postgres.sequelize.literal(`floorPrice + ${floorPrice}`)} : {}),
                ...(owners ? {owners} : {}),
                ...(items ? {items: postgres.sequelize.literal(`items + ${items}`)} : {}),
                type: "7D",
                categoryId: thisCollection.category,
            },
            {
                where: {
                    collectionId,
                    createdAt: {
                        [postgres.Op.and]: [
                            {[postgres.Op.gte]: current.startOf("week").toDate()},
                            {[postgres.Op.lte]: current.endOf("week").toDate()},
                        ],
                    },
                    type: "7D",
                },
            }
        );
        // update Collection statistics in the last month
        await UserCollectionStats.update(
            {
                collectionId,
                ...(volume ? {volume: postgres.sequelize.literal(`volume + ${volume}`)} : {}),
                ...(floorPrice ? {floorPrice: postgres.sequelize.literal(`floorPrice + ${floorPrice}`)} : {}),
                ...(owners ? {owners} : {}),
                ...(items ? {items: postgres.sequelize.literal(`items + ${items}`)} : {}),
                type: "30D",
                categoryId: thisCollection.category,
            },
            {
                where: {
                    collectionId,
                    createdAt: {
                        [postgres.Op.and]: [
                            {[postgres.Op.gte]: current.startOf("month").toDate()},
                            {[postgres.Op.lte]: current.endOf("month").toDate()},
                        ],
                    },
                    type: "30D",
                },
            }
        );

        // update Collection statistics for all (rom the beginning of registration)
        await UserCollectionStats.update(
            {
                collectionId,
                ...(volume ? {volume: postgres.sequelize.literal(`volume + ${volume}`)} : {}),
                ...(floorPrice ? {floorPrice: postgres.sequelize.literal(`floorPrice + ${floorPrice}`)} : {}),
                ...(owners ? {owners} : {}),
                ...(items ? {items: postgres.sequelize.literal(`items + ${items}`)} : {}),
                type: "ALL",
                categoryId: thisCollection.category,
            },
            {
                where: {
                    collectionId,
                    type: "ALL",
                },
            }
        );

        return resolve();
    });
};
