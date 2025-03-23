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
const storeRoutes = require('./src/store/store.routes'); // 추가된 임포트
const chatbotRoutes = require('./src/chatbot/chatbot.routes'); // 추가된 임포트

const app = configureApp();

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/stores', storeRoutes); // 추가된 라우트
app.use('/api/chatbots', chatbotRoutes); // 추가된 라우트

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
            await sequelize.sync({ alter: true }); // alter: true 추가
            logger.info('데이터베이스 모델 동기화 완료 (스키마 변경 포함)');
        }

        // 서버 시작
        app.listen(PORT, () => {
            logger.info(`서버가 http://localhost:${PORT} 에서 실행 중...`);
        });
    } catch (error) {
        logger.error('서버 시작 실패: ', error);
        process.exit(1);
    }
};

startServer();