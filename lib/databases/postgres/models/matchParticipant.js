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
		participantTeamId: {
			type: DataTypes.BIGINT,
		},
		competitionTaskId: {
			type: DataTypes.BIGINT,
		},
		competitionId: {
			type: DataTypes.BIGINT,
		},
		score: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		image: {
			type: DataTypes.JSONB,
			defaultValue: {},
			allowNull: false,
		},
		status: {
			type: DataTypes.ENUM("OPEN", "CLOSE"),
			defaultValue: "OPEN",
		},
		lenses: {
			type: DataTypes.JSON,
			allowNull: true,
		},
		inFeed: {
			type: DataTypes.BOOLEAN,
			defaultValue: true,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
