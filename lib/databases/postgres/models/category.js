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
        title: {
            type: DataTypes.STRING,
            required: true,
        },
        description: {
            type: DataTypes.STRING,
            default: null,
        },
        type: {
            type: DataTypes.ENUM("COLLECTION", "CONTENT"),
        },
        icon: {
            type: DataTypes.JSONB,
            defaultValue: []
        },
        parent: {
            type: DataTypes.BIGINT,
            allowNull: true,
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
