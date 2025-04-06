const { OpenAI } = require('openai');
const env = require('../config/environment');
const logger = require('../utils/logger');

// OpenAI Client 초기화
const openai = new OpenAI({
    apiKey: env.OPENAI_API_KEY,
});

const createAssistant = async (name, instructions, model = 'gpt-4o-mini') => {
    try {
        const assistant = await openai.beta.assistants.create({
            name,
            instructions,
            model,
        });

        return assistant.id;
    } catch (error) {
        logger.error('OpenAI Assistant 생성 중 오류 발생: ', error);
        throw new Error('챗봇 어시스턴트 생성에 실패');
    }
};

// OpenAI Assistant 업데이트
const updateAssistant = async (assistantId, updateData) => {
    try {
        const assistant = await openai.beta.assistants.update(
            assistantId,
            updateData
        );

        return assistant;
    } catch (error) {
        logger.error('OpenAI Assistant 업데이트 중 오류 발생: ', error);
        throw new Error('챗봇 어시스턴트 업데이트에 실패');
    }
}

// OpenAI Assistant 삭제
const deleteAssistant = async (assistantId) => {
    try {
        await openai.beta.assistants.del(assistantId);
        return true;
    } catch (error) {
        logger.error('OpenAI Assistant 삭제 중 오류 발생: ', error);
        throw new Error('챗봇 어시스턴트 삭제에 실패');
    }
};

// 챗봇 대화
const chatWithAssistant = async (assistantId, message, sessionId = null, threadId = null) => {
    try {
        // 세션 아이디 없으면 새로 생성
        if (!sessionId) {
            sessionId = `session_${Date.now()}`;
        }

        let thread;
        
        // 기존 스레드 ID가 있으면 사용, 없으면 새로 생성
        if (threadId) {
            // 기존 스레드 ID 사용
            console.log('기존 스레드 ID 사용:', threadId);
        } else {
            // 새 스레드 생성
            thread = await openai.beta.threads.create();
            threadId = thread.id;
            console.log('새 스레드 생성:', threadId);
        }

        // 메시지 추가
        await openai.beta.threads.messages.create(threadId, {
            role: 'user',
            content: message,
        });

        // 실행
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantId,
        });

        // 실행 완료 대기 (최대 60초)
        let runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
        );

        // 실행 완료될 때까지 대기 (최대 30번 시도)
        let attempts = 0;
        const maxAttempts = 30;

        while (
            runStatus.status !== 'completed' &&
            runStatus.status !== 'failed' &&
            attempts < maxAttempts
        ) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            runStatus = await openai.beta.threads.runs.retrieve(
                threadId,
                run.id
            );
            attempts++;
        }

        if (runStatus.status === 'failed') {
            logger.error('OpenAI Assistant 실행 실패: ', runStatus.last_error);
            throw new Error('챗봇 응답 생성에 실패');
        }

        if (attempts >= maxAttempts) {
            logger.error('OpenAI Assistant 응답 시간 초과');
            throw new Error('챗봇 응답 시간이 초과되었습니다.');
        }

        // 응답 메시지 가져오기
        const messages = await openai.beta.threads.messages.list(threadId);

        // Assistant 응답 (latest)
        const assistantMessage = messages.data.filter(
            (msg) => msg.role === 'assistant'
        );

        if (assistantMessage.length === 0) {
            throw new Error('챗봇 응답을 받지 못했음');
        }

        // 최신 응답 메시지
        const latestMessage = assistantMessage[0];

        // 텍스트 응답 추출
        let responseText = '';
        for (const content of latestMessage.content) {
            if (content.type === 'text') {
                responseText += content.text.value;
            }
        }

        return {
            response: responseText,
            threadId: threadId,
            sessionId,
        };
    } catch (error) {
        logger.error('OpenAI Assistant 대화 중 오류 발생: ', error);
        throw new Error('챗봇 대화에 실패: ' + error.message);
    }
};

module.exports = {
    createAssistant,
    updateAssistant,
    deleteAssistant,
    chatWithAssistant,
};