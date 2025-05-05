const { ValidationError } = require('../common/errors');
const { validateRequired } = require('../auth/auth.validation');

// 챗봇 데이터 검증
const validateChatbotData = (data) => {
    // 필수 필드 체크
    validateRequired(data, ['store_id']);

    // 모델 검증 (제공 됐을 시)
    if (data.model) {
        const allowedModels = ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'];
        if (!allowedModels.includes(data.model)) {
            throw new ValidationError(`지원하지 않는 모델입니다. 지원 모델: ${allowedModels.join(', ')}`);
        }
    }

    // 챗봇 이름 길이 검증 (제공 됐을 시)
    if (data.name && data.name.length > 100) {
        throw new ValidationError('챗봇 이름은 100자를 초과할 수 없습니다.');
    }

    // 인사 메시지 길이 검증 (제공 됐을 시)
    if (data.greeting_message && data.greeting_message.length > 255) {
        throw new ValidationError('인사 메시지는 255자를 초과할 수 없습니다.');
    }
    
    // assistant_id 형식 검증 (제공 됐을 시)
    if (data.assistant_id && !/^asst_[a-zA-Z0-9]{24,}$/.test(data.assistant_id)) {
        throw new ValidationError('유효한 OpenAI Assistant ID 형식이 아닙니다. (예: asst_mNVgXGeExVjGMSJI3pI6uhx)');
    }
};

// 챗봇 메시지 검증
const validateChatMessage = (data) => {
    // 필수 필드 체크
    validateRequired(data, ['chatbot_id', 'message']);

    // 메시지 길이 검증
    if (data.message.length < 1) {
        throw new ValidationError('메시지 내용을 입력해주세요.');
    }

    if (data.message.length > 4000) {
        throw new ValidationError('메시지는 4000자를 초과할 수 없습니다.');
    }
};

module.exports = {
    validateChatbotData,
    validateChatMessage,
};