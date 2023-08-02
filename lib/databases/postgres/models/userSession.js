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
		userId: {
			type: DataTypes.BIGINT,
		},
		ip: {
			type: DataTypes.STRING,
		},
		accessToken: {
			type: DataTypes.STRING,
		},
		refreshToken: {
			type: DataTypes.STRING,
		},
		accessExpiresAt: {
			type: DataTypes.DATE,
		},
		refreshExpiresAt: {
			type: DataTypes.DATE,
		},
	},
	options: {
		timestamps: true,
	},
};
