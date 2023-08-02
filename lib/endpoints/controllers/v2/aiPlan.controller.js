const { postgres } = require("../../../databases");
const {
    httpResponse: { response },
    httpStatus
} = require("../../../utils");


async function getUserPlan(userId) {
    const userPlan = await postgres.UserPlan.findOne({
        where: {
            userId
        },
        include: [
            {
                model: postgres.Asset,
                attributes: ["name", "coin", "type"]
            },
            {
                model: postgres.Plan,
                attributes: ["name"]
            }
        ],
        attributes: { exclude: ["updatedAt", "deletedAt"] }
    });

    if (!userPlan)
        return false;

    return {
        ...userPlan.dataValues,
        hasEnded: false /*userPlan.remaining <= 0*/
    };
}

async function getPlans(req, res) {
    const userId = req.userEntity.id;
    /*
        const userCards = await postgres.AssignedCard.findAll({
            where: {
                userId: userId
            },
            include: [{
                model: postgres.Card,
                where: { cardTypeId: { [postgres.Op.ne]: 9 } },
                required: true
            }]
        });
    */

    const userPlan = await postgres.UserPlan.findOne({
        where: {
            userId
        },
        include: [
            {
                model: postgres.Asset,
                attributes: ["name", "coin", "type"]
            },
            {
                model: postgres.Plan,
                attributes: ["name"]
            }
        ],
        attributes: { exclude: ["updatedAt", "deletedAt"] }
    });

    let data1 = [];

    // if (userCards.length > 0) {
    const data = await postgres.Plan.findAll({
        where: {
            name: { [postgres.Op.notIn]: ["NFT Holders", "Free"] }
        },
        include: [
            {
                model: postgres.Asset,
                attributes: ["id", "coin", "name"]
            }
        ],
        attributes: { exclude: ["updatedAt", "deletedAt"] },
        raw: true,
        nest: true
    });

    for (let i = 0; i < data.length; i++) {
        data[i].title = "";
        if (userPlan && userPlan.planId !== data[i].id)
            data1.push(data[i]);
    }
    if (data1.length === 0)
        data1 = data;

    return response({ res, statusCode: httpStatus.OK, data: data1 });
    /*} else {
        const data = await postgres.Plan.findAndCountAll({
            where: {
                name: { [postgres.Op.ne]: "NFT Holders" }
            },
            include: [
                {
                    model: postgres.Asset,
                    attributes: ["id", "coin", "name"]
                }
            ],
            attributes: { exclude: ["updatedAt", "deletedAt"] },
            raw: true,
            nest: true
        });

        for (let i = 0; i < data.length; i++) {
            if (userPlan && userPlan.planId === data[i].id)
                data[i].isActive = true;
            else
                data[i].isActive = false;
        }

        return response({ res, statusCode: httpStatus.OK, data });
    }*/
}

async function give(req, res) {
    return res.send("Success");
    /*const users = await postgres.User.findAll({
        attributes: ["id"]
    });

    for (let u of users) {
        await postgres.UserPlan.destroy({
            where: {
                userId: u.id
            },
            force: true
        });
        const userCameras = await postgres.AssignedCard.findAll({
            where: {
                userId: u.id
            },
            attributes: ["id"],
            include: [
                {
                    model: postgres.Card,
                    attributes: ["id"],
                    required: true,
                    include: [
                        {
                            model: postgres.CardType,
                            attributes: ["name", "aiCredit"],
                            where: {
                                id: { [postgres.Op.ne]: 9 }
                            },
                            required: true
                        }
                    ]
                }
            ]
        });

        let credit = 0;
        for (let c of userCameras) {
            const aiCredit = c.dataValues.card.dataValues.cardType.dataValues.aiCredit;

            credit += parseInt(aiCredit);
        }

        if (credit) {
            const plan = await postgres.Plan.findOne({
                where: {
                    name: "NFT Holders"
                }
            });

            await new postgres.UserPlan({
                userId: u.id,
                planId: plan.id,
                assetId: plan.assetId,
                price: plan.price,
                limit: credit,
                remaining: credit,
                isUpscalable: plan.isUpscalable,
                isWatermark: plan.isWatermark,
                hasBlueTick: plan.hasBlueTick,
                maxUpscale: plan.maxUpscale
            }).save();
        } else {

            const plan = await postgres.Plan.findOne({
                where: {
                    name: "Free"
                }
            });

            await new postgres.UserPlan({
                userId: u.id,
                planId: plan.id,
                assetId: plan.assetId,
                price: plan.price,
                limit: plan.limit,
                remaining: plan.limit,
                isUpscalable: plan.isUpscalable,
                isWatermark: plan.isWatermark,
                hasBlueTick: plan.hasBlueTick,
                maxUpscale: plan.maxUpscale
            }).save();
        }
    }

    return res.send("Success");*/
}

async function styles(req, res) {
    const styles = await postgres.Styles.findAll();

    return res.send({
        data: styles
    });
}

module.exports = {
    getPlans,
    getUserPlan,
    give,
    styles
};
