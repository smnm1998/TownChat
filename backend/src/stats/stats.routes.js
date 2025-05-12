const express = require('express');
const router = express.Router();
const statsController = require('./stats.controller');
const { authenticate } = require('../middleware/auth.middleware');

// 대시보드 통계 조회 라우트
router.get('/dashboard', authenticate, statsController.getDashboardStats);

module.exports = router;