const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// 회원가입 라우트
router.post('/signup', authController.signUp);

// 로그인 라우트
router.post('/signin', authController.signIn);

// 토큰 갱신 라우트
router.post('/refresh-token', authController.refreshToken);

// 로그아웃 라우트
router.post('/signout', authenticate, authController.signOut);

// 현재 인증된 사용자 정보 조회 라우트
router.get('/me', authenticate, authController.getCurrentUser);

module.exports = router;
