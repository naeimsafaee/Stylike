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
		agentId: {
			type: DataTypes.BIGINT,
		},
		name: {
			type: DataTypes.STRING(250),
		},
		code: {
			type: DataTypes.STRING(250),
		},
		clickCount: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		completedCount: {
			type: DataTypes.INTEGER,
			defaultValue: 0,
		},
		type: {
			type: DataTypes.ENUM("REGISTER"),
			defaultValue: "REGISTER",
		},
		url: {
			type: DataTypes.STRING(250),
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
