const postgres = require("../../databases/postgres");

async function GetAllCurrency() {

    const data = await postgres.Currency.find({})
    return data;
}


module.exports = {
    GetAllCurrency
};
