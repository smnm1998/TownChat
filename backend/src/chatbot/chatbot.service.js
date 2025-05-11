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
    const { userId = null, sessionId = null, threadId = null, location = null } = options;

    const chatbot = await Chatbot.findByPk(chatbotId, { include: [{ model: Store, attributes:['name'] }] }); // 필요한 Store 속성만
    if (!chatbot) throw new NotFoundError('챗봇을 찾을 수 없습니다.');
    if (!chatbot.is_active) throw new AppError('현재 해당 챗봇은 비활성 상태입니다.', 403);
    if (!chatbot.assistant_id) throw new AppError('챗봇 설정(Assistant ID)이 올바르지 않습니다. 관리자에게 문의하세요.', 500);

    // --- 세션 및 스레드 ID 관리 ---
    const currentSessionId = sessionId || `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let currentThreadId = threadId; // 클라이언트가 제공한 threadId를 우선 사용

    if (!currentThreadId && currentSessionId) { // threadId가 없고 sessionId가 있을 때만 DB에서 조회
        try {
            const chatLogInSession = await ChatLog.findOne({
                where: {
                    session_id: currentSessionId,
                    chatbot_id: chatbotId,
                    thread_id: { [Op.not]: null },
                },
                order: [['timestamp', 'DESC']],
            });
            if (chatLogInSession) {
                currentThreadId = chatLogInSession.thread_id;
                // logger.info(`[Chatbot Service] DB에서 스레드 ID 조회: ${currentThreadId} (세션: ${currentSessionId})`);
            }
        } catch (error) {
            logger.error(`[Chatbot Service] DB에서 스레드 ID 조회 실패: ${error.message}`);
            // 실패 시 currentThreadId는 null로 유지 (새 스레드 생성 유도)
        }
    }
    // if (currentThreadId) {
    //     logger.info(`[Chatbot Service] 사용할 스레드 ID: ${currentThreadId}`);
    // }

    // --- OpenAI 서비스 호출 ---
    let chatResponseFromOpenAI;
    try {
        chatResponseFromOpenAI = await openaiService.chatWithAssistant(
            chatbot.assistant_id,
            message,
            currentSessionId,
            currentThreadId
        );
        
        // 스레드 ID 업데이트
        currentThreadId = chatResponseFromOpenAI.threadId;
        
        // 응답 텍스트 정제
        let responseText = chatResponseFromOpenAI.response || '';
        
        // 명시적으로 undefined 문자열과 그 변형을 제거 (대소문자 구분 없이)
        responseText = responseText.replace(/undefined/gi, '');
        
        // 여러 개의 공백, 탭, 줄바꿈을 하나의 공백으로 치환
        responseText = responseText.replace(/\s+/g, ' ');
        
        // 앞뒤 공백 제거
        responseText = responseText.trim();
        
        // 빈 응답인 경우 기본 메시지 제공
        if (!responseText) {
            responseText = '죄송합니다. 현재 답변을 제공할 수 없습니다. 다른 질문을 해주세요.';
        }
        
        // 최종 응답 저장
        chatResponseFromOpenAI.response = responseText;
        
        return {
            response: responseText,
            sessionId: currentSessionId,
            threadId: currentThreadId
        };
    } catch (error) {
        logger.error(`[Chatbot Service] OpenAI 서비스 호출 중 오류: ${error.message}`, error);
        throw new Error('챗봇 응답을 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
    }
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

const deleteChatSession = async (userId, sessionId) => {
    try {
        // 세션 존재 여부 확인 및 권한 검증
        const sessionExists = await ChatLog.findOne({
            where: {
                session_id: sessionId,
                user_id: userId
            }
        });
        
        if (!sessionExists) {
            // 세션이 존재하지 않거나 현재 사용자의 세션이 아님
            throw new ForbiddenError('해당 채팅 세션을 찾을 수 없거나 삭제 권한이 없습니다.');
        }
        
        // 세션 ID에 해당하는 모든 채팅 로그 삭제
        const deleteResult = await ChatLog.destroy({
            where: {
                session_id: sessionId,
                user_id: userId
            }
        });
        
        logger.info(`사용자 ${userId}의 세션 ${sessionId} 삭제 완료: ${deleteResult}개 메시지 삭제됨`);
        
        return deleteResult > 0;
    } catch (error) {
        logger.error(`채팅 세션 삭제 실패: ${error.message}`);
        throw error;
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
    getAllChatbots,
    getThreadIdBySessionId,
    deleteChatSession
};