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
		assignedCardId: {
			type: DataTypes.BIGINT,
			allowNull: true
		},
		userId: {
			type: DataTypes.BIGINT,
		},
		start: {
			type: DataTypes.DATEONLY,
		},
		end: {
			type: DataTypes.DATEONLY,
		},
		basePrice: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		immediatePrice: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		bookingPrice: {
			type: DataTypes.DECIMAL,
			defaultValue: 0,
		},
		type: {
			type: DataTypes.ENUM("NORMAL", "INITIAL"),
			defaultValue: "NORMAL",
		},
		status: {
			type: DataTypes.ENUM("ACTIVE", "INACTIVE", "FINISHED"),
			defaultValue: "ACTIVE",
		},
	},
	options: {
		timestamps: true,
		paranoid: true,
	},
};
