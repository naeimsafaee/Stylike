const { UNPROCESSABLE_ENTITY } = require("./StatusCode");

module.exports = class HumanError extends Error {
	status;
	statusCode;
	message;
	fields;

	constructor(errors, code, fields) {
		super("business logic error");

		this.status = UNPROCESSABLE_ENTITY.status;
		this.statusCode = code;
		this.lang = {
			code,
		};
		this.message = errors;
		this.fields = fields;
	}
};
