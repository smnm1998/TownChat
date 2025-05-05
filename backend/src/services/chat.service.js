const getThreadIdBySessionId = async (sessionId) => {
    const query = `
        SELECT thread_id
        FROM chatlogs
        WHERE session_id = ?
        AND thread_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 1
    `;

    try {
        const [rows] = await db.query(query, [sessionId]);
        return rows.length > 0 ? rows[0].thread_id : null;
    } catch (error) {
        logger.error('스레드 ID 조회 실패: ', error);
        return null;
    }
};

const saveThreadForSession = async (chatbotId, userId, sessionId, MessageChannel, response, threadId) => {
    const query = `
        INSERT INTO chatlogs
        (chatbot_id, user_id, session_id, message, response, thread_id, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    try {
        await db.query(query, [chatbotId, userId, sessionId, MessageChannel, response, threadId]);
        return true;
    } catch (error) {
        logger.error('스레드 ID 저장 실패: ', error);
        return false;
    }
};

const saveChatLog = async (chatbotId, userId, sessionId, message, response, threadId) => {
    const query = `
        INSERT INTO chatlogs
        (chatbot_id, user_id, session_id, message, response, thread_id, timestamp, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(), NOW())
    `;

    try {
        await db.query(query, [chatbotId, userId, sessionId, message, response, threadId]);
        return true;
    } catch (error) {
        logger.error('대화 로그 저장 실패: ', error);
        return false;
    }
}