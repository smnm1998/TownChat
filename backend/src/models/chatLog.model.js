const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ChatLog = sequelize.define(
    'ChatLog',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },

        chatbot_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Chatbots',
                key: 'id',
            },
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Users',
                key: 'id',
            },
            comment: '로그인한 사용자만 기록, 미로그인 시 null',
        },

        session_id: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: '대화 세션 식별자',
        },

        message: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        response: {
            type: DataTypes.TEXT,
            allowNull: false,
        },

        timestamp: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
        },

        user_feedback: {
            type: DataTypes.ENUM('positive', 'negative', 'none'),
            defaultValue: 'none',
        },
        
        user_location: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: true,
        },
        thread_id: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'OpenAI Assistant API 스레드 ID'
        },
    },
    {
        timestamps: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at',
    }
);

module.exports = ChatLog;