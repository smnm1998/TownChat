const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const {
    errorHandler,
    notFoundHandler,
} = require('../middleware/error.middleware');

// express 앱 설정
const configureApp = () => {
    const app = express();

    // 미들웨어
    app.use(cors());
    app.use(morgan('dev'));
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    // 정적 파일 제공
    app.use(
        '/uploads',
        express.static(path.join(__dirname, '../public/uploads'))
    );

    return app;
};

module.exports = configureApp;
