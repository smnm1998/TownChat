const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Chatbot = sequelize.define (
    'Chatbot',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        store_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Stores',
                key: 'id',
            },
        },

        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            defaultValue: '매장 챗봇',
        },

        knowledge_base: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '챗봇 지식 베이스 텍스트',
        },

        greeting_message: {
            type: DataTypes.STRING(255),
            allowNull: true,
            defaultValue: '안녕하세요! 무엇을 도와드릴까요?',
        },

        model: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'gpt-4o-mini',
        },

        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },

        assistant_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: 'OpenAI Assistant API ID',
        },

        last_updated: {
            type: DataTypes.DATE,
            allowNull: true,
        },
    },
    {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

module.exports = Chatbot;