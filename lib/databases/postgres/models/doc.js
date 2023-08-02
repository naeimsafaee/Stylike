const {DataTypes} = require("sequelize");

module.exports = {
    attributes: {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            unique: true,
        },
        field: {
            type: DataTypes.STRING,
        },
        value: {
            type: DataTypes.STRING,
        },
        requestId: {
            type: DataTypes.BIGINT,
        },
        status: {
            type: DataTypes.ENUM("STRING", "IMAGE", "VIDEO"),
            defaultValue: "STRING",
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};

/*
  userLevel: {
	normal: 1,
	vip: 2,
  },
  userStatus: {
	active: 1,
	pending: 2,
	disabled: 3,
  },
*/
