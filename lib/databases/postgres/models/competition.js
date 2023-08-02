const { DataTypes } = require("sequelize");

module.exports = {
    attributes: {
        id: {
            type: DataTypes.BIGINT,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
            unique: true
        },
        title: {
            type: DataTypes.STRING
        },
        startAt: {
            type: DataTypes.DATEONLY
        },
        endAt: {
            type: DataTypes.DATEONLY
        },
        type: {
            type: DataTypes.ENUM("CHALLENGE"),
            defaultValue: "CHALLENGE"
        },
        prizeId: {
            type: DataTypes.BIGINT
        },
        status: {
            type: DataTypes.ENUM("OPEN", "LIVE", "COMPLETED", "INACTIVE"),
            defaultValue: "INACTIVE"
        }
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
