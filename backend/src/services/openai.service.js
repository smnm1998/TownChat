const OpenAI = require('openai');
const logger = require('../utils/logger'); // 실제 로거 경로로 수정 필요

// OpenAI API 클라이언트 생성 (변경 없음)
const getOpenAIClient = () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        logger.error('[OpenAI Service] OpenAI API 키가 설정되지 않았습니다.');
        throw new Error('OpenAI API 키가 설정되지 않았습니다. 환경 변수를 확인하세요.');
    }
    return new OpenAI({ apiKey: apiKey });
};

const createAssistant = async (name, instructions, model = 'gpt-4o-mini') => {
    try {
        const openai = getOpenAIClient();
        logger.info(`[OpenAI Service] 새 Assistant 생성 요청: 이름='${name}', 모델='${model}'`);
        const assistant = await openai.beta.assistants.create({
            name,
            instructions,
            model,
            tools: [{ type: 'retrieval' }] // 기본 도구, 필요시 수정
        });
        logger.info(`[OpenAI Service] Assistant 생성 성공: ID=${assistant.id}`);
        return assistant.id;
    } catch (error) {
        logger.error(`[OpenAI Service] Assistant 생성 실패: ${error.message}`, error);
        throw new Error(`OpenAI Assistant 생성에 실패했습니다: ${error.message}`);
    }
};

