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
        eventId: {
            type: DataTypes.STRING,
        },
        userId: {
            type: DataTypes.BIGINT,
        },
        status: {
            type: DataTypes.ENUM("REQUESTED", "DOING", "PENDING" , "APPROVED" , "REJECTED"),
            defaultValue: "REQUESTED",
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
