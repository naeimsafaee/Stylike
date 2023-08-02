const { NotFoundError } = require("./errorhandler");
const Errors = require("./errorhandler/MessageText");
const postgres = require("../databases/postgres");

function getAllCountry(data) {
    return new Promise(async (resolve, reject) => {
        const { page, limit, sort, order, name } = data;

        const query = {};

        const offset = (page - 1) * limit;

        if (name) query.countryName = { [postgres.Op.iLike]: `%${name}%` };

        const items = await postgres.Country.findAll({
            where: query,
            order: [[sort, order]]
        });

        return resolve({
            total: items.length,
            pageSize: limit,
            page,
            data: items
        });
    });
}

function getOneCountry(id) {
    return new Promise(async (resolve, reject) => {
        const item = await postgres.Country.findByPk(id);

        if (!item)
            return reject(new NotFoundError(Errors.COUNTRY_NOT_FOUND.MESSAGE, Errors.COUNTRY_NOT_FOUND.CODE, { id }));

        return resolve(item);
    });
}

module.exports = {
    getAllCountry,
    getOneCountry
};
