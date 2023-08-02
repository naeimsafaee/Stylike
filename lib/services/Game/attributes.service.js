const { postgres } = require("../../databases");


async function findUserDamageAttribute(cardId, userId) {
    return await postgres.UserAttribute.findOne({
        where: {
            userId: userId,
            cardId: cardId
        },
        include: [
            {
                model: postgres.Attribute,
                where: {
                    name: "DAMAGE",
                    type: "INITIAL"
                },
                required: true
            }
        ]
    });
}


module.exports = {
    findUserDamageAttribute
}