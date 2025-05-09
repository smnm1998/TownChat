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
        where: { store_id: storeId },
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
        knowledge_base: knowledge, // 사용자가 제공한 지식 베이스만 저장
        greeting_message:
            chatbotData.greeting_message || '안녕하세요! 무엇을 도와드릴까요?',
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
        const fileName = `${Date.now()}-${imageFile.originalname.replace(
            /\s/g,
            '_'
        )}`;
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
        assistant_id: storeData.assistant_id || null,
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
            assistant_id: newStore.assistant_id || null,
        };

        // 챗봇 생성 서비스 호출
        const chatbot = await chatbotService.createChatbot(
            newStore.id,
            chatbotData
        );

        logger.info(
            `점포 ID ${newStore.id}에 대한 챗봇이 성공적으로 생성되었습니다. 챗봇 ID: ${chatbot.id}`
        );
    } catch (error) {
        logger.error(
            `점포 ID ${newStore.id}에 대한 챗봇 자동 생성 중 오류 발생:`,
            error
        );
        // 챗봇 생성 실패해도 점포 생성은 성공으로 처리
    }

    return newStore;
};

const updateChatbot = async (chatbotId, userId, updateData) => {
    // 챗봇 존재 여부 확인
    const chatbot = await Chatbot.findByPk(chatbotId, {
        include: [
            {
                model: Store,
                attributes: [
                    'id',
                    'name',
                    'owner_id',
                    'address',
                    'phone',
                    'description',
                    'owner_name',
                ],
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
        greeting_message:
            updateData.greeting_message || chatbot.greeting_message,
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
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'description',
                    'owner_name',
                ],
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
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'description',
                    'owner_name',
                ],
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
                thread_id: { [Op.not]: null },
            },
            order: [['created_at', 'DESC']],
        });

        return chatlog ? chatlog.thread_id : null;
    } catch (error) {
        logger.error('스레드 ID 조회 실패: ', error);
        return null;
    }
};

