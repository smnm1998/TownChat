const chatbotService = require('./chatbot.service');
const { validateChatbotData, validateChatMessage } = require('./chatbot.validation');
const { success, paginate } = require('../utils/response.utils');

// 챗봇 업데이트
const createChatbot = async (req, res, next) => {
    try {
        const storeId = parseInt(req.params.storeId);
        
        // 입력 데이터 검증
        validateChatbotData(req.body);
        
        // 챗봇 생성
        const newChatbot = await chatbotService.createChatbot(storeId, req.body);
        
        return success(res, 201, '챗봇이 성공적으로 생성되었습니다.', newChatbot);
    } catch (error) {
        next(error);
    }
};

// 챗봇 업데이트
const updateChatbot = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        
        // 입력 데이터 검증
        validateChatbotData(req.body);
        
        // 챗봇 업데이트
        const updatedChatbot = await chatbotService.updateChatbot(
            chatbotId,
            req.user.id,
            req.body
        );
        
        return success(res, 200, '챗봇이 성공적으로 업데이트되었습니다.', updatedChatbot);
    } catch (error) {
        next(error);
    }
};

// 챗봇 삭제
const deleteChatbot = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        
        // 챗봇 삭제
        await chatbotService.deleteChatbot(chatbotId, req.user.id);
        
        return success(res, 200, '챗봇이 성공적으로 삭제되었습니다.');
    } catch (error) {
        next(error);
    }
};

// 챗봇 활성화/비활성화 토글
const toggleChatbotActive = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        
        // 챗봇 활성화/비활성화 토글
        const updatedChatbot = await chatbotService.toggleChatbotActive(
            chatbotId,
            req.user.id
        );
        
        const statusMessage = updatedChatbot.is_active
            ? '챗봇이 활성화되었습니다.'
            : '챗봇이 비활성화되었습니다.';
        
        return success(res, 200, statusMessage, updatedChatbot);
    } catch (error) {
        next(error);
    }
};

// 챗봇 상세 조회
const getChatbotById = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        
        // 챗봇 조회
        const chatbot = await chatbotService.getChatbotById(chatbotId);
        
        return success(res, 200, '챗봇 조회 성공', chatbot);
    } catch (error) {
        next(error);
    }
};

// 점포의 챗봇 조회
const getChatbotByStoreId = async (req, res, next) => {
    try {
        const storeId = parseInt(req.params.storeId);
        
        // 점포 챗봇 조회
        const chatbot = await chatbotService.getChatbotByStoreId(storeId);
        
        return success(res, 200, '점포 챗봇 조회 성공', chatbot);
    } catch (error) {
        next(error);
    }
};

// 챗봇과 대화하기
const chatWithChatbot = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        const { message, sessionId, location } = req.body;
        
        // 메시지 검증
        validateChatMessage({ chatbot_id: chatbotId, message });
        
        // 위치 정보 검증 (제공된 경우)
        if (location && (
            !location.latitude || !location.longitude ||
            isNaN(parseFloat(location.latitude)) || isNaN(parseFloat(location.longitude))
        )) {
            return res.status(400).json({
                success: false,
                message: '유효하지 않은 위치 정보입니다.'
            });
        }
        
        // 챗봇과 대화
        const chatOptions = {
            userId: req.user ? req.user.id : null,
            sessionId,
            location
        };
        
        const response = await chatbotService.chatWithChatbot(
            chatbotId,
            message,
            chatOptions
        );
        
        return success(res, 200, '챗봇 응답 성공', response);
    } catch (error) {
        next(error);
    }
};

// 챗봇 대화 기록 조회
const getChatHistory = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        const { sessionId, page, limit } = req.query;
        
        if (!sessionId) {
            return res.status(400).json({
                success: false,
                message: '세션 ID가 필요합니다.'
            });
        }
        
        // 대화 기록 조회
        const { chatlogs, pagination } = await chatbotService.getChatHistory(
            chatbotId,
            sessionId,
            { page, limit }
        );
        
        return paginate(res, chatlogs, pagination, '대화 기록 조회 성공');
    } catch (error) {
        next(error);
    }
};

// 사용자 대화 세션 목록 조회
const getUserChatSessions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page, limit } = req.query;
        
        // 사용자 대화 세션 목록 조회
        const { sessions, pagination } = await chatbotService.getUserChatSessions(
            userId,
            { page, limit }
        );
        
        return paginate(res, sessions, pagination, '대화 세션 조회 성공');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createChatbot,
    updateChatbot,
    deleteChatbot,
    toggleChatbotActive,
    getChatbotById,
    getChatbotByStoreId,
    chatWithChatbot,
    getChatHistory,
    getUserChatSessions,
};