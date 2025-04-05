import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import styles from './ChatPage.module.css';

const ChatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [store, setStore] = useState(null);
    const [chatbotId, setChatbotId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const [sessionId] = useState(() => {
        const savedSessionId = localStorage.getItem(`chat_session_${id}`);
        return savedSessionId || `session_${Date.now()}_${Math.random().toString(36).subString(2, 9)}`;
    });

    useEffect(() => {
        const fetchStoreAndHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const storeResponse = await fetch(`/api/store/${id}`);
                if (!storeResponse.ok) {
                    throw new Error('점포 정보 불러오기 실패');
                }
                const storeData = await storeResponse.json();
                setStore(storeData.data);

                // 챗봇 정보 가져오기
                const chatbotResponse = await fetch(`/api/chatbot/${id}`);
                if (!chatbotResponse.ok) {
                    throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                }

                const chatbotData = await chatbotResponse.json();
                const botId = chatbotData.data.id;
                setChatbotId(botId);

                // 채팅 기록
                const historyResponse = await fetch(`/api/chatbots/${botId}/history?sessionId=${sessionId}`);

                if (historyResponse.ok) {
                    const historyData = await historyResponse.json();

                    if (historyData.data && Array.isArray(historyData.data)) {
                        const formattedMessages = [];

                        historyData.data.forEach(entry => {
                            // 사용자 메시지
                            formattedMessages.push({
                                id: `user_${entry.id}`,
                                text: entry.message,
                                isUser: true,
                                timestamp: new Date(entry.timestamp || entry.created_at)
                            });

                            // 챗봇 응답
                            formattedMessages.push({
                                id: `bot_${entry.id}`,
                                text: entry.response,
                                isUser: false,
                                timeStamp: new Date(entry.timestamp || entry.created_at)
                            });
                        });
                        setMessages(formattedMessages);
                    }
                }

                if (!historyResponse.ok ||
                    (historyResponse.ok && (!historyData.data || historyData.data.length === 0))) {
                        const greetingMessage = {
                            id: 'initial',
                            text: chatbotData.data.greeting_message || '안녕하세요! 무엇을 도와드릴까요?',
                            isUser: false,
                            timestamp: new Date()
                        };

                        setMessages([greetingMessage]);
                    }
            } catch (error) {
                console.error('데이터 로딩 중 오류: ', error);
                setError(error.message || '데이터를 불러오는데 문제가 발생했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStoreAndHistory();

        localStorage.setItem(`chat_session_${id}`, sessionId);

        return () => {
            // 언마운트 시 작업
        };
    }, [id, sessionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = async () => {
        if (!newMessage.trim() || isSending) return;

        const userMessage = {
            id: `user_${Date.now()}`,
            text: newMessage,
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setNewMessage('');
        setIsSending(true);

        try {
            if (!chatbotId) {
                throw new Error('챗봇 ID를 찾을 수 없습니다.');
            }

            const response = await fetch(`/api/chatbots/${chatbotId}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: newMessage,
                    sessionId: sessionId
                })
            });

            if (!response.ok) {
                throw new Error('챗봇 응답을 받는데 실패했습니다.');
            }

            const responseData = await response.json();

            const botMenu = {
                id: `bot_${Date.now()}`,
                text: responseData.data.response,
                isUser: false,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, botMessage]);
        } catch (error) {
            console.error('메시지 전송 중 오류', error);

            const errorMessage = {
                id: `error_${Date.now()}`,
                text: '죄송합니다, 메시지를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                isUser: false,
                isError: true,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsSending(false);
            inputRef.current?.focus();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleGoBack = () => {
        navigate(-1);
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button
                    className={styles.backButton}
                    onClick={handleGoBack}
                    aria-label="뒤로 가기">
                        <FiArrowLeft />
                </button>
                <h1 className={styles.storeName}>
                    {isLoading ? '로딩 중 ...' : store?.name || '점포 정보 없음'}
                </h1>
            </header>

            <div className={styles.messageContainer}>
                {isLoading ? (
                    <div className={styles.lodingContainer}>
                        <div className={styles.loading}>메시지를 불러오는 중...</div>
                    </div>
                ) : error ? (
                    <div className={styles.errorContainer}>
                        <div className={styles.error}>{error}</div>
                        <button
                            className={styles.retryButton}
                            onClick={() => window.location.reload()}>
                                다시 시도
                        </button>
                    </div>
                ): (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`${styles.message} ${message.isUser ? styles.userMessage : styles.botMessage}`}
                            >
                                {!message.isUser && (
                                    <div className={styles.botAvatar}>
                                        <img src={store?.image_url} alt={store?.name} className={styles.avatarImage} />
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    <div className={styles.messageText}>{message.text}</div>
                                    <div className={styles.messageTime}>
                                        {message.timestamp.toLocalTimeString([], { hour: '2-digit', minute: '2-digit'})}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messageEndRef} />

                        {isSending && (
                            <div className={styles.typingIndicator}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        )}
                    </>
                )}
            </div>

            <div className={styles.inputContainer}>
                <input
                    type="text"
                    className={styles.messageInput}
                    placeholder="메시지를 입력하세요..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading || isSending}
                    ref={inputRef}
                />
                <button
                    className={`${styles.sendButton} ${!newMessage.trim() || isSending ? styles.disabled : ''}`}
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSending}
                    aria-label="메시지 보내기"
                >
                    <FiSend />
                </button>
            </div>
        </div>
    );
};

export default ChatPage;