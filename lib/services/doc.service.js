const { postgres } = require("./../databases");


async function create(data) {
    return await postgres.Doc.create({ ...data }, { returning: true });
}


module.exports = {
    create,
};
