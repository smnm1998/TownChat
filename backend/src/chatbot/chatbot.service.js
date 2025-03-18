const { Chatbot, Store, ChatLog, User, Op } = require('../models');
const { NotFoundError, ForbiddenError } = require('../common/errors');
const openaiService = require('../services/openai.service');
const logger = require('../services/logger');

// 점포 챗봇 생성
const createChatbot = async (storeId, chatbotData) => {
    // 점포 존재 여부 확인
    const store = await Store.findByPk(storeId);
    if (!store) {
        throw new NotFoundError('점포를 찾을 수 없습니다.');
    }

    // 이미 챗봇이 있는지 확인
    const existingChatbot = await Chatbot.findOne({
        where: { store_id: storeId }
    });

    if (existingChatbot) {
        throw new Error('이미 해당 점포에 챗봇이 등록되어 있습니다.');
    }

    // 기본 챗봇 설정
    const chatbotName = chatbotData.name || `${store.name} 챗봇`;

    // 지식 베이스 생성 (점포 정보 + 제공된 지식 베이스)
    let knowledge = `
        [점포 정보]
        점포명 : ${store.name}
        주소 : ${store.address}
        전화번호: ${store.phone || '정보 없음'}
        점주명: ${store.owner_name}
        점포 설명: ${store.description || '정보 없음'}
    `;

    // OpenAI Assistant 생성
    const asistantInstructions = `
        당신은 ${store.name}의 챗봇 도우미입니다.
        고객들에게 친절하고 정확한 정보를 제공해주세요.
        항상 공손하고 전문적인 태도를 유지하세요.
        제공된 지식 베이스 정보를 기반으로 질문에 답변하되, 모르는 내용에 대해서는 솔직하게 모른다고 말하세요.

        다음은 점포에 대한 정보입니다.
        ${knowledge}
    `;

    let assistantId = null;
    try {
        assistantId = await openaiService.createAssistant(
            chatbotName,
            assistantInstructions,
            chatbotData.model || 'gpt-4o-mini'
        );
    } catch (error) {
        logger.error('OpenAI Assistant 생성 실패: ', error);
        throw new Error('챗봇 생성 실패' + error.message);
    }

    // 챗봇 데이터베이스에 저장
    const newChatbot = await Chatbot.create({
        store_id: storeId,
        name: chatbotName,
        knowledge_base: knowledge,
        greeting_message: chatbotData.greeting_message|| '안녕하세요! 무엇을 도와드릴까요?',
        model: chatbotData.model || 'gpt-4o-mini',
        is_active: true,
        assistant_id: assistantId,
        last_updated: new Date(),
    });
    
    return newChatbot;
};

// 점포 챗봇 업데이트
const updateChatbot = async (chatbotId, userId, updateData) => {
    // 챗봇 존재 여부 확인
    const chatbot = await Chatbot.findByPk(chatbotId, {
        include: [
            {
                model: Store,
                attributes: ['id', 'name', 'owner_id', 'address', 'phone', 'description', 'owner_name'],
            },
        ],
    });

    if (!chatbot) {
        throw new NotFoundError('챗봇을 찾을 수 없습니다.');
    }

    // 점포 소유자 확인
    if (chatbot.Store.owner_id !== userId) {
        throw new ForbiddenError('해당 챗봇을 수정할 권한이 없습니다.');
    }

    // 지식 베이스 업데이트 (기본 점포 정보 + 새로운 지식 베이스)
    let newKnowledge = `
        [점포 정보]
        점포명: ${chatbot.Store.name}
        주소: ${chatbot.Store.address}
        전화번호: ${chatbot.Store.phone || '정보 없음'}
        점주명: ${chatbot.Store.owner_name}
        점포 설명: ${chatbot.Store.description || '정보 없음'}
    `;

    if (updateData.knowledge_base) {
        newKnowledge += `\n\n[상세 정보]\n${updateData.knowledge_base}`;
    }

    // OpenAI Assistant 설정 업데이트
    const assistantInstructions = `
        당신은 '${chatbot.Store.name}'의 챗봇 도우미입니다. 
        고객들에게 친절하고 정확한 정보를 제공해주세요.
        항상 공손하고 전문적인 태도를 유지하세요.
        제공된 정보를 기반으로 질문에 답변하되, 모르는 내용에 대해서는 솔직하게 모른다고 말하세요.
        
        다음은 점포에 대한 정보입니다:
        ${newKnowledge}
    `;

    try {
        // OpenAI 어시스턴트 업데이트
        await openaiService.updateAssistant(chatbot.assistant_id, {
            name: updateData.name || chatbot.name,
            instructions: assistantInstructions,
            model: updateData.model || chatbot.model,
        });
    } catch (error) {
        logger.error('OpenAI Assistant 업데이트 실패:', error);
        throw new Error('챗봇 업데이트에 실패했습니다: ' + error.message);
    }

    // 챗봇 데이터베이스 업데이트
    await chatbot.update({
        name: updateData.name || chatbot.name,
        knowledge_base: newKnowledge,
        greeting_message: updateData.greeting_message || chatbot.greeting_message,
        model: updateData.model || chatbot.model,
        last_updated: new Date(),
    });

    return await Chatbot.findByPk(chatbotId);
};

