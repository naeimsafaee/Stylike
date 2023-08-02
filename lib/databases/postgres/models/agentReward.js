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
		userId: {
			type: DataTypes.BIGINT,
		},
		auctionId: {
			type: DataTypes.BIGINT,
		},
		competitionId: {
			type: DataTypes.BIGINT,
		},
		agentLinkId: {
			type: DataTypes.BIGINT,
			allowNull: true,
		},
		commission: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
