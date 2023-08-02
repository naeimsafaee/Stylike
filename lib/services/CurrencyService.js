const postgres = require("../databases/postgres");

async function GetAllCurrency() {

    const data = await postgres.Currency.findAll({
        attributes: {exclude: ["createdAt" , "updatedAt" , "deletedAt"]}
    })
    return data;
}


module.exports = {
    GetAllCurrency
};
