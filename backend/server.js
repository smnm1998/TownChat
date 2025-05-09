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

// app 생성 먼저
const app = configureApp();

// 정적 파일 제공 설정 수정
// 1. public 디렉토리 전체를 정적 파일로 제공 (추가)
app.use(express.static(path.join(__dirname, 'public')));

// 2. uploads 경로 설정 수정
// 기존: app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));
// 수정:
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// 3. 이미지 경로에 대한 디버깅 로그 추가
app.use('/uploads', (req, res, next) => {
    logger.debug(`이미지 요청: ${req.url}`);
    logger.debug(`이미지 경로: ${path.join(__dirname, 'public/uploads', req.url)}`);
    // 파일 존재 여부 확인 로직을 추가할 수 있음
    next();
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes);
app.use('/api/chatbots', chatbotRoutes);
app.use('/api/regions', regionRoutes);

// API 루트 경로
app.get('/api', (req, res) => {
    res.json({
        message: 'TownChat API',
        version: '1.0.0',
        status: 'OK',
    });
});

// 404 요청 처리
app.use(notFoundHandler);

// 글로벌 에러 핸들러
app.use(errorHandler);

// 서버 시작
const PORT = env.PORT || 5000;

const startServer = async () => {
    try {
        // DB 연결 확인
        await sequelize.authenticate();
        logger.info('데이터베이스 연결 성공');
        
        // 모델 동기화
        if (env.NODE_ENV === 'development') {
            logger.info('데이터베이스 모델 동기화 완료 (스키마 변경 포함)');
        }
        
        // 서버 시작
        app.listen(PORT, () => {
            logger.info(`서버가 http://localhost:${PORT} 에서 실행 중...`);
            logger.info(`정적 파일 경로: ${path.join(__dirname, 'public')}`);
            logger.info(`업로드 파일 경로: ${path.join(__dirname, 'public/uploads')}`);
        });
    } catch (error) {
        logger.error('서버 시작 실패: ', error);
        process.exit(1);
    }
};

startServer();