const chatWithChatbot = async (chatbotId, message, options = {}) => {
    // 옵션에서 필요한 값들 추출
    const { userId = null, sessionId = null, threadId = null, location = null } = options;

    // 디버깅 로그 추가
    console.log('[chatWithChatbot] 함수 호출:');
    console.log('- chatbotId:', chatbotId);
    console.log('- userId:', userId);
    console.log('- sessionId:', sessionId);
    console.log('- threadId:', threadId); // 명시적으로 threadId 로그 추가

    // 챗봇 존재 여부 및 활성화 상태 확인
    const chatbot = await Chatbot.findByPk(chatbotId, {
        include: [
            {
                model: Store,
                attributes: ['id', 'name', 'description', 'owner_name'],
            },
        ],
    });

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

    logger.info(`Calling OpenAI with Assistant ID: ${chatbot.assistant_id}`);

    // 새 세션 ID 생성 (제공되지 않은 경우)
    const currentSessionId =
        sessionId ||
        `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // 클라이언트에서 전달받은 thread_id를 우선적으로 사용
    let currentThreadId = threadId;
    
    // thread_id가 없는 경우에만 세션에서 조회
    if (!currentThreadId) {
        try {
            currentThreadId = await getThreadIdBySessionId(currentSessionId);
            console.log('[chatWithChatbot] 세션에서 조회된 스레드 ID:', currentThreadId);
        } catch (error) {
            logger.error('스레드 ID 조회 실패:', error);
        }
    } else {
        console.log('[chatWithChatbot] 클라이언트에서 전달받은 스레드 ID 사용:', currentThreadId);
    }

    // OpenAI API를 통해 챗봇과 대화
    let chatResponse;
    try {
        // 챗봇 어시스턴트 ID 확인 - 없으면 오류 발생
        if (!chatbot.assistant_id) {
            logger.error('Assistant ID가 없습니다. 관리자에게 문의하세요.');
            throw new Error('챗봇 설정이 올바르지 않습니다. 관리자에게 문의하세요.');
        }
    
        chatResponse = await openaiService.chatWithAssistant(
            chatbot.assistant_id,
            message,
            currentSessionId,
            currentThreadId
        );
    
        // 새로운 스레드 ID 가져오기
        currentThreadId = chatResponse.threadId;
        console.log('[chatWithChatbot] 응답 후 스레드 ID:', currentThreadId);
        
        // 응답 정제 - 더 엄격한 처리
        if (chatResponse && typeof chatResponse.response === 'string') {
            // 1. undefined 관련 텍스트 제거 (단독 또는 다른 문자와 결합된 형태)
            chatResponse.response = chatResponse.response
                .replace(/undefined/g, '')  // 'undefined' 제거
                .replace(/\.\s*undefined/g, '.') // '.undefined' 제거
                .replace(/\,\s*undefined/g, ',') // ',undefined' 제거
                .replace(/\?\s*undefined/g, '?') // '?undefined' 제거
                .replace(/\!\s*undefined/g, '!') // '!undefined' 제거
                .replace(/\:\s*undefined/g, ':') // ':undefined' 제거
                .trim();
            
            // 2. 특수 마크업이나 포맷팅 코드 제거
            chatResponse.response = chatResponse.response
                .replace(/\[\d+:\d+\s*\+?\s*[^\]]*\]/g, '') // [8:0 + 피오르틸러츠] 같은 패턴 제거
                .replace(/\[.*?\]/g, '') // 모든 대괄호 내용 제거
                .trim();
            
            // 3. 연속된 공백, 새줄 정리
            chatResponse.response = chatResponse.response
                .replace(/\s+/g, ' ')  // 연속된 공백을 하나로
                .replace(/\n\s*\n/g, '\n') // 빈 줄 제거
                .trim();
            
            // 4. 응답이 비어있는 경우 기본 메시지 설정
            if (!chatResponse.response) {
                chatResponse.response = '죄송합니다. 응답을 생성하는 중 문제가 발생했습니다.';
            }
        } else {
            // 응답이 없는 경우 기본 메시지 설정
            chatResponse = {
                ...chatResponse,
                response: '죄송합니다. 응답을 생성할 수 없습니다.',
                threadId: currentThreadId,
                sessionId: currentSessionId
            };
        }
        
        // 로깅을 통한 검증
        console.log('[chatWithChatbot] 정제된 응답:', {
            response: chatResponse.response.substring(0, 100) + (chatResponse.response.length > 100 ? '...' : ''),
            length: chatResponse.response.length
        });
        
    } catch (error) {
        // Assistant ID 관련 오류 발생 시 자동 재생성하지 않고 오류 메시지만 로깅
        if (error.message.includes('Assistant ID') && 
            error.message.includes('찾을 수 없습니다')) {
            logger.error(`Assistant ID ${chatbot.assistant_id} 찾을 수 없음. 관리자 확인 필요.`);
            throw new Error('챗봇 서비스를 일시적으로 사용할 수 없습니다. 관리자에게 문의하세요.');
        } else {
            logger.error('챗봇 대화 중 오류 발생:', error);
            throw error;
        }
    }

    // 대화 로그 저장 - thread_id 저장 확실히 하기
    try {
        // 위치 정보 처리
        let locationPoint = null;
        if (location && location.latitude && location.longitude) {
            locationPoint = {
                type: 'Point',
                coordinates: [location.longitude, location.latitude],
            };
        }

        // 데이터 타입 명시적 처리
        const cleanedUserId = userId !== undefined && userId !== null ? Number(userId) : null;
        const cleanedThreadId = currentThreadId ? String(currentThreadId) : null;
        const cleanedSessionId = String(currentSessionId);
        const cleanedChatbotId = Number(chatbotId);
        
        console.log('[chatWithChatbot] 저장할 대화 로그 데이터:');
        console.log('- chatbot_id:', cleanedChatbotId);
        console.log('- user_id:', cleanedUserId);
        console.log('- session_id:', cleanedSessionId);
        console.log('- thread_id:', cleanedThreadId);
        console.log('- message:', message);
        console.log('- response:', chatResponse.response);

        const logData = {
            chatbot_id: cleanedChatbotId,
            user_id: cleanedUserId,
            session_id: cleanedSessionId,
            message: message,
            response: chatResponse.response,
            thread_id: cleanedThreadId,
            timestamp: new Date(),
            user_feedback: 'none',
            user_location: locationPoint,
        };

        // ChatLog 모델에 저장
        const savedLog = await ChatLog.create(logData);
        
        console.log('[chatWithChatbot] 저장된 로그 ID:', savedLog.id);
        console.log('[chatWithChatbot] 저장된 user_id:', savedLog.user_id);
        console.log('[chatWithChatbot] 저장된 thread_id:', savedLog.thread_id);
        
        // 저장 후 검증
        if (savedLog.user_id !== cleanedUserId) {
            logger.warn(`user_id 불일치 - 예상: ${cleanedUserId}, 실제: ${savedLog.user_id}`);
        }
        
        if (savedLog.thread_id !== cleanedThreadId) {
            logger.warn(`thread_id 불일치 - 예상: ${cleanedThreadId}, 실제: ${savedLog.thread_id}`);
        }
    } catch (error) {
        logger.error('대화 로그 저장 중 오류 발생:', error);
        console.error('대화 로그 저장 오류 상세:', error);
        
        // 오류가 발생해도 사용자에게는 응답 전송 (로그 저장 실패를 사용자에게 알리지 않음)
        logger.warn('로그 저장 실패했으나 사용자에게 응답은 전송합니다.');
    }

    return {
        response: chatResponse.response,
        sessionId: currentSessionId,
        threadId: currentThreadId  // 중요: 스레드 ID 반환
    };
};

// 대화 기록 조회 함수 수정
const getChatHistory = async (
    chatbotId,
    sessionId,
    userId = null,
    options = {}
) => {
    const { page = 1, limit = 50 } = options || {};
    const offset = (page - 1) * limit;

    // 쿼리 조건 설정
    const whereClause = {
        chatbot_id: chatbotId,
    };

    // 로그인한 사용자는 user_id로 필터링
    // 비로그인 사용자는 sessionId로 필터링
    if (userId) {
        whereClause.user_id = userId;
    } else if (sessionId) {
        whereClause.session_id = sessionId;
    }

    try {
        const { count, rows } = await ChatLog.findAndCountAll({
            where: whereClause,
            order: [['created_at', 'ASC']],
            limit,
            offset,
            include: [
                {
                    model: Chatbot,
                    attributes: ['id', 'name', 'store_id'],
                    include: [
                        {
                            model: Store,
                            attributes: ['id', 'name', 'image_url'],
                        },
                    ],
                },
            ],
        });

        // 채팅 기록 데이터 강화
        const enhancedChatlogs = rows.map(chatlog => {
            const plainChatlog = chatlog.get({ plain: true });
            
            // 챗봇 및 점포 이미지 URL 추가
            if (plainChatlog.Chatbot && plainChatlog.Chatbot.Store) {
                plainChatlog.botProfileImage = plainChatlog.Chatbot.Store.image_url;
                plainChatlog.storeName = plainChatlog.Chatbot.Store.name;
            }
            
            return plainChatlog;
        });

        const totalPages = Math.ceil(count / limit);
        const pagination = {
            total: count,
            totalPages,
            currentPage: parseInt(page),
            limit: parseInt(limit),
        };

        return { 
            chatlogs: enhancedChatlogs,
            pagination 
        };
    } catch (error) {
        logger.error('대화 기록 조회 실패: ', error);
        throw new Error('대화 기록 조회 중 오류가 발생했습니다');
    }
};

// 모든 챗봇 목록 조회
const getAllChatbots = async () => {
    const chatbots = await Chatbot.findAll({
        include: [
            {
                model: Store,
                attributes: [
                    'id',
                    'name',
                    'address',
                    'phone',
                    'description',
                    'owner_name',
                ],
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
            chatbot_id: chatbotId,
        },
        group: ['session_id'],
        order: [[sequelize.literal('last_chat'), 'DESC']],
        limit,
        offset,
    });

    // 총 세션 수 조회
    const countResult = await ChatLog.findAll({
        attributes: [
            [
                sequelize.fn(
                    'COUNT',
                    sequelize.fn('DISTINCT', sequelize.col('session_id'))
                ),
                'session_count',
            ],
        ],
        where: {
            user_id: userId,
            chatbot_id: chatbotId,
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
    getAllChatbots,
    getThreadIdBySessionId,
};