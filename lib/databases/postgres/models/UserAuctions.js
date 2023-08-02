const { DataTypes } = require("sequelize");

module.exports = {
	attributes: {
		id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
			autoIncrement: true,
			allowNull: false,
			unique: true,
		},
		userId: {
			type: DataTypes.BIGINT,
		},
		assignTokenId: {
			type: DataTypes.BIGINT,
		},
		start: {
			type: DataTypes.DATEONLY,
			required: true,
		},
		end: {
			type: DataTypes.DATEONLY,
			required: true,
		},
		status: {
			type: DataTypes.ENUM("ACTIVE", "INACTIVE", "FINISH"),
			default: "ACTIVE",
		},
		basePrice: {
			type: DataTypes.DECIMAL,
			default: null,
		},
		immediatePrice: {
			type: DataTypes.DECIMAL,
			default: null,
		},
		bookingPrice: {
			type: DataTypes.DECIMAL,
			default: null,
		},
		reserveAddress: {
			type: DataTypes.STRING,
			default: null,
		},
		signature: {
			type: DataTypes.JSONB,
			select: false,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};

// UserAuctionsSchema.pre("findOne", function (next) {
// 	this.where({ deletedAt: null });
//
// 	next();
// });

