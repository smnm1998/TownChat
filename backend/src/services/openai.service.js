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
};

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
const chatWithAssistant = async (
    assistantId,
    message,
    sessionId = null,
    threadId = null
) => {
    try {
        logger.info(
            `[OpenAI Service] 대화 시작 - Assistant ID: ${assistantId}, Thread ID: ${
                threadId || '새 스레드 생성 예정'
            }`
        );

        // 세션 아이디 없으면 새로 생성
        if (!sessionId) {
            sessionId = `session_${Date.now()}`;
        }

        // 1. 스레드 처리 (기존 스레드 사용 또는 새로 생성)
        if (!threadId) {
            try {
                // 새 스레드 생성
                const thread = await openai.beta.threads.create();

                if (!thread || !thread.id) {
                    throw new Error('스레드 객체 생성 실패 또는 ID 없음');
                }

                threadId = thread.id;
                logger.info(`새 스레드 생성 성공: ${threadId}`);
            } catch (threadError) {
                logger.error('스레드 생성 오류:', threadError);
                throw new Error(
                    '챗봇 대화 초기화 실패: 스레드를 생성할 수 없습니다'
                );
            }
        } else {
            logger.info(`기존 스레드 사용: ${threadId}`);
        }

        // 스레드 ID 유효성 검사
        if (
            !threadId ||
            typeof threadId !== 'string' ||
            !threadId.startsWith('thread')
        ) {
            throw new Error(`유효하지 않은 스레드 ID: ${threadId}`);
        }

        // 2. 메시지 추가
        try {
            await openai.beta.threads.messages.create(threadId, {
                role: 'user',
                content: message,
            });
            logger.info(`스레드 ${threadId}에 메시지 추가 성공`);
        } catch (messageError) {
            logger.error(`메시지 추가 오류:`, messageError);
            throw new Error('메시지를 전송할 수 없습니다');
        }

        // 3. Assistant로 실행
        let run;
        try {
            run = await openai.beta.threads.runs.create(threadId, {
                assistant_id: assistantId,
            });
            logger.info(`Run 생성 성공: ${run.id}`);
        } catch (runError) {
            logger.error(`Run 생성 오류:`, runError);

            if (
                runError.status === 404 &&
                runError.message.includes('No assistant found')
            ) {
                throw new Error(
                    `Assistant ID ${assistantId}를 찾을 수 없습니다. 관리자에게 문의하세요.`
                );
            }

            throw new Error('챗봇 응답 처리를 시작할 수 없습니다');
        }

        // 4. 실행 완료 대기
        let runStatus = await openai.beta.threads.runs.retrieve(
            threadId,
            run.id
        );
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
            logger.info(
                `Run 상태 확인 (${attempts}/${maxAttempts}): ${runStatus.status}`
            );
        }

        if (runStatus.status === 'failed') {
            logger.error('OpenAI Assistant 실행 실패:', runStatus.last_error);
            throw new Error('챗봇 응답 생성에 실패했습니다');
        }

        if (attempts >= maxAttempts) {
            logger.error('OpenAI Assistant 응답 시간 초과');
            throw new Error('챗봇 응답 시간이 초과되었습니다');
        }

        // 5. 응답 메시지 가져오기
        const messages = await openai.beta.threads.messages.list(threadId);
        const assistantMessages = messages.data.filter(
            (msg) => msg.role === 'assistant'
        );

        if (assistantMessages.length === 0) {
            throw new Error('챗봇 응답을 받지 못했습니다');
        }

        // 최신 응답 메시지
        const latestMessage = assistantMessages[0];

        // 텍스트 응답 추출
        let responseText = '';
        for (const content of latestMessage.content) {
            if (content.type === 'text') {
                responseText += content.text.value || '';
            }
        }

        // undefined 문자열 제거
        responseText = responseText.replace(/undefined/g, '').trim();

        return {
            response: responseText,
            threadId: threadId,
            sessionId,
        };
    } catch (error) {
        logger.error('OpenAI Assistant 대화 중 오류 발생:', error);

        // 오류 세부 정보 로그
        if (error.status) {
            logger.error(
                `상태 코드: ${error.status}, 오류 유형: ${
                    error.type || 'unknown'
                }`
            );
        }

        throw new Error('챗봇 대화에 실패: ' + error.message);
    }
};

module.exports = {
    createAssistant,
    updateAssistant,
    deleteAssistant,
    chatWithAssistant,
};
