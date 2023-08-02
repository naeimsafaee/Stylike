
const { DataTypes } = require("sequelize");
const moment = require("moment");

module.exports = {
	attributes: {
		id: {
			type: DataTypes.BIGINT,
			primaryKey: true,
			autoIncrement: true,
			allowNull: false,
			unique: true,
		},
		totalUsers: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		newUser: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		income: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		visit: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		kyc: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		withdraw: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		deposit: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		volume: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		trades: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		buyAmount: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		sellAmount: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		irrBalance: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		euroBalance: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		usdBalance: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		trBalance: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
