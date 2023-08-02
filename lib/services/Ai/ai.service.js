const { postgres } = require("../../databases");


async function getAllAiSample(where = {}, limit = 10, page = 1) {
    return await postgres.AiSample.findAndCountAll({
        where: where,
        limit: limit,
        offset: (page - 1) * limit,
        include: [
            {
                model: postgres.User,
                attributes: { include: ["email", "id"] }
            }
        ],
        attributes: { exclude: ["updatedAt", "deletedAt"] },
        order: [["createdAt" , "DESC"]]
    });
}


module.exports = {
    getAllAiSample
}
