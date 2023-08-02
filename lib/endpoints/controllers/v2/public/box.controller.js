const {
    httpResponse: { response },
    httpStatus
} = require("../../../../utils");
const { postgres } = require("../../../../databases");
const { NotFoundError } = require("../../../../services/errorhandler");
const Errors = require("../../../../services/errorhandler/MessageText");
const _ = require("lodash");

exports.getBoxAuctions = async (req, res) => {
    const { page, limit, sort, order, min, max, os , level } = req.query;
    const userId = req.userEntity?.id;

    let levels = [];

    // const query2 = {};

    if (userId) {
        const userCameras = await postgres.AssignedCard.findAll({
            where: {
                userId: userId
            },
            include: [{
                model: postgres.Card,
                required: true
            }]
        });

        for (let i = 0; i < userCameras.length; i++) {
            const cardTypeLevels = await postgres.CardTypeBoxLevel.findAll({
                where: { cardTypeId: userCameras[i].card.cardTypeId },
                raw: true,
                nest: true
            });

            for (let j = 0; j < cardTypeLevels.length; j++) {
                if(levels.indexOf(cardTypeLevels[j].level) < 0)
                    levels.push(cardTypeLevels[j].level);
            }

        }

        // query2.level = { [postgres.Op.in]: levels };
    }

    if(level)
        levels = [parseInt(level)]

    let boxes = await postgres.sequelize.query(
        `WITH box AS (
SELECT
"boxAuctions".id, "boxAuctions"."boxId", "boxAuctions".price, "boxAuctions"."assetId", "boxAuctions".status, "boxAuctions"."createdAt",
"boxes".name as "boxName", "boxes".image as "boxImage", "boxes".level,
"assets".coin, "assets".name as "assetName", "assets".precision,
"assets".icon, "assets"."createdAt" as "assetCreatedAt",
ROW_NUMBER() OVER( PARTITION BY "level") l
FROM "boxAuctions"
JOIN "boxes" on "boxAuctions"."boxId" = "boxes"."id"
JOIN "assets" on "assets".id = "boxAuctions"."assetId"
WHERE "boxAuctions".status='ACTIVE' and "boxAuctions"."deletedAt" is null ${levels.length > 0 ? 'and "boxes".level in(' + levels + ')' : ''}
and "boxAuctions".price BETWEEN ${min} AND ${max}
)
SELECT * FROM box WHERE l <= ${limit}
order by ${sort} ${order}`,
        { nest: true, raw: true }
    );

    //OFFSET ${offset} limit ${limit};

    boxes = boxes.map((b) => ({
        id: b.id,
        boxId: b.boxId,
        price: b.price,
        assetId: b.assetId,
        status: b.status,
        createdAt: b.createdAt,
        box: {
            id: b.boxId,
            name: b.boxName,
            image: b.boxImage,
            level: b.level
        },
        asset: {
            id: b.assetId,
            coin: b.coin,
            name: b.assetName,
            precision: b.precision,
            icon: b.icon,
            createdAt: b.assetCreatedAt
        }
    }));

    boxes = _.shuffle(boxes);

    let data;
    if(os === 'app'){

        boxes = _.groupBy(boxes, "box.level");
        data = {
            data: boxes
        };
    } else {
        data = {
            total: boxes.length,
            pageSize: limit,
            page,
            data: boxes
        };
    }




    return response({ res, statusCode: httpStatus.OK, data });
    /*if (level) {

    } else if (page !== 1) {
        const data = {
            total: 0,
            pageSize: limit,
            page,
            data: []
        };
    } else {
        let boxes = await postgres.sequelize.query(
            `WITH box AS (
SELECT
"boxAuctions".id, "boxAuctions"."boxId", "boxAuctions".price, "boxAuctions"."assetId", "boxAuctions".status, "boxAuctions"."createdAt",
"boxes".name as "boxName", "boxes".image as "boxImage", "boxes".level,
"assets".coin, "assets".name as "assetName", "assets".precision,
"assets".icon, "assets"."createdAt" as "assetCreatedAt",
ROW_NUMBER() OVER( PARTITION BY "level") l
FROM "boxAuctions"
JOIN "boxes" on "boxAuctions"."boxId" = "boxes"."id"
JOIN "assets" on "assets".id = "boxAuctions"."assetId"
WHERE "boxAuctions".status='ACTIVE' and "boxAuctions"."deletedAt" is null
and "boxAuctions".price BETWEEN ${min} AND ${max}
)
SELECT * FROM box WHERE l <= ${os === "app" ? 6 : 4}
order by ${sort} ${order}
${!os ? `limit ${limit}` : ""}
;`,
            { nest: true, raw: true }
        );

        boxes = boxes.map((b) => ({
            id: b.id,
            boxId: b.boxId,
            price: b.price,
            assetId: b.assetId,
            status: b.status,
            createdAt: b.createdAt,
            box: {
                id: b.boxId,
                name: b.boxName,
                image: b.boxImage,
                level: b.level
            },
            asset: {
                id: b.assetId,
                coin: b.coin,
                name: b.assetName,
                precision: b.precision,
                icon: b.icon,
                createdAt: b.assetCreatedAt
            }
        }));

        if (os === "app") {
            boxes = _.groupBy(boxes, "box.level");
            data = {
                data: boxes
            };
        } else {
            boxes = _.shuffle(boxes);
            data = {
                total: boxes.length,
                pageSize: limit,
                page,
                data: boxes
            };
        }
    }

    return response({ res, statusCode: httpStatus.OK, data });*/
};

exports.getBoxAuction = async (req, res) => {
    const { id } = req.params;
    const auction = await postgres.BoxAuction.findOne({
        where: { id, status: "ACTIVE" },
        attributes: { exclude: "boxId" },
        include: [
            {
                model: postgres.Box,
                attributes: ["id", "name", "image", "cardTypeId"],
                include: { model: postgres.CardType, attributes: ["id", "name", "image"] }
            },
            postgres.Asset
        ]
    });
    if (!auction) throw new NotFoundError(Errors.AUCTION_NOT_FOUND.MESSAGE, Errors.AUCTION_NOT_FOUND.CODE, { id });

    return response({ res, statusCode: httpStatus.OK, data: auction });
};

exports.getBoxLevel = async (req, res) => {

    const userId = req.userEntity?.id;
    let levels = [];

    if(userId){

        const userCameras = await postgres.AssignedCard.findAll({
            where: {
                userId: userId
            },
            include: [{
                model: postgres.Card,
                required: true
            }]
        });

        for (let i = 0; i < userCameras.length; i++) {
            const cardTypeLevels = await postgres.CardTypeBoxLevel.findAll({
                where: { cardTypeId: userCameras[i].card.cardTypeId },
            });

            for (let j = 0; j < cardTypeLevels.length; j++) {
                if(levels.indexOf(cardTypeLevels[j].level) < 0)
                    levels.push(cardTypeLevels[j].level);
            }

        }

    } else {

        const boxes = await postgres.Box.findAll({
            where: {status: 'IN_AUCTION'},
            attributes: ["level"],
            group: 'level'
        })

        for (let j = 0; j < boxes.length; j++) {
            levels.push(boxes[j].level);
        }

    }

    levels.push(20);

    levels = _.orderBy(levels , (a) => parseInt(a), ['asc'])

    return response({ res, statusCode: httpStatus.OK, data: levels });
};
