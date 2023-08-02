const { postgres } = require("../../lib/databases");
const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../../lib/app");
const assert = chai.assert;
const { randFirstName, randPhoneNumber, randPassword, randEmail } = require("@ngneat/falso");

chai.use(chaiHttp);

const data = [];
const numUsers = 3;

it("user signup success", function (done) {
	for (let i = 0; i < numUsers; i++) {
		data.push({
			name: randFirstName(),
			mobile: randPhoneNumber({ countryCode: "IR" }),
			email: randEmail({ provider: "gmail", suffix: "com" }),
			password: `${randPassword()}!12`,
			referredCode: "daedeb82",
			countryId: 94,
		});
	}

	for (let i = 0; i < data.length; i++) {
		setTimeout(() => {
			chai.request(server)
				.post("/api/user/signup")
				.send(data[i])
				.end((err, res) => {
					assert.equal(res.status, 200);
					assert.typeOf(res.body.data.token, "string", "token should be a string");
					assert.typeOf(res.body.data.otpCode, "string", "otpCode should be a string");
					const data = { token: res.body.data.token, code: res.body.data.otpCode };
					chai.request(server)
						.post("/api/user/verify")
						.send(data)
						.end((err, res) => {
							assert.equal(res.status, 200);
							assert.isObject(res.body.data.accessToken, "Access Token should be an object");
							assert.isObject(res.body.data.refreshToken, "Refresh Toekn should be an object");
							assert.typeOf(res.body.data.accessToken.token, "string", "token should be a string");
							assert.typeOf(
								res.body.data.accessToken.expiresAt,
								"number",
								"expiresAt should be a number",
							);
							assert.typeOf(res.body.data.refreshToken.token, "string", "token should be a string");
							assert.typeOf(
								res.body.data.refreshToken.expiresAt,
								"number",
								"expiresAt should be a number",
							);
							if (i === numUsers - 1) {
								setTimeout(done, 3000);
							}
						});
				});
		}, 3000 * i);
	}
});

it("user signup wrong email format", function (done) {
	const data = {
		name: randFirstName(),
		mobile: randPhoneNumber({ countryCode: "IR" }),
		email: "email.com",
		password: `${randPassword()}!12`,
		countryId: 94,
	};

	chai.request(server)
		.post("/api/user/signup")
		.send(data)
		.end((err, res) => {
			assert.equal(res.status, 400);
			setTimeout(done, 3000);
		});
});

it("user signup wrong password format", function (done) {
	const data = {
		name: randFirstName(),
		mobile: randPhoneNumber({ countryCode: "IR" }),
		email: randEmail({ provider: "gmail", suffix: "com" }),
		password: `123456`,
		countryId: 94,
	};

	chai.request(server)
		.post("/api/user/signup")
		.send(data)
		.end((err, res) => {
			assert.equal(res.status, 400);
			setTimeout(done, 3000);
		});
});

it("user signup with duplicate email", function (done) {
	const data = {
		name: randFirstName(),
		mobile: randPhoneNumber({ countryCode: "IR" }),
		email: "mehrdadesh45020.dev@gmail.com",
		password: `${randPassword()}!12`,
		countryId: 94,
	};

	chai.request(server)
		.post("/api/user/signup")
		.send(data)
		.end((err, res) => {
			assert.equal(res.status, 409);
			setTimeout(done, 3000);
		});
});

it("user signup without email", function (done) {
	const data = {
		name: randFirstName(),
		mobile: randPhoneNumber({ countryCode: "IR" }),
		password: `${randPassword()}!12`,
		countryId: 94,
	};

	chai.request(server)
		.post("/api/user/signup")
		.send(data)
		.end((err, res) => {
			assert.equal(res.status, 400);
			setTimeout(done, 3000);
		});
});

it("user signup without password", function (done) {
	const data = {
		name: randFirstName(),
		mobile: randPhoneNumber({ countryCode: "IR" }),
		email: randEmail({ provider: "gmail", suffix: "com" }),
		countryId: 94,
	};

	chai.request(server)
		.post("/api/user/signup")
		.send(data)
		.end((err, res) => {
			assert.equal(res.status, 400);
			setTimeout(done, 3000);
		});
});

module.exports = data;
