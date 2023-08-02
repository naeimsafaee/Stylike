const {
    httpResponse: { response },
    httpStatus
} = require("../../../../utils");
const { postgres } = require("../../../../databases");
const { HumanError, NotFoundError } = require("../../../../services/errorhandler");
const Errors = require("../../../../services/errorhandler/MessageText");

exports.show = async (req, res) => {
    const { page, limit, userId, type, competitionId } = req.query;
    const offset = (page - 1) * limit;

    let order2 = [["createdAt", "DESC"]];

    let prize = await postgres.UserPrize.sum("amount", {
        where: {
            userId: userId
        }
    });

    let tokenPrize = await postgres.UserTokenPrize.sum("amount", {
        where: {
            userId: userId
        }
    });

    const user = await postgres.User.findOne({
        where: {
            id: userId
        },
        attributes: ["name", "email", "avatar", "createdAt"],
        raw: true,
        nest: true
    });

    if (!user)
        throw new HumanError("There is no user with the details entered in the system", 400);

    user["totalPrize"] = parseFloat(prize) + parseFloat(tokenPrize);

    let posts = [];
    if (type === "post") {
        posts = await postgres.UserPost.findAndCountAll({
            where: {
                userId: userId
            },
            include: {
                model: postgres.User,
                attributes: ["id", "name", "email", "avatar", "createdAt"]
            },
            limit,
            offset,
            order: order2
        });
    }

    if (type === "camera") {
        posts = await postgres.AssignedCard.findAndCountAll({
            where: {
                userId: userId
            },
            attributes: ["cardId"],

            include: [
                {
                    model: postgres.Card,
                    attributes: ["name", "image", "chain", "serialNumber", "cardTypeId"],
                    include: [
                        {
                            model: postgres.CardType,
                            attributes: ["name"]
                        }
                    ]
                }
            ],
            limit,
            offset,
            order: order2
        });
    }

    if (type === "task") {
        const query = {};

        if (competitionId) query.competitionId = competitionId;

        posts = await postgres.MatchParticipant.findAndCountAll({
            where: query,
            attributes: { exclude: ["deletedAt"] },
            include: [
                {
                    model: postgres.Competition,
                    where: { status: { [postgres.Op.ne]: "OPEN" } },
                    attributes: { exclude: ["updatedAt", "deletedAt"] }
                },
                {
                    model: postgres.CompetitionTask,
                    attributes: { exclude: ["updatedAt", "deletedAt"] },
                    include: [
                        {
                            model: postgres.CompetitionLeague,
                            attributes: { exclude: ["updatedAt", "deletedAt"] }
                        }
                    ]
                },
                {
                    model: postgres.MatchParticipantTeam,
                    where: {
                        userId
                    },
                    attributes: []
                }
            ],
            limit,
            offset,
            order: order2
        });
    }

    return response({
        res,
        statusCode: httpStatus.OK,
        data: {
            total: posts.count,
            pageSize: limit,
            page,
            data: posts.rows,
            user
        }
    });
};

exports.index2 = async (req, res) => {
    const heatCards = await postgres.HeatCard.findAll({});

    for (let i = 0; i < heatCards.length; i++) {
        const heatCard = heatCards[i];

        const userAttribute = await postgres.UserAttribute.findOne({
            where: {
                userId: heatCard.userId,
                cardId: heatCard.cardId
            },
            include: [
                {
                    model: postgres.Attribute,
                    where: {
                        name: "DAMAGE"
                    },
                    required: true
                }
            ]
        });

        if (userAttribute) {
            await userAttribute.increment("amount", { by: heatCard.amount });
            await heatCard.update({
                amount: 0
            });
        }
    }

    /*const swaps = await postgres.SwapTransaction.findAll({
        where: {
          assetInId: 6,
          createdAt: { [postgres.Op.gte]: "2022-12-27" },
        },
      });
      const transaction = await postgres.sequelize.transaction();
      try {
        for (let i = 0; i < swaps.length; i++) {
          console.log("userId = ", swaps[i].userId, "amount =", parseFloat(swaps[i].balanceIn));
          await applyHeat2(swaps[i].userId, parseFloat(swaps[i].balanceIn), 6, transaction);
        }
        await transaction.commit();
      } catch (e) {
        console.log(e);
        await transaction.rollback();
      }*/

    return res.send("ok");
};
/*

async function applyHeat2(userId, amount, assetId, transaction) {
	const userAttribute = await postgres.UserAttribute.findOne({
		where: {
			userId: userId,
		},
		include: [
			{
				model: postgres.Attribute,
				where: {
					name: "DAMAGE",
					type: "INITIAL",
				},
				required: true,
			},
			{
				model: postgres.Card,
				required: true,
				include: [
					{
						model: postgres.CardType,
						required: true,
						where: { id: { [postgres.Op.ne]: 9 } },
					},
				],
			},
		],
		order: [
			["amount", "ASC"],
			[postgres.Card, postgres.CardType, "price", "ASC"],
		],
		transaction,
	});
	if (!userAttribute) return false;

	const lessHeatedCamera = userAttribute.card;

	let heatCard = await postgres.HeatCard.findOne({
		where: {
			userId: userId,
			cardId: lessHeatedCamera.id,
		},
		transaction,
	});

	if (!heatCard)
		heatCard = await postgres.HeatCard.create(
			{
				userId: userId,
				cardId: lessHeatedCamera.id,
			},
			{ returning: true, transaction },
		);

	await heatCard.increment("amount", { by: amount, transaction });
	// await postgres.User.increment('heatWithdraw' , {where: {id:userId} , by: amount})

	heatCard = await postgres.HeatCard.findOne({
		where: {
			id: heatCard.id,
		},
		transaction,
	});

	amount = parseFloat(heatCard.amount);

	const feeAttribute = await postgres.Attribute.findOne({
		where: {
			name: "HEAT",
			type: "FEE",
			cardTypeId: lessHeatedCamera.cardTypeId,
			mode: { [postgres.Op.lte]: amount },
		},
		order: [["mode", "DESC"]],
		transaction,
	});

	if (!feeAttribute) return false;

	let amountToUpdate = /!*parseInt(userAttribute.amount) + *!/ parseInt(feeAttribute.amount);
	// if (amountToUpdate > 100)
	//     amountToUpdate = 100;

	await userAttribute.update(
		{
			amount: amountToUpdate,
		},
		{ transaction },
	);

	return true;
}
*/
