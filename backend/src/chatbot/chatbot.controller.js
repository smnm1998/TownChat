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

// 챗봇과 대화하기 컨트롤러
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
            userId: req.user ? req.user.id : null,  // 로그인했으면 사용자 ID 전달
            sessionId,
            location
        };
        
        const response = await chatbotService.chatWithChatbot(
            chatbotId,
            message,
            chatOptions
        );
        
        console.log('요청 헤더:', req.headers);
        console.log('인증된 사용자:', req.user);
        console.log('ChatOptions에 전달할 userId:', req.user ? req.user.id : null);
        return success(res, 200, '챗봇 응답 성공', response);
    } catch (error) {
        next(error);
    }
};

// 챗봇 대화 기록 조회 컨트롤러
const getChatHistory = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        const { sessionId } = req.query;
        const userId = req.user ? req.user.id : null;
        
        // 로그인하지 않았고 세션ID도 없는 경우 에러
        if (!userId && !sessionId) {
            return res.status(400).json({
                success: false,
                message: '세션 ID가 필요합니다.'
            });
        }
        
        // 옵션 객체 준비
        const options = { 
            page: req.query.page ? parseInt(req.query.page) : 1, 
            limit: req.query.limit ? parseInt(req.query.limit) : 50 
        };
        
        // 서비스 함수 호출
        const { chatlogs, pagination } = await chatbotService.getChatHistory(
            chatbotId,
            sessionId,
            userId,
            options
        );
        
        return paginate(res, chatlogs, pagination, '대화 기록 조회 성공');
    } catch (error) {
        next(error);
    }
};

// 사용자의 특정 챗봇과의 대화 세션 목록 조회 함수 추가
const getUserChatbotSessions = async (userId, chatbotId, options = {}) => {
    const { page = 1, limit = 10 } = options || {};
    const offset = (page - 1) * limit;
    
    // 특정 챗봇과의 대화 세션 그룹화하여 조회
    const sessions = await ChatLog.findAll({
        attributes: [
            'session_id',
            [sequelize.fn('MAX', sequelize.col('created_at')), 'last_chat'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'message_count'],
        ],
        where: {
            user_id: userId,
            chatbot_id: chatbotId
        },
        group: ['session_id'],
        order: [[sequelize.literal('last_chat'), 'DESC']],
        limit,
        offset,
    });
    
    // 총 세션 수 조회
    const countResult = await ChatLog.findAll({
        attributes: [
            [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('session_id'))), 'session_count'],
        ],
        where: {
            user_id: userId,
            chatbot_id: chatbotId
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

const getUserChatSessions = async (userId, options = {}) => {
    const { page = 1, limit = 10 } = options || {};
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
            user_id: userId
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
            user_id: userId
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


// 모든 챗봇 목록 조회
const getAllChatbots = async (req, res, next) => {
    try {
        const chatbots = await chatbotService.getAllChatbots();
        return success(res, 200, '챗봇 목록 조회 성공', chatbots);
    } catch (error) {
        next(error);
    }
};

// chatbot.controller.js에 추가
const resetAssistantId = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        const chatbot = await Chatbot.findByPk(chatbotId, {
            include: [
                {
                    model: Store,
                    attributes: ['id', 'name', 'owner_id'],
                }
            ]
        });
        
        if (!chatbot) {
            throw new NotFoundError('챗봇을 찾을 수 없습니다.');
        }
        
        // 권한 확인 (챗봇 소유자 또는 관리자만 가능)
        if (chatbot.Store.owner_id !== req.user.id && req.user.role !== 'admin') {
            throw new ForbiddenError('해당 챗봇을 수정할 권한이 없습니다.');
        }
        
        // Assistant ID 저장
        const oldAssistantId = chatbot.assistant_id;
        
        // 기존 Assistant ID가 있으면 삭제 시도
        if (oldAssistantId) {
            try {
                await openaiService.deleteAssistant(oldAssistantId);
                logger.info(`OpenAI Assistant 삭제 성공: ${oldAssistantId}`);
            } catch (error) {
                // 삭제 실패해도 계속 진행 (로그만 남김)
                logger.error(`OpenAI Assistant 삭제 실패 (ID: ${oldAssistantId}):`, error);
            }
        }
        
        // DB에서 assistant_id 필드 null로 업데이트
        await chatbot.update({ assistant_id: null });
        
        return success(res, 200, 'Assistant ID가 초기화되었습니다. 새 대화를 시작하기 전에 관리자가 새 Assistant ID를 설정해야 합니다.', {
            id: chatbot.id,
            name: chatbot.name,
            old_assistant_id: oldAssistantId,
            current_assistant_id: null
        });
    } catch (error) {
        next(error);
    }
};

const setupAssistantId = async (req, res, next) => {
    try {
        const chatbotId = parseInt(req.params.id);
        const { assistant_id } = req.body;
        
        // assistant_id 요청 검증
        if (!assistant_id || !assistant_id.startsWith('asst_')) {
            throw new ValidationError('유효한 OpenAI Assistant ID 형식이 아닙니다. (예: asst_mNVgXGeExVjGMSJI3pI6uhx)');
        }
        
        const chatbot = await Chatbot.findByPk(chatbotId, {
            include: [
                {
                    model: Store,
                    attributes: ['id', 'name', 'owner_id'],
                }
            ]
        });
        
        if (!chatbot) {
            throw new NotFoundError('챗봇을 찾을 수 없습니다.');
        }
        
        // 권한 확인 (챗봇 소유자 또는 관리자만 가능)
        if (chatbot.Store.owner_id !== req.user.id && req.user.role !== 'admin') {
            throw new ForbiddenError('해당 챗봇을 수정할 권한이 없습니다.');
        }
        
        // Assistant ID 확인 시도
        try {
            // OpenAI API를 통해 assistant_id가 실제로 존재하는지 확인
            // 이 부분은 OpenAI API의 변경에 따라 수정이 필요할 수 있음
            const assistant = await openai.beta.assistants.retrieve(assistant_id);
            logger.info(`Assistant ID 확인 성공: ${assistant_id}, 이름: ${assistant.name}`);
        } catch (error) {
            logger.error(`Assistant ID 확인 실패: ${assistant_id}`, error);
            throw new ValidationError('제공된 Assistant ID가 유효하지 않거나 접근할 수 없습니다. 올바른 ID를 입력해주세요.');
        }
        
        // 기존 Assistant ID가 있으면 삭제 시도 (선택적)
        if (chatbot.assistant_id && chatbot.assistant_id !== assistant_id) {
            try {
                await openaiService.deleteAssistant(chatbot.assistant_id);
                logger.info(`이전 OpenAI Assistant 삭제 성공: ${chatbot.assistant_id}`);
            } catch (deleteError) {
                // 삭제 실패해도 계속 진행 (로그만 남김)
                logger.error(`이전 OpenAI Assistant 삭제 실패 (ID: ${chatbot.assistant_id}):`, deleteError);
            }
        }
        
        // DB에 새 assistant_id 업데이트
        await chatbot.update({ 
            assistant_id: assistant_id,
            last_updated: new Date()
        });
        
        return success(res, 200, 'Assistant ID가 성공적으로 설정되었습니다.', {
            id: chatbot.id,
            name: chatbot.name,
            assistant_id: assistant_id
        });
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
    getAllChatbots,
    getUserChatbotSessions,
    resetAssistantId,
    setupAssistantId
};