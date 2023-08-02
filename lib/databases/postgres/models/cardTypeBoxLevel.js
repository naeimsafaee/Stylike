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
        cardTypeId: {
            type: DataTypes.BIGINT
        },
        level: {
            type: DataTypes.ENUM("1", "2", "3", "4", "5"),
            defaultValue: "1"
        }
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
