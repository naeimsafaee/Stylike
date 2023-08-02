const { postgres } = require("./../databases");


async function all(where = {}, limit = 10, page = 1 , where2 = {}) {
    return await postgres.Request.findAndCountAll({
        where: where,
        limit,
        offset: (page - 1) * limit,
        attributes: { exclude: ["deletedAt"] },
        include: [{
            model: postgres.User,
            where:where2,
            required:true,
            attributes: { include: ["email", "id"] }
        }, {
            model: postgres.Doc
        }],
        order: [["createdAt" , "ASC"]]
    });
}

async function read(id) {
    return await postgres.Request.findOne({
        where: { id },
        attributes: { exclude: ["deletedAt"] },
        include: [{
            model: postgres.Doc
        }]
    });
}

async function create(userId) {
    return await postgres.Request.create({
        eventId: makeId(12),
        status: "REQUESTED",
        userId: userId
    }, { returning: true });
}

async function edit(id, data) {
    let request = await read(id);
    if (request)
        await request.update(data);

    request = await read(id);

    return request;
}

async function find(where , order= []) {
    return await postgres.Request.findOne({
        where: where,
        attributes: { exclude: ["deletedAt"] },
        order: order
    });
}


function makeId(length) {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
        counter += 1;
    }
    return result;
}

module.exports = {
    create,
    all,
    edit,
    read,
    find
};
