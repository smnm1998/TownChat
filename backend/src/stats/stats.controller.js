const { Store, Chatbot, ChatLog, sequelize } = require('../models');
const { success } = require('../utils/response.utils');

// 관리자 대시보드용 통계 데이터 조회
const getDashboardStats = async (req, res, next) => {
    try {
        // 사용자 ID
        const userId = req.user.id;
        
        // 쿼리 결과를 저장할 객체
        const stats = {};
        
        // 1. 사용자의 점포 수 조회
        const storeCount = await Store.count({
            where: { owner_id: userId }
        });
        stats.storeCount = storeCount;
        
        // 2. 사용자의 챗봇 수 조회
        // 2.1 전체 챗봇 수
        const chatbotResponse = await Chatbot.findAll({
            include: [{
                model: Store,
                where: { owner_id: userId },
                attributes: ['id']
            }]
        });
        
        stats.chatbotCount = chatbotResponse.length;
        
        // 2.2 활성화된 챗봇 수
        stats.activeChatbots = chatbotResponse.filter(chatbot => chatbot.is_active).length;
        
        // 3. 대화 세션 수 조회
        // 3.1 자신의 챗봇 ID들 목록 추출
        const chatbotIds = chatbotResponse.map(chatbot => chatbot.id);
        
        // 3.2 총 대화 세션 수 조회 (중복 제거)
        if (chatbotIds.length > 0) {
            const sessionCountResult = await ChatLog.findAll({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('session_id'))), 'session_count']
                ],
                where: { 
                    chatbot_id: chatbotIds 
                },
                raw: true
            });
            
            stats.totalChatSessions = sessionCountResult[0]?.session_count || 0;
        } else {
            stats.totalChatSessions = 0;
        }
        
        return success(res, 200, '대시보드 통계 조회 성공', stats);
    } catch (error) {
        console.error('대시보드 통계 조회 오류:', error);
        next(error);
    }
};

module.exports = {
    getDashboardStats
};