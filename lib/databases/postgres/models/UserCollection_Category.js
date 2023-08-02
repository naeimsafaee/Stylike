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
        UserCollectionId: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        categoryId: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