// 챗봇 삭제
const deleteChatbot = async (chatbotId, userId) => {
    // 챗봇 존재 여부
    const chatbot = await Chatbot.findByPk(chatbotId, {
        include: [
            {
                model: store,
                attributes: ['id', 'owner_id'],
            },
        ],
    });

    if (!chatbot) {
        throw new NotFoundError('챗봇을 찾을 수 없습니다.');
    }

    if (chatbot.Store.owner_id !== userId) {
        throw new ForbiddenError('해당 챗봇을 삭제할 권한이 없습니다.');
    }

    // 삭제
    try {
        if (chatbot.assistant_id) {
            await openaiService.deleteAssistant(chatbot.assistant_id);
        }
    } catch (error) {
        logger.error('assistant 삭제 실패', error); // 어시스턴트 삭제 실패해도 DB에서는 삭제 진행
    }

    // DB에서 삭제
    await chatbot.destroy();

    return true;
};

// 챗봇 활성화/비활성화 토글
const toggleChatbotActive = async (chatbotId, userId) => {
    // 챗봇 존재 여부 확인
    const chatbot = await Chatbot.findByPk(chatbotId, {
        include: [
            {
                model: Store,
                attributes: ['id', 'owner_id'],
            },
        ],
    });

    if (!chatbot) {
        throw new NotFoundError('챗봇을 찾을 수 없습니다.');
    }

    // 점포 소유자 확인
    if (chatbot.Store.owner_id !== userId) {
        throw new ForbiddenError('해당 챗봇을 수정할 권한이 없습니다.');
    }

    // 활성화 상태 토글
    await chatbot.update({
        is_active: !chatbot.is_active,
    });

    return await Chatbot.findByPk(chatbotId);
};

// 점포 ID로 챗봇 조회
const getChatbotByStoreId = async (storeId) => {
    const chatbot = await Chatbot.findOne({
        where: { store_id: storeId },
        include: [
            {
                model: Store,
                attributes: ['id', 'name', 'address', 'phone', 'description', 'owner_name'],
            },
        ],
    });

    if (!chatbot) {
        throw new NotFoundError('해당 점포의 챗봇을 찾을 수 없습니다.');
    }

    if (!chatbot.is_active) {
        throw new Error('현재 해당 챗봇은 비활성 상태입니다.');
    }

    return chatbot;
};

// 챗봇 ID로 챗봇 조회
const getChatbotById = async (chatbotId) => {
    const chatbot = await Chatbot.findByPk(chatbotId, {
        include: [
            {
                model: Store,
                attributes: ['id', 'name', 'address', 'phone', 'description', 'owner_name'],
            },
        ],
    });

    if (!chatbot) {
        throw new NotFoundError('챗봇을 찾을 수 없습니다.');
    }

    return chatbot;
};

