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
			type: DataTypes.STRING,
			required: true,
			index: true,
		},
		address: {
			type: DataTypes.STRING,
			index: true,
		},
		type: {
			type: DataTypes.ENUM("USERS", "COLLECTIONS", "TOKENS"),
			required: true,
		},
		typeId: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		userAvatar: {
			type: DataTypes.STRING,
			default: null,
		},
		tokenImage: {
			type: DataTypes.STRING,
			default: null,
		},
		collectionImage: {
			type: DataTypes.STRING,
			default: null,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
