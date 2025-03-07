// 환경 변수 통합 관리
require('dotenv').config();

module.exports = {
    // 서버
    PORT: process.env.PORT,
    NODE_ENV: process.env.NODE_ENV,

    // DB
    DB_HOST: process.env.DB_HOST,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME,

    // JWT
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,

    // OpenAI assistant API
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
};
