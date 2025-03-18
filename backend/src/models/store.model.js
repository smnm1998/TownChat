const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Store = sequelize.define(
    'Store',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },

        address: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: true,
            },
        },

        phone: {
            type: DataTypes.STRING(20),
            allowNull: true
        },

        description: {
            type: DataTypes.TEXT,
            allowNull: true,
        },

        owner_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },

        owner_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
        },

        image_url: {
            type: DataTypes.STRING(255),
            allowNull: true,
        },

        latitude: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },

        longitude: {
            type: DataTypes.FLOAT,
            allowNull: true,
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },

        owner_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            reference: {
                model: 'Users',
                key: 'id',
            },
        },

        assistant_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: 'OpenAI Assistant API 식별자',
        },
    },
    {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

module.exports = Store;