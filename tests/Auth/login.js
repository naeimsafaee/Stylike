const { postgres } = require("../../lib/databases");
const { login: managerLogin } = require("../../lib/services/manager.service");
const { login: userLogin } = require("../../lib/services/user.service");
// const assert = require("assert");
const chai = require("chai");
const chaiHttp = require("chai-http");
const server = require("../../lib/app");
const assert = chai.assert;

chai.use(chaiHttp);

const data = require("./signup");

// const data = [
// 	{
// 		name: "Maria-Jose",
// 		mobile: "+98(020)885 7580",
// 		email: "omer+anyango@gmail.com",
// 		password: "D035EUJ0gkzxvwK!",
// 		countryId: 94,
// 	},
// 	// {
// 	// 	name: "Anong",
// 	// 	mobile: "+98(741)540 6552",
// 	// 	email: "steven_herrera353@gmail.com",
// 	// 	password: "D9KzohNUSxDXSpp!",
// 	// 	countryId: 94,
// 	// },
// ];

const users = [];
const tokens = [];

it("user login success", function (done) {
	for (let i = 0; i < data.length; i++) {
		setTimeout(() => {
			userLogin(null, data[i].email, data[i].password)
				.then((res) => {
					assert.isObject(res.accessToken, "Access Token should be an object");
					assert.isObject(res.refreshToken, "Refresh Toekn should be an object");
					assert.typeOf(res.accessToken.token, "string", "token should be a string");
					assert.typeOf(res.accessToken.expiresAt, "number", "expiresAt should be a number");
					assert.typeOf(res.refreshToken.token, "string", "token should be a string");
					assert.typeOf(res.refreshToken.expiresAt, "number", "expiresAt should be a number");
					tokens.push({
						accessToken: { ...res.accessToken },
						refreshToken: { ...res.refreshToken },
					});

					if (i === data.length - 1) {
						setTimeout(done, 3000);
					}
				})
				.catch((e) => new Error(e));
		}, 3000 * i);
	}
});

// This is necessary for next steps of testing
it("get user info", function (done) {
	for (let i = 0; i < data.length; i++) {
		setTimeout(() => {
			chai.request(server)
				.get("/api/v2/user")
				.set("authorization", `Bearer ${tokens[i].accessToken.token}`)
				.end((err, res) => {
					assert.equal(res.status, 200);
					users.push(res.body.data);
					users[i].tokens = { ...tokens[i] };
					if (i === data.length - 1) {
						setTimeout(done, 3000);
					}
				});
		}, 3000 * i);
	}
});

it("user login wrong email", function (done) {
	userLogin(null, "email@gmail.com", data[0].password)
		.then(() => {
			done(new Error("User logged in with wrong email"));
		})
		.catch((e) => done());
});

it("user login wrong password", function (done) {
	userLogin(null, data[0].email, data[0].password + "0")
		.then(() => {
			done(new Error("User logged in with wrong password"));
		})
		.catch((e) => done());
});

it("user login wrong email & password", function (done) {
	userLogin("email@gmail.com", data[0].password + "0")
		.then(() => {
			done(new Error("User logged in with wrong email and password"));
		})
		.catch((e) => done());
});

// it("manager login success", function (done) {
//     managerLogin()
// 		.then(() => {
// 			done();
// 		})
// 		.catch((e) => done(new Error(e)));
// });

// it("manager login wrong email", function (done) {
//     managerLogin()
// 		.then(() => {
// 			done(new Error('User logged in with wrong email'));
// 		})
// 		.catch((e) => done());
// });

// it("manager login wrong password", function (done) {
//     managerLogin()
// 		.then(() => {
// 			done(new Error('User logged in with wrong password'));
// 		})
// 		.catch((e) => done());
// });

// it("manager login wrong email & password", function (done) {
//     managerLogin()
// 		.then(() => {
// 			done(new Error('User logged in with wrong email and password'));
// 		})
// 		.catch((e) => done());
// });

module.exports = users;
