const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Province = sequelize.define(
    'Province',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
        },
        code: {
            type: DataTypes.STRING(10),
            allowNull: false,
            unique: true,
        },
    },
    {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

module.exports = Province;