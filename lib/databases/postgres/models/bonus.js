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
		title: {
			type: DataTypes.STRING(32),
		},
		description: {
			type: DataTypes.STRING,
		},
		firstMember: {
			type: DataTypes.INTEGER,
		},
		cardTypeId: {
			type: DataTypes.BIGINT,
		},
		cardNumber: {
			type: DataTypes.INTEGER,
		},
		tokenAmount: {
			type: DataTypes.INTEGER,
		},
		startAt: {
			type: DataTypes.DATE,
		},
		endAt: {
			type: DataTypes.DATE,
		},
		type: {
			type: DataTypes.ENUM("REGISTER", "CHALLENGE"),
			defaultValue: "CHALLENGE",
		},
		status: {
			type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
			defaultValue: "ACTIVE",
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
