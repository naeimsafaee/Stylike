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
        userId: {
            type: DataTypes.BIGINT,
            allowNull: false,
        },
        name: {
            type: DataTypes.STRING,
        },
        description: {
            type: DataTypes.STRING,
        },
        image: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        background: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        featured: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        links: {
            type: DataTypes.JSONB,
            defaultValue: [],
        },
        favoriteCount: {type: DataTypes.BIGINT, default: 0},
        explicitContent: {type: DataTypes.BOOLEAN, default: false},
        isFeatured: {
            type: DataTypes.BOOLEAN,
            default: false,
        },
        isVerified: {
            type: DataTypes.BOOLEAN,
            default: false,
        },
        isExplorer: {
            type: DataTypes.BOOLEAN,
            default: false,
        },
    },
    options: {
        timestamps: true,
        paranoid: true,
    },
};
