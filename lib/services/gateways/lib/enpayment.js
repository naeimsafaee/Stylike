
const paymentConfig = require("config").get("gateways.enpayment");
const axios = require("axios");

/**
 *
 */
class Enpayment {
	/**
	 *
	 * @param amount
	 */
	constructor(amount = 1000) {
		this.amount = amount;
		this.request = axios.create({
			baseURL: paymentConfig.endPoint,
		});

		this.request.defaults.headers["Content-Type"] = "application/json";
		this.request.defaults.headers["Accept"] = "*/*";
	}

	/**
	 * This service must be called before other services can be called.
	 * In response, a string is received as a SessionId, and this value must be sent when calling other services
	 * @returns {Promise<this>}
	 */
	merchantLogin() {
		let self = this;
		return new Promise((resolve, reject) => {
			this.request
				.post("merchantLogin/", {
					UserName: paymentConfig.username,
					Password: paymentConfig.password,
				})
				.then((res) => {
					let data = res.data;

					if (data.Result !== "erSucceed") return reject(data.Result);

					self.sessionId = data.SessionId;

					resolve(self);
				})
				.catch((e) => reject(e));
		});
	}

	/**
	 * This service is used to exit and expire the user's session
	 * @returns {Promise<unknown>}
	 */
	merchantLogout() {
		return new Promise((resolve, reject) => {
			this.request
				.post("merchantLogout/", {
					SessionId: this.sessionId,
				})
				.then((res) => {
					if (res.data.Result !== "erSucceed") return reject(res.data.Result);

					resolve(true);
				})
				.catch((e) => reject(e));
		});
	}

	/**
	 * This service is used to generate data for signing and the acceptor obtains the data required for signing by providing transaction information.
	 * @param resNum
	 * @param TransType (EN_GOODS | EN_BILL_PAY | EN_VOUCHER | EN_TOP_UP)
	 * @returns {Promise<unknown>}
	 */
	generateTransactionDataToSign(resNum, TransType = "EN_GOODS") {
		let self = this;
		return new Promise((resolve, reject) => {
			this.request
				.post("generateTransactionDataToSign/", {
					WSContext: { SessionId: self.sessionId },
					TransType: TransType,
					ReserveNum: resNum,
					Amount: this.amount,
					RedirectUrl: paymentConfig.redirectUrl,
				})
				.then((res) => {
					let data = res.data;

					if (data.Result !== "erSucceed") return reject(data.Result);

					self.dataToSign = data.DataToSign;

					self.uniqueId = data.UniqueId;

					resolve(self);
				})
				.catch((e) => reject(e));
		});
	}

	/**
	 * This service is used to obtain tokens for each transaction
	 * @returns {Promise<this>}
	 */
	generateSignedDataToken() {
		let self = this;
		return new Promise(async (resolve, reject) => {
			this.request
				.post("generateSignedDataToken/", {
					WSContext: { SessionId: this.sessionId },
					Signature: self.dataToSign,
					UniqueId: this.uniqueId,
				})
				.then((res) => {
					let data = res.data;

					if (data.Result !== "erSucceed") return reject(data.Result);

					this.token = data.Token;

					this.expirationDate = data.ExpirationDate;

					resolve(self);
				})
				.catch((e) => reject(e));
		});
	}

	/**
	 * After receiving confirmation from the gateway, this service is used to confirm the transaction
	 * @param token
	 * @param refNum
	 * @returns {Promise<unknown>}
	 */
	verifyMerchantTrans(token, refNum) {
		return new Promise((resolve, reject) => {
			this.request
				.post("verifyMerchantTrans/", {
					WSContext: { SessionId: this.sessionId },
					Token: token,
					RefNum: refNum,
				})
				.then((res) => {
					let data = res.data;

					if (data.Result !== "erSucceed") return reject(data.Result);

					resolve(data);
				})
				.catch((e) => reject(e));
		});
	}

	/**
	 * This service is used to inquire tokens
	 * You can use this service to inquire about the payment status related to this token.
	 * @param token
	 * @returns {Promise<unknown>}
	 */
	inquiryMerchantToken(token) {
		return new Promise((resolve, reject) => {
			this.request
				.post("inquiryMerchantToken/", {
					WSContext: { SessionId: this.sessionId },
					Token: token,
				})
				.then((res) => {
					let data = res.data;

					if (data.Result !== "erSucceed") return reject(data.Result);

					resolve(data);
				})
				.catch((e) => reject(e));
		});
	}

	getToken() {
		return {
			token: this.token,
			expirationDate: this.expirationDate,
		};
	}
}

module.exports = Enpayment;
