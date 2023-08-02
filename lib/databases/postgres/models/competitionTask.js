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
			type: DataTypes.STRING,
		},
		description: {
			type: DataTypes.STRING,
		},
		competitionLeagueId: {
			type: DataTypes.BIGINT,
		},
		image: {
			type: DataTypes.JSONB,
			defaultValue: [],
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
