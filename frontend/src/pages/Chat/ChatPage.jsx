import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import PropTypes from 'prop-types';
import useTypewriter from '../../hooks/useTypeWriter';
import styles from './ChatPage.module.css';

const ChatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [store, setStore] = useState(null);
    const [chatbotId, setChatbotId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState(null);
    const [sessionIdSet, setSessionIdSet] = useState(false);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // 세션 ID 관리: 사용자 로그인 상태에 따라 다르게 처리
    const [sessionId, setSessionId] = useState(() => {
        // 로그인 상태 확인 (localStorage에 토큰이 있는지로 임시 확인)
        const token = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');

        if (token && userId) {
            // 로그인한 사용자는 userId + chatbotId 조합으로 세션 관리
            const userSessionKey = `chat_user_${userId}_chatbot_${id}`;
            const savedUserSession = localStorage.getItem(userSessionKey);
            return (
                savedUserSession ||
                `session_user_${userId}_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 9)}`
            );
        } else {
            // 비로그인 사용자는 기존 방식으로 sessionId 관리
            const anonymousSessionKey = `chat_session_${id}`;
            const savedSessionId = localStorage.getItem(anonymousSessionKey);
            return (
                savedSessionId ||
                `session_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 9)}`
            );
        }
    });

    // 사용자 정보 가져오기
    useEffect(() => {
        const fetchUserInfo = async () => {
            try {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    const response = await fetch('/api/auth/me', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    });

                    if (response.ok) {
                        const data = await response.json();
                        setUser(data.data?.user || null);

                        // 사용자 ID를 localStorage에 저장 (세션ID 생성에 사용)
                        if (data.data?.user?.id) {
                            localStorage.setItem('userId', data.data.user.id);

                            // 로그인 후 세션ID를 사용자 기반으로 업데이트
                            const userSessionKey = `chat_user_${data.data.user.id}_chatbot_${id}`;
                            const userSessionId =
                                localStorage.getItem(userSessionKey);

                            if (userSessionId) {
                                setSessionId(userSessionId);
                            } else {
                                const newUserSessionId = `session_user_${
                                    data.data.user.id
                                }_${Date.now()}_${Math.random()
                                    .toString(36)
                                    .substring(2, 9)}`;
                                localStorage.setItem(
                                    userSessionKey,
                                    newUserSessionId
                                );
                                setSessionId(newUserSessionId);
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching user info:', error);
            }
        };

        fetchUserInfo();
    }, [id]);

    // 점포 정보, 챗봇 정보, 채팅 기록 가져오기
    useEffect(() => {
        const fetchStoreAndHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                // 점포 정보 가져오기
                const storeResponse = await fetch(`/api/stores/${id}`);
                if (!storeResponse.ok) {
                    throw new Error('점포 정보 불러오기 실패');
                }
                const storeData = await storeResponse.json();
                setStore(storeData.data);

                // 챗봇 정보 가져오기
                const chatbotResponse = await fetch(
                    `/api/chatbots/store/${id}`
                );
                if (!chatbotResponse.ok) {
                    throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                }

                const chatbotData = await chatbotResponse.json();
                const botId = chatbotData.data.id;
                setChatbotId(botId);

                // 채팅 기록 조회
                let historyData = null;

                // 인증 헤더 설정 (로그인한 경우)
                const headers = {};
                if (user) {
                    const token = localStorage.getItem('accessToken');
                    if (token) {
                        headers['Authorization'] = `Bearer ${token}`;
                    }
                }

                // 대화 기록 요청
                const historyResponse = await fetch(
                    `/api/chatbots/${botId}/history?sessionId=${sessionId}`,
                    { headers }
                );

                if (historyResponse.ok) {
                    historyData = await historyResponse.json();

                    if (historyData.data && Array.isArray(historyData.data)) {
                        const formattedMessages = [];

                        historyData.data.forEach((entry) => {
                            // 사용자 메시지
                            formattedMessages.push({
                                id: `user_${entry.id}`,
                                text: entry.message,
                                isUser: true,
                                timestamp: new Date(
                                    entry.timestamp ||
                                        entry.created_at ||
                                        Date.now()
                                ),
                                isHistoryMessage: true,
                            });

                            // 챗봇 응답
                            formattedMessages.push({
                                id: `bot_${entry.id}`,
                                text: entry.response,
                                isUser: false,
                                timestamp: new Date(
                                    entry.timestamp ||
                                        entry.created_at ||
                                        Date.now()
                                ),
                                isHistoryMessage: true,
                            });
                        });
                        setMessages(formattedMessages);
                        setSessionIdSet(true);
                    }
                }

                // 히스토리가 없거나 응답이 성공적이지 않은 경우 인사말 메시지 표시
                if (
                    !historyResponse.ok ||
                    (historyData &&
                        (!historyData.data || historyData.data.length === 0))
                ) {
                    const greetingMessage = {
                        id: 'initial',
                        text:
                            chatbotData.data.greeting_message ||
                            '안녕하세요! 무엇을 도와드릴까요?',
                        isUser: false,
                        timestamp: new Date(),
                        isHistoryMessage: true,
                    };

                    setMessages([greetingMessage]);
                }
            } catch (error) {
                console.error('데이터 로딩 중 오류: ', error);
                setError(
                    error.message || '데이터를 불러오는데 문제가 발생했습니다.'
                );
            } finally {
                setIsLoading(false);
            }
        };

        if (sessionId) {
            fetchStoreAndHistory();

            // 세션 ID를 로그인 상태에 따라 적절한 키로 저장
            if (user) {
                localStorage.setItem(
                    `chat_user_${user.id}_chatbot_${id}`,
                    sessionId
                );
            } else {
                localStorage.setItem(`chat_session_${id}`, sessionId);
            }
        }

        return () => {
            // 언마운트 시 작업
        };
    }, [id, sessionId, user]);

    // 메시지 스크롤 자동 이동
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 메시지 전송 함수
    const sendMessage = async () => {
        if (!newMessage.trim() || isSending) return;

        const userMessage = {
            id: `user_${Date.now()}`,
            text: newMessage,
            isUser: true,
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMessage]);
        setNewMessage('');
        setIsSending(true);

        try {
            if (!chatbotId) {
                throw new Error('챗봇 ID를 찾을 수 없습니다.');
            }

            // 위치 정보 가져오기 (선택 사항)
            let location = null;
            if (navigator.geolocation) {
                try {
                    const position = await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            resolve,
                            reject,
                            {
                                timeout: 5000,
                                maximumAge: 10000,
                            }
                        );
                    });

                    location = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    };
                } catch (e) {
                    console.log('위치 정보를 가져올 수 없습니다:', e);
                }
            }

            // 요청 본문 구성
            const requestBody = {
                message: newMessage,
                sessionId: sessionId,
            };

            // 위치 정보가 있으면 추가
            if (location) {
                requestBody.location = location;
            }

            // 헤더 구성 - 로그인한 경우 인증 토큰 추가
            const headers = {
                'Content-Type': 'application/json',
            };

            if (user) {
                const token = localStorage.getItem('accessToken');
                if (token) {
                    headers['Authorization'] = `Bearer ${token}`;
                }
            }

            const response = await fetch(`/api/chatbots/${chatbotId}/chat`, {
                method: 'POST',
                headers,
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                throw new Error('챗봇 응답을 받는데 실패했습니다.');
            }

            const responseData = await response.json();

            // 응답에서 세션 ID 확인 및 업데이트 (첫 메시지인 경우)
            if (responseData.data.sessionId && !sessionIdSet) {
                setSessionId(responseData.data.sessionId);

                // 로그인 상태에 따라 적절한 키로 sessionId 저장
                if (user) {
                    localStorage.setItem(
                        `chat_user_${user.id}_chatbot_${id}`,
                        responseData.data.sessionId
                    );
                } else {
                    localStorage.setItem(
                        `chat_session_${id}`,
                        responseData.data.sessionId
                    );
                }

                setSessionIdSet(true);
            }

            const botMessage = {
                id: `bot_${Date.now()}`,
                text: responseData.data.response
                    .replace(/undefined/g, '')
                    .trim(),
                isUser: false,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, botMessage]);
        } catch (error) {
            console.error('메시지 전송 중 오류', error);

            const errorMessage = {
                id: `error_${Date.now()}`,
                text: '죄송합니다, 메시지를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
                isUser: false,
                isError: true,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, errorMessage]);
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
                    aria-label="뒤로 가기"
                >
                    <FiArrowLeft />
                </button>
                <h1 className={styles.storeName}>
                    {isLoading
                        ? '로딩 중 ...'
                        : store?.name || '점포 정보 없음'}
                </h1>
            </header>

            <div className={styles.messageContainer}>
                {isLoading ? (
                    <div className={styles.loadingContainer}>
                        <div className={styles.loading}>
                            메시지를 불러오는 중...
                        </div>
                    </div>
                ) : error ? (
                    <div className={styles.errorContainer}>
                        <div className={styles.error}>{error}</div>
                        <button
                            className={styles.retryButton}
                            onClick={() => window.location.reload()}
                        >
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`${styles.message} ${
                                    message.isUser
                                        ? styles.userMessage
                                        : styles.botMessage
                                } ${
                                    message.isError ? styles.errorMessage : ''
                                }`}
                            >
                                {!message.isUser && (
                                    <div className={styles.botAvatar}>
                                        <img
                                            src={
                                                store?.image_url ||
                                                '/placeholder-store.jpg'
                                            }
                                            alt={store?.name}
                                            className={styles.avatarImage}
                                            onError={(e) => {
                                                e.target.src =
                                                    '/placeholder-store.jpg';
                                            }}
                                        />
                                    </div>
                                )}
                                <div className={styles.messageContent}>
                                    <MessageText message={message} />
                                    <div className={styles.messageTime}>
                                        {message.timestamp &&
                                        typeof message.timestamp
                                            .toLocaleTimeString === 'function'
                                            ? message.timestamp.toLocaleTimeString(
                                                  [],
                                                  {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  }
                                              )
                                            : new Date().toLocaleTimeString(
                                                  [],
                                                  {
                                                      hour: '2-digit',
                                                      minute: '2-digit',
                                                  }
                                              )}
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />

                        {isSending && (
                            <div
                                className={`${styles.message} ${styles.botMessage}`}
                            >
                                <div className={styles.botAvatar}>
                                    <img
                                        src={
                                            store?.image_url ||
                                            '/placeholder-store.jpg'
                                        }
                                        alt={store?.name}
                                        className={styles.avatarImage}
                                        onError={(e) => {
                                            e.target.src =
                                                '/placeholder-store.jpg';
                                        }}
                                    />
                                </div>
                                <div className={styles.typingIndicator}>
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
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
                    className={`${styles.sendButton} ${
                        !newMessage.trim() || isSending ? styles.disabled : ''
                    }`}
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

// 메시지 텍스트 컴포넌트 - 타이핑 효과 적용
const MessageText = ({ message }) => {
    // message.text가 undefined인 경우 빈 문자열로 대체
    const messageText = (message.text || '').replace(/undefined/g, '').trim();
    const skipTyping = message.isUser || message.isHistoryMessage;

    const { text, isComplete, completeTyping } = useTypewriter(
        messageText,
        30,
        skipTyping
    );

    return (
        <div
            className={styles.messageText}
            onClick={() => !isComplete && completeTyping()}
        >
            {text}
            {!isComplete && <span className={styles.cursor}>|</span>}
        </div>
    );
};

MessageText.propTypes = {
    message: PropTypes.shape({
        text: PropTypes.string,
        isUser: PropTypes.bool,
        isHistoryMessage: PropTypes.bool,
        isError: PropTypes.bool,
    }).isRequired,
};

export default ChatPage;
