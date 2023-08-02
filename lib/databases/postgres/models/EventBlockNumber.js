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
        key: {
            type: DataTypes.STRING,
        },
        value: DataTypes.STRING,
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
