const { Chatbot, Store, ChatLog, User, Op } = require('../models');
const { NotFoundError, ForbiddenError } = require('../common/errors');
const openaiService = require('../services/openai.service');
const logger = require('../utils/logger');

// 점포 챗봇 생성
// 점포 챗봇 생성 함수 수정 
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

    // 지식 베이스는 사용자가 제공한 텍스트 파일 내용만 사용
    let knowledge = chatbotData.knowledge_base || '';

    // OpenAI Assistant 생성
    const asistantInstructions = `
        당신은 ${store.name}의 챗봇 도우미입니다.
        고객들에게 친절하고 정확한 정보를 제공해주세요.
        항상 공손하고 전문적인 태도를 유지하세요.
        제공된 지식 베이스 정보를 기반으로 질문에 답변하되, 모르는 내용에 대해서는 솔직하게 모른다고 말하세요.

        다음은 지식 베이스 내용입니다:
        ${knowledge}
    `;

    // 이미 존재하는 assistant_id 사용 또는 새로 생성
    let assistantId = chatbotData.assistant_id || null;
    
    if (!assistantId) {
        try {
            assistantId = await openaiService.createAssistant(
                chatbotName,
                asistantInstructions,
                chatbotData.model || 'gpt-4o-mini'
            );
        } catch (error) {
            logger.error('OpenAI Assistant 생성 실패: ', error);
            throw new Error('챗봇 생성 실패: ' + error.message);
        }
    } else {
        logger.info(`기존 Assistant ID를 사용합니다: ${assistantId}`);
    }

    // 챗봇 데이터베이스에 저장
    const newChatbot = await Chatbot.create({
        store_id: storeId,
        name: chatbotName,
        knowledge_base: knowledge,  // 사용자가 제공한 지식 베이스만 저장
        greeting_message: chatbotData.greeting_message || '안녕하세요! 무엇을 도와드릴까요?',
        model: chatbotData.model || 'gpt-4o-mini',
        is_active: true,
        assistant_id: assistantId,
        last_updated: new Date(),
    });
    
    return newChatbot;
};

const chatbotService = require('../chatbot/chatbot.service');

// createStore 함수 수정
const createStore = async (userId, storeData, files = null) => {
    // 이미지 파일 처리
    let imageUrl = null;
    if (files && files.image && files.image[0]) {
        const imageFile = files.image[0];
        // 업로드 폴더 경로
        const uploadDir = path.join(__dirname, '../../public/uploads/stores');

        // 폴더 X -> 생성
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        // 타임스탬프 + 원본 파일명 생성
        const fileName = `${Date.now()}-${imageFile.originalname.replace(/\s/g, '_')}`;
        const filePath = path.join(uploadDir, fileName);

        // 파일 저장
        const writeFile = util.promisify(fs.writeFile);
        await writeFile(filePath, imageFile.buffer);

        // 저장된 img URL 설정
        imageUrl = `/uploads/stores/${fileName}`;
    }

    // 지식 베이스 파일 처리
    let knowledgeBase = storeData.knowledge_base || '';
    if (files && files.knowledge_base_file && files.knowledge_base_file[0]) {
        try {
            // 텍스트 파일 읽기
            const knowledgeFile = files.knowledge_base_file[0];
            const knowledgeContent = knowledgeFile.buffer.toString('utf8');
            
            // 지식 베이스 텍스트에 파일 내용 추가
            if (knowledgeContent) {
                knowledgeBase += '\n\n' + knowledgeContent;
            }
        } catch (error) {
            logger.error('지식 베이스 파일 처리 오류: ', error);
            // 오류가 발생해도 계속 진행
        }
    }

    // 점포 데이터 생성
    const newStore = await Store.create({
        ...storeData,
        owner_id: userId,
        image_url: imageUrl,
        knowledge_base: knowledgeBase,
        // assistant_id 필드가 있다면 저장 (OpenAI에서 직접 생성한 Assistant ID)
        assistant_id: storeData.assistant_id || null
    });

    // 점포 생성 후 자동으로 챗봇 생성
    try {
        logger.info(`점포 ID ${newStore.id}에 대한 챗봇 자동 생성 시작`);
        
        // 챗봇 생성에 필요한 데이터 준비
        const chatbotData = {
            name: `${newStore.name} 챗봇`,
            greeting_message: '안녕하세요! 무엇을 도와드릴까요?',
            model: 'gpt-4o-mini',
            // 점포에 assistant_id가 있으면 그것을 사용
            assistant_id: newStore.assistant_id || null
        };
        
        // 챗봇 생성 서비스 호출
        const chatbot = await chatbotService.createChatbot(newStore.id, chatbotData);
        
        logger.info(`점포 ID ${newStore.id}에 대한 챗봇이 성공적으로 생성되었습니다. 챗봇 ID: ${chatbot.id}`);
    } catch (error) {
        logger.error(`점포 ID ${newStore.id}에 대한 챗봇 자동 생성 중 오류 발생:`, error);
        // 챗봇 생성 실패해도 점포 생성은 성공으로 처리
    }

    return newStore;
}

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

    // 지식 베이스는 사용자가 제공한 내용만 사용
    let newKnowledge = updateData.knowledge_base || chatbot.knowledge_base;

    // OpenAI Assistant 설정 업데이트
    const assistantInstructions = `
        당신은 '${chatbot.Store.name}'의 챗봇 도우미입니다. 
        고객들에게 친절하고 정확한 정보를 제공해주세요.
        항상 공손하고 전문적인 태도를 유지하세요.
        제공된 정보를 기반으로 질문에 답변하되, 모르는 내용에 대해서는 솔직하게 모른다고 말하세요.
        
        다음은 지식 베이스 내용입니다:
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
        knowledge_base: newKnowledge, // 사용자가 제공한 지식 베이스만 저장
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
                model: Store,
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

    // 챗봇 삭제 
    await chatbot.destroy();
    
    // 연결된 스토어도 삭제
    if (chatbot.Store && chatbot.Store.id) {
        const store = await Store.findByPk(chatbot.Store.id);
        if (store) {
            await store.destroy();
        }
    }
    
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

const getThreadIdBySessionId = async (sessionId) => {
    try {
        const chatlog = await ChatLog.findOne({
            where: {
                session_id: sessionId,
                thread_id: { [Op.not]: null }
            },
            order: [['created_at', 'DESC']]
        });

        return chatlog ? chatlog.thread_id : null;
    } catch (error) {
        logger.error('스레드 ID 조회 실패: ', error);
        return null;
    }
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
    
    // 세션 ID로 기존 스레드 ID 조회 - 여기서 오류 발생 가능
    let threadId = null;  // 변수 초기화
    try {
        threadId = await getThreadIdBySessionId(currentSessionId);
    } catch (error) {
        logger.error('스레드 ID 조회 실패:', error);
        // 오류가 발생해도 계속 진행, 새 스레드 생성
    }
    
    // OpenAI API를 통해 챗봇과 대화
    let chatResponse;
    try {
        chatResponse = await openaiService.chatWithAssistant(
            chatbot.assistant_id,
            message,
            currentSessionId,
            threadId  // threadId 변수 전달 (null일 수도 있음)
        );
        
        // 새로운 스레드 ID 가져오기
        threadId = chatResponse.threadId;
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
            thread_id: threadId, // 스레드 ID 저장
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

// 모든 챗봇 목록 조회
const getAllChatbots = async () => {
    const chatbots = await Chatbot.findAll({
        include: [
            {
                model: Store,
                attributes: ['id', 'name', 'address', 'phone', 'description', 'owner_name'],
            },
        ],
    });
    
    return chatbots;
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
    getAllChatbots
};