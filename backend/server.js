const express = require('express');
const path = require('path');
const configureApp = require('./src/config/app');
const sequelize = require('./src/config/database');
const env = require('./src/config/environment');
const logger = require('./src/utils/logger');
const {
    errorHandler,
    notFoundHandler,
} = require('./src/middleware/error.middleware');

// 라우트 파일 임포트
const authRoutes = require('./src/auth/auth.routes');
const storeRoutes = require('./src/store/store.routes');
const chatbotRoutes = require('./src/chatbot/chatbot.routes');
const regionRoutes = require('./src/region/region.routes');

const app = configureApp();

// --- 정적 파일 제공 설정 ---
// 'public' 폴더를 웹 서버의 루트 경로에 매핑합니다.
// 이렇게 설정하면, 예를 들어 'backend/public/uploads/stores/image.jpg' 파일은
// URL '/uploads/stores/image.jpg'로 접근 가능하게 됩니다.
const publicDirectoryPath = path.join(__dirname, 'public');
app.use(express.static(publicDirectoryPath));
logger.info(`정적 파일 제공 디렉토리: ${publicDirectoryPath}`);

// (선택 사항) 특정 경로에 대한 이미지 요청 디버깅 로그 (express.static 이전에 두면 모든 /uploads 요청에 실행)
// app.use('/uploads', (req, res, next) => {
//     logger.debug(`[DEBUG] /uploads 요청: ${req.originalUrl}`);
//     logger.debug(`[DEBUG] 시도하는 파일 시스템 경로 추정: ${path.join(publicDirectoryPath, req.path)}`); // req.path 사용
//     next();
// });


// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/regions', regionRoutes);

app.get('/api', (req, res) => {
    res.json({ message: 'TownChat API', version: '1.0.0', status: 'OK' });
});

// 404 요청 처리 - API 경로가 아니고, 정적 파일로도 처리되지 않은 모든 요청
app.use(notFoundHandler);

// 글로벌 에러 핸들러
app.use(errorHandler);

const PORT = env.PORT; // 백엔드 포트

const startServer = async () => {
    try {
        await sequelize.authenticate();
        logger.info('데이터베이스 연결 성공');
        // ... (모델 동기화 등)
        app.listen(PORT, () => {
            logger.info(`서버가 http://localhost:${PORT} 에서 실행 중...`);
        });
    } catch (error) {
        logger.error('서버 시작 실패: ', error);
        process.exit(1);
    }
};

startServer();