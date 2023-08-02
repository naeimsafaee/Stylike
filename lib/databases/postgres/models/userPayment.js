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
		type: {
			type: DataTypes.ENUM("DEPOSIT", "WITHDRAW", "SUBSCRIPTION"),
			defaultValue: "DEPOSIT",
		},
		userId: {
			type: DataTypes.BIGINT,
		},
		amount: {
			type: DataTypes.DECIMAL,
		},
		currency: {
			type: DataTypes.STRING,
		},
		assetId: {
			type: DataTypes.BIGINT,
		},
		assetAmount: {
			type: DataTypes.DECIMAL,
		},
		status: {
			type: DataTypes.INTEGER,
		},
		token: {
			type: DataTypes.STRING,
		},
		resNum: {
			type: DataTypes.STRING,
		},
		customerRefNum: {
			type: DataTypes.STRING,
		},
		refNum: {
			type: DataTypes.STRING,
		},
		traceNo: {
			type: DataTypes.STRING,
		},
		cardMaskPan: {
			type: DataTypes.STRING,
		},
		gateway: {
			type: DataTypes.STRING,
		},
	},
	options: {
		timestamps: true,
	},
};