// 챗봇과 대화 (Assistant API 사용)
const chatWithAssistant = async (assistantId, message, sessionId, threadId = null) => {
    try {
        const openai = getOpenAIClient();
        logger.info(`[OpenAI Service] 대화 시작 - Assistant: ${assistantId.substring(0,10)}, Session: ${sessionId}, Thread: ${threadId || 'NEW'}`);

        // 스레드 관리
        let currentThread;
        if (threadId) {
            try {
                currentThread = await openai.beta.threads.retrieve(threadId);
            } catch (error) {
                logger.warn(`[OpenAI Service] 스레드 (${threadId}) 조회 실패, 새 스레드 생성: ${error.message}`);
                currentThread = await openai.beta.threads.create();
            }
        } else {
            currentThread = await openai.beta.threads.create();
        }
        logger.debug(`[OpenAI Service] 사용 스레드 ID: ${currentThread.id}`);

        // 메시지 추가 및 실행 생성
        await openai.beta.threads.messages.create(currentThread.id, { role: 'user', content: message });
        const run = await openai.beta.threads.runs.create(currentThread.id, { assistant_id: assistantId });
        logger.debug(`[OpenAI Service] Run 생성됨: ${run.id}`);

        // 실행 상태 폴링
        let runStatus = await openai.beta.threads.runs.retrieve(currentThread.id, run.id);
        const startTime = Date.now();
        const TIMEOUT_MS = 60000; // 60초

        while (['queued', 'in_progress', 'requires_action'].includes(runStatus.status)) {
            if (Date.now() - startTime > TIMEOUT_MS) {
                logger.error(`[OpenAI Service] Run 타임아웃 (ID: ${run.id}, 상태: ${runStatus.status})`);
                try { await openai.beta.threads.runs.cancel(currentThread.id, run.id); }
                catch (cancelError) { logger.error(`[OpenAI Service] Run 취소 실패: ${cancelError.message}`); }
                throw new Error('응답 생성 시간이 초과되었습니다.');
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
            runStatus = await openai.beta.threads.runs.retrieve(currentThread.id, run.id);
            logger.debug(`[OpenAI Service] Run 상태 (ID: ${run.id}): ${runStatus.status}`);
        }

        if (runStatus.status === 'failed') {
            const errorMsg = runStatus.last_error?.message || '알 수 없는 OpenAI 실행 오류';
            logger.error(`[OpenAI Service] Run 실패 (ID: ${run.id}): ${errorMsg}`, runStatus.last_error);
            throw new Error(`OpenAI 응답 생성 실패: ${errorMsg}`);
        }
        if (runStatus.status !== 'completed') {
            logger.error(`[OpenAI Service] Run 완료되지 않음 (ID: ${run.id}, 상태: ${runStatus.status})`);
            throw new Error(`OpenAI 응답을 받지 못했습니다 (상태: ${runStatus.status}).`);
        }

        // 응답 메시지 조회 및 텍스트 추출
        const messagesResponse = await openai.beta.threads.messages.list(currentThread.id, { order: 'desc', limit: 5 });
        const assistantMessages = messagesResponse.data.filter(msg => msg.role === 'assistant');

        if (!assistantMessages.length || !assistantMessages[0].content || !assistantMessages[0].content.length) {
            logger.warn(`[OpenAI Service] 어시스턴트 응답 메시지 없음 (Thread: ${currentThread.id})`);
            return { response: '죄송합니다. 어시스턴트로부터 응답을 받지 못했습니다.', threadId: currentThread.id, messageId: null };
        }

        const latestAssistantMessageContent = assistantMessages[0].content;
        logger.info('--- OpenAI 원본 응답 (latestAssistantMessage.content) ---');
        logger.info(JSON.stringify(latestAssistantMessageContent, null, 2));

        let responseText = '';
        
        // OpenAI 응답 content 배열에서 모든 'text' 타입 값들을 결합
        for (const contentItem of latestAssistantMessageContent) {
            if (contentItem.type === 'text' && contentItem.text && typeof contentItem.text.value === 'string') {
                responseText += contentItem.text.value + "\n";
            }
        }

        // 1. undefined 문자열 완전 제거 (단어 경계 고려)
        responseText = responseText.replace(/\bundefined\b/gi, '');
        
        // 2. 여러 공백 문자를 하나로 통합
        responseText = responseText.replace(/\s+/g, ' ');
        
        // 3. 앞뒤 공백 제거
        responseText = responseText.trim();
        
        // 4. 빈 응답 체크
        if (!responseText) {
            logger.warn('[OpenAI Service] 텍스트 응답이 비어있음, 기본 메시지 사용');
            responseText = '죄송합니다. 응답을 생성할 수 없습니다. 다른 질문을 시도해 보세요.';
        }

        // 로깅
        logger.info(`[OpenAI Service] 정제된 응답 (일부): "${responseText.substring(0, 100)}${responseText.length > 100 ? '...' : ''}"`);
        
        return {
            response: responseText,
            threadId: currentThread.id,
            messageId: assistantMessages[0].id
        };

    } catch (error) {
        logger.error(`[OpenAI Service] 챗봇 대화 중 심각한 오류: ${error.message}`, { stack: error.stack, assistantId, sessionId, threadId });
        // 클라이언트에게 전달될 에러 메시지는 더 일반적일 수 있음
        throw new Error(`챗봇 서비스와 통신 중 문제가 발생했습니다. 관리자에게 문의하십시오.`);
    }
};

const updateAssistant = async (assistantId, data) => {
    try {
        const openai = getOpenAIClient();
        logger.info(`[OpenAI Service] Assistant 업데이트 요청: ID=${assistantId}`);
        const updatePayload = {};
        if (data.name) updatePayload.name = data.name;
        if (data.instructions) updatePayload.instructions = data.instructions;
        if (data.model) updatePayload.model = data.model;
        // tools 등 다른 필드도 필요시 추가

        if (Object.keys(updatePayload).length === 0) {
            logger.warn(`[OpenAI Service] Assistant 업데이트할 내용 없음: ID=${assistantId}`);
            return true;
        }

        await openai.beta.assistants.update(assistantId, updatePayload);
        logger.info(`[OpenAI Service] Assistant 업데이트 성공: ID=${assistantId}`);
        return true;
    } catch (error) {
        logger.error(`[OpenAI Service] Assistant (ID: ${assistantId}) 업데이트 실패: ${error.message}`, error);
        throw new Error(`OpenAI Assistant 업데이트에 실패했습니다: ${error.message}`);
    }
};

const deleteAssistant = async (assistantId) => {
    try {
        const openai = getOpenAIClient();
        logger.info(`[OpenAI Service] Assistant 삭제 요청: ID=${assistantId}`);
        await openai.beta.assistants.del(assistantId);
        logger.info(`[OpenAI Service] Assistant 삭제 성공: ID=${assistantId}`);
        return true;
    } catch (error) {
        logger.error(`[OpenAI Service] Assistant (ID: ${assistantId}) 삭제 실패: ${error.message}`, error);
        throw new Error(`OpenAI Assistant 삭제에 실패했습니다: ${error.message}`);
    }
};

module.exports = {
    createAssistant,
    updateAssistant,
    deleteAssistant,
    chatWithAssistant
};