// 챗봇 대화 실행
const chatWithChatbot = async (chatbotId, message, options = {}) => {
    const { userId = null, sessionId = null, location = null } = options;

    // 챗봇 존재 여부 및 활성화 상태 확인
    const chatbot = await Chatbot.findByPk(chatbotId);

    if (!chatbot) {
        throw new NotFoundError('챗봇을 찾을 수 없습니다.');
    }

    if (!chatbot.is_active) {
        throw new Error('현재 해당 챗봇은 비활성 상태입니다.');
    }

    // 챗봇 어시스턴트 ID 확인
    if (!chatbot.assistant_id) {
        throw new Error('챗봇 설정이 완료되지 않았습니다.');
    }

    // 새 세션 ID 생성 (제공되지 않은 경우)
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // OpenAI API를 통해 챗봇과 대화
    let chatResponse;
    try {
        chatResponse = await openaiService.chatWithAssistant(
            chatbot.assistant_id,
            message,
            currentSessionId
        );
    } catch (error) {
        logger.error('챗봇 대화 중 오류 발생:', error);
        throw new Error('챗봇 응답 생성에 실패했습니다: ' + error.message);
    }

    // 대화 로그 저장
    try {
        // 위치 정보 처리
        let locationPoint = null;
        if (location && location.latitude && location.longitude) {
            // POINT 타입으로 변환
            locationPoint = { type: 'Point', coordinates: [location.longitude, location.latitude] };
        }

        await ChatLog.create({
            chatbot_id: chatbotId,
            user_id: userId,
            session_id: currentSessionId,
            message: message,
            response: chatResponse.response,
            timestamp: new Date(),
            user_feedback: 'none',
            user_location: locationPoint,
        });
    } catch (error) {
        logger.error('대화 로그 저장 중 오류 발생:', error);
        // 로그 저장 실패는 무시하고 응답 계속 진행
    }

    return {
        response: chatResponse.response,
        sessionId: currentSessionId,
    };
};

// 대화 기록 조회
const getChatHistory = async (chatbotId, sessionId, options = {}) => {
    const { page = 1, limit = 50 } = options;
    const offset = (page - 1) * limit;

    const { count, rows } = await ChatLog.findAndCountAll({
        where: {
            chatbot_id: chatbotId,
            session_id: sessionId,
        },
        order: [['created_at', 'ASC']],
        limit,
        offset,
    });

    const totalPages = Math.ceil(count / limit);
    const pagination = {
        total: count,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
    };

    return { chatlogs: rows, pagination };
};

// 대화 세션
const getUserChatSessions = async (userId, options = {}) => {
    const { page = 1, limit = 10 } = options;
    const offset = (page - 1) * limit;

    // 고유한 세션 ID 및 최근 대화 시간 조회
    const sessions = await ChatLog.findAll({
        attributes: [
            'session_id',
            [sequelize.fn('MAX', sequelize.col('created_at')), 'last_chat'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'message_count'],
            'chatbot_id',
        ],
        where: {
            user_id: userId,
        },
        group: ['session_id', 'chatbot_id'],
        order: [[sequelize.literal('last_chat'), 'DESC']],
        limit,
        offset,
        include: [
            {
                model: Chatbot,
                attributes: ['id', 'name'],
                include: [
                    {
                        model: Store,
                        attributes: ['id', 'name'],
                    },
                ],
            },
        ],
    });

    // 총 세션 수 조회
    const countResult = await ChatLog.findAll({
        attributes: [
            [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('session_id'))), 'session_count'],
        ],
        where: {
            user_id: userId,
        },
        raw: true,
    });

    const count = countResult[0]?.session_count || 0;
    const totalPages = Math.ceil(count / limit);

    const pagination = {
        total: count,
        totalPages,
        currentPage: parseInt(page),
        limit: parseInt(limit),
    };

    return { sessions, pagination };
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