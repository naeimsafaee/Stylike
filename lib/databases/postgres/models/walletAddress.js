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
		tatumId: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		clientId: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		userId: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		index: {
			type: DataTypes.BIGINT,
			allowNull: false,
		},
		currency: {
			type: DataTypes.STRING,
		},
		address: {
			type: DataTypes.STRING,
			allowNull: false,
		},
		attr: {
			type: DataTypes.STRING,
		},
		balance: {
			type: DataTypes.DECIMAL,
			allowNull: false,
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
