const express = require('express');
const router = express.Router();
const chatbotController = require('./chatbot.controller');
const { authenticate, isAdmin } = require('../middleware/auth.middleware');

// 인증이 필요하면서 경로가 구체적인 라우트를 먼저 배치
// 사용자의 모든 챗봇 세션 목록 조회
router.get('/user/sessions', authenticate, chatbotController.getUserChatSessions);

// 공개 API 라우트 (인증 불필요)
// 점포의 챗봇 조회
router.get('/store/:storeId', chatbotController.getChatbotByStoreId);

// 챗봇 생성 (인증 필요)
router.post('/store/:storeId', authenticate, chatbotController.createChatbot);

// 모든 챗봇 목록 조회 (관리자만)
router.get('/', authenticate, isAdmin, chatbotController.getAllChatbots);

// 아래는 ID 패턴 매칭 라우트
// 특정 챗봇과의 대화 세션 목록 조회
router.get('/:id/user-sessions', authenticate, chatbotController.getUserChatbotSessions);

// 챗봇 대화 기록 조회 (미인증 사용자도 접근 가능, 세션ID로 접근)
router.get('/:id/history', chatbotController.getChatHistory);

// 챗봇과 대화하기
router.post('/:id/chat', authenticate, chatbotController.chatWithChatbot);

// 챗봇 활성화/비활성화 토글
router.patch('/:id/toggle-active', authenticate, chatbotController.toggleChatbotActive);

// 챗봇 상세 조회
router.get('/:id', authenticate, chatbotController.getChatbotById);

// 챗봇 업데이트
router.put('/:id', authenticate, chatbotController.updateChatbot);

// 챗봇 삭제
router.delete('/:id', authenticate, chatbotController.deleteChatbot);

module.exports = router;