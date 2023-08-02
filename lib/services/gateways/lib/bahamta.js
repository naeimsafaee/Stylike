

const paymentConfig = require("config").get("gateways.bahamta");
const axios = require("axios");

class Bahamta {
	/**
	 *
	 * @param {*} amount
	 */
	constructor(amount = 10000) {
		this.amount = amount;
		this.request = axios.create({
			baseURL: paymentConfig.endPoint,
		});

		this.request.defaults.headers["Content-Type"] = "application/json";
		this.request.defaults.headers["Accept"] = "*/*";
	}

	/**
	 * The service receives a "receipt of money" request from the site and, after verifying it, returns an Internet address that, if the customer is directed to that address, can pay the desired amount.
	 * @param {*} reference
	 * @param {*} amount_irr
	 * @returns
	 */
	createRequest(reference, amount_irr) {
		return new Promise((resolve, reject) => {
			this.request
				.get("create_request", {
					params: {
						api_key: paymentConfig.apiKey,
						reference,
						amount_irr,
						callback_url: paymentConfig.redirectUrl,
					},
				})
				.then((res) => {
					let data = res.data;

					if (!data.ok) return reject(data.error);

					resolve(data.result);
				})
				.catch((e) => reject(e));
		});
	}

	/**
	 * This service will correctly inquire about the announced result from webpay. In this request, the reference parameters and amount_irr are the same values ​​that were sent to the webpay when the request was made.
	 * @param {*} reference
	 * @param {*} amount_irr
	 * @returns
	 */
	confirmPayment(reference, amount_irr) {
		return new Promise((resolve, reject) => {
			this.request
				.get("confirm_payment", {
					params: {
						api_key: paymentConfig.apiKey,
						reference,
						amount_irr,
					},
				})
				.then((res) => {
					let data = res.data;

					if (!data.ok) return reject(data.error);

					resolve(data.result);
				})
				.catch((e) => reject(e));
		});
	}
}

module.exports = Bahamta;
