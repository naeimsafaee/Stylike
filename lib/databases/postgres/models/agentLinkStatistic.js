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
		agentLinkId: {
			type: DataTypes.BIGINT,
		},
		// user whom registered with link
		userId: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
