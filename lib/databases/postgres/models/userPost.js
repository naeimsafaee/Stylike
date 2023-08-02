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
        userId: {
            type: DataTypes.BIGINT
        },
        caption: {
            type: DataTypes.TEXT,
            allowNull: true,
        },
        file: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
    },
    options: {
        timestamps: true,
        paranoid: true
    }
};
