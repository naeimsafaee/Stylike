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
			type: DataTypes.STRING(250),
		},
		prompts: {
			type: DataTypes.TEXT,
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

/*
  assetType: {
    coin: 1,
    token: 2,
    fiat: 3,
  },
  assetStatus: {
    active: 1,
    disable: 2,
  },
*/
