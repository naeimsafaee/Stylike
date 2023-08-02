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
		name: {
			type: DataTypes.STRING(64),
		},
		text: {
			type: DataTypes.TEXT,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
