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
		totalAmount: {
			type: DataTypes.DECIMAL,
			default: 0,
		},
		totalUsers: {
			type: DataTypes.INTEGER,
			default: 0,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
