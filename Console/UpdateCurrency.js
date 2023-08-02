const { postgres } = require("../lib/databases");
const { default: axios } = require("axios");

exports.updateCurrency = async () => {
	if (process.env.NODE_ENV === "development") return;

	console.log("updating currencies");
	/* todo: implement queue

    const currencies = await postgres.Currency.findAll({});

    for (let i = 0; i < currencies.length; i++) {

        const currency = currencies[i];

        const data = await axios.get(`https://api.apilayer.com/currency_data/convert?from=${currency.from}&to=${currency.to}&amount=1`, {
            headers: {
                apikey: "3jYI2RPJbwp2UXIO8LYMcfQIxIzEdpbh"
            }
        });

        await postgres.Currency.update({ rate: data.data.result }, { where: { id: currency.id } });

    }*/
};
