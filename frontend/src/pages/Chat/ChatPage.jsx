import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import PropTypes from 'prop-types';
import useTypewriter from '../../hooks/useTypeWriter';
import useChatStore from '../../store/chatStore';
import { MarkdownRenderer } from '../../utils/MarkdownParser';
import styles from './ChatPage.module.css';

// 인증 헤더 가져오는 함수 추가
const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// MessageAvatar 컴포넌트 - 별도 정의하여 ESLint 오류 해결
const MessageAvatar = ({ message, store }) => {
    // 봇 메시지인 경우에만 아바타 표시
    if (message.isUser) return null;
    
    // 이미지 URL 결정 - 우선순위: 메시지의 이미지 > 스토어 이미지 > 기본 이미지
    let imageUrl = '/placeholder-store.jpg';
    
    if (message.botProfileImage) {
        imageUrl = getImageUrl(message.botProfileImage);
    } else if (store && store.image_url) {
        imageUrl = getImageUrl(store.image_url);
    }
    
    // ref 추가하여 이미지 로딩 상태 추적
    const imgRef = useRef(null);
    const [loaded, setLoaded] = useState(false);
    
    useEffect(() => {
        // 이미지가 이미 캐시되었는지 확인
        if (imgRef.current && imgRef.current.complete) {
            setLoaded(true);
        }
    }, []);
    
    return (
        <div className={styles.botAvatar}>
            {!loaded && <div className={styles.avatarPlaceholder}></div>}
            <img
                ref={imgRef}
                src={imageUrl}
                alt={message.storeName || store?.name || '점포 이미지'}
                className={`${styles.avatarImage} ${loaded ? '' : 'hidden'}`}
                onLoad={() => setLoaded(true)}
                onError={handleImageError}
            />
        </div>
    );
};

// 이미지 URL 처리 함수 - 컴포넌트 외부로 이동
const getImageUrl = (imageUrl) => {
    if (!imageUrl) {
        return '/placeholder-store.jpg'; // 상대 경로로 변경
    }
    
    // 이미지 URL이 http로 시작하는 경우 그대로 사용
    if (imageUrl.startsWith('http')) {
        return imageUrl;
    }
    
    // 슬래시로 시작하지 않는 경우 추가
    const pathWithLeadingSlash = imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`;
    return pathWithLeadingSlash; // 상대 경로로 변경 (window.location.origin 제거)
};

// 이미지 로드 오류 처리 함수 - 컴포넌트 외부로 이동
const handleImageError = (e) => {
    e.target.src = '/placeholder-store.jpg'; // 상대 경로로 변경
    e.target.onerror = null; // 무한 루프 방지
};

// 메시지 텍스트 컴포넌트 - 별도 정의하여 ESLint 오류 해결
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
            {isComplete ? (
                <MarkdownRenderer content={text} className={styles.markdownContent} />
            ) : (
                <>
                    {text}
                    <span className={styles.cursor}>|</span>
                </>
            )}
        </div>
    );
};

const ChatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [newMessage, setNewMessage] = useState('');
    const [store, setStore] = useState(null);
    const [storeImageLoaded, setStoreImageLoaded] = useState(false);

    // URL 쿼리 파라미터에서 세션 ID와 스레드 ID 추출
    const queryParams = new URLSearchParams(location.search);
    const querySessionId = queryParams.get('session');

    // Zustand 스토어에서 상태 및 액션 가져오기
    const {
        messages,
        isLoading,
        isSending,
        error,
        threadId,
        sessionId,
        chatbotId,
        user,
        fetchUserInfo,
        fetchChatHistory,
        setGreetingMessage,
        sendMessage,
        setSessionId,
        setThreadId,
        setChatbotId,
        setError,
        reset
    } = useChatStore();

    // 미리 이미지 로드 - 성능 개선
    useEffect(() => {
        // 스토어 이미지가 있을 때만 처리
        if (store?.image_url) {
            const img = new Image();
            img.src = getImageUrl(store.image_url);
            
            // 이미지 로드 이벤트 핸들러
            img.onload = () => setStoreImageLoaded(true);
            img.onerror = () => {
                console.log("Store image failed to load:", store.image_url);
                setStoreImageLoaded(false);
            };
            
            // 이미 캐시에 있는 경우 (complete가 true)
            if (img.complete) {
                setStoreImageLoaded(true);
            }
        }
    }, [store]);

    // 컴포넌트 마운트 시 상태 초기화
    useEffect(() => {
        // 클린업 함수에서 상태 초기화
        return () => reset();
    }, [reset]);

    // URL 쿼리 파라미터에서 세션 ID와 스레드 ID 설정
    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const querySessionId = queryParams.get('session');
        const queryThreadId = queryParams.get('thread');

        // 우선순위: URL 쿼리 파라미터 > 로컬스토리지
        if (querySessionId) {
            setSessionId(querySessionId);
        }
        
        if (queryThreadId) {
            setThreadId(queryThreadId);
        }
    }, [location.search, setSessionId, setThreadId]);

    // 사용자 정보 로드
    useEffect(() => {
        fetchUserInfo();
    }, [fetchUserInfo]);

    // 세션 ID 설정 (URL에서 받지 않은 경우)
    useEffect(() => {
        if (querySessionId) return; // URL에서 이미 받았으면 건너뛰기
        
        // 로그인 상태에 따라 세션 ID 설정
        const token = localStorage.getItem('accessToken');
        const userId = localStorage.getItem('userId');

        if (token && userId) {
            // 로그인한 사용자는 userId + chatbotId 조합으로 세션 관리
            const userSessionKey = `chat_user_${userId}_chatbot_${id}`;
            const savedUserSession = localStorage.getItem(userSessionKey);
            
            if (savedUserSession) {
                setSessionId(savedUserSession);
            } else {
                const newUserSessionId = `session_user_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                localStorage.setItem(userSessionKey, newUserSessionId);
                setSessionId(newUserSessionId);
            }
        } else {
            // 비로그인 사용자는 기존 방식으로 sessionId 관리
            const anonymousSessionKey = `chat_session_${id}`;
            const savedSessionId = localStorage.getItem(anonymousSessionKey);
            
            if (savedSessionId) {
                setSessionId(savedSessionId);
            } else {
                const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                localStorage.setItem(anonymousSessionKey, newSessionId);
                setSessionId(newSessionId);
            }
        }
    }, [id, querySessionId, user, setSessionId]);

    const extractIdFromPath = (path) => {
        // URL 경로가 "/store/{id}/chat" 형태인지 확인
        const storePathMatch = path.match(/\/store\/(\d+)\/chat/);
        if (storePathMatch) {
            return { type: 'store', id: storePathMatch[1] };
        }
        
        // URL 경로가 "/chat/{id}" 형태인지 확인
        const chatPathMatch = path.match(/\/chat\/(\d+)/);
        if (chatPathMatch) {
            return { type: 'chatbot', id: chatPathMatch[1] };
        }
        
        return { type: null, id: null };
    };

    // 점포 및 챗봇 정보 로드
    useEffect(() => {
        const loadStoreAndChatbot = async () => {
            // 현재 URL 경로에서 ID 타입 및 값 추출
            const { type, id: pathId } = extractIdFromPath(location.pathname);
            
            if (!pathId) {
                setError('유효하지 않은 접근입니다.');
                return;
            }
            
            try {
                if (type === 'store') {
                    // 점포 ID인 경우: 점포 정보를 먼저 가져오고 연결된 챗봇 조회
                    // 점포 정보 조회
                    const storeResponse = await fetch(`/api/stores/${pathId}`, {
                        headers: getAuthHeaders()
                    });
                    
                    if (!storeResponse.ok) {
                        throw new Error('점포 정보를 불러오는데 실패했습니다.');
                    }
                    
                    const storeData = await storeResponse.json();
                    setStore(storeData.data);
                    
                    // 챗봇 정보 조회
                    const chatbotResponse = await fetch(`/api/chatbots/store/${pathId}`, {
                        headers: getAuthHeaders()
                    });
                    
                    if (!chatbotResponse.ok) {
                        throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                    }
                    
                    const chatbotData = await chatbotResponse.json();
                    setChatbotId(chatbotData.data.id);
                    
                } else if (type === 'chatbot') {
                    // 챗봇 ID인 경우: 직접 챗봇 정보 조회
                    // 챗봇 정보 직접 조회
                    const chatbotResponse = await fetch(`/api/chatbots/${pathId}`, {
                        headers: getAuthHeaders()
                    });
                    
                    if (!chatbotResponse.ok) {
                        throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                    }
                    
                    const chatbotData = await chatbotResponse.json();
                    setChatbotId(pathId); // 중요: pathId를 직접 사용
                    
                    // 챗봇 데이터에 Store 정보가 포함되어 있음
                    if (chatbotData.data && chatbotData.data.Store) {
                        setStore(chatbotData.data.Store);
                    }
                } else {
                    throw new Error('유효하지 않은 URL 경로입니다.');
                }
            } catch (error) {
                setError(error.message);
            }
        };
        
        loadStoreAndChatbot();
    }, [location.pathname, setError, setChatbotId]);

    // 채팅 기록 로드 (세션 ID와 챗봇 ID가 모두 있는 경우에만)
    useEffect(() => {
        if (!sessionId || !chatbotId) {
            return;
        }
        
        const loadChatHistory = async () => {
            const chatHistory = await fetchChatHistory({
                chatbotId,
                sessionId,
                threadId
            });
            
            // 채팅 기록이 없는 경우 인사말 표시
            if (chatHistory.length === 0 && store) {
                setGreetingMessage(store.greeting_message || '안녕하세요! 무엇을 도와드릴까요?');
            }
        };
        
        loadChatHistory();
    }, [chatbotId, sessionId, threadId, fetchChatHistory, store, setGreetingMessage]);

    // 메시지 스크롤 자동 이동
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 메시지 전송 핸들러
    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        
        await sendMessage(newMessage);
        setNewMessage('');
        inputRef.current?.focus();
    };

    // 키 입력 핸들러
    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    // 뒤로가기 핸들러
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
                                {!message.isUser && <MessageAvatar message={message} store={store} />}
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
                                    src={getImageUrl(store?.image_url)}
                                    alt={store?.name || '점포 이미지'}
                                    className={styles.avatarImage}
                                    onError={handleImageError}
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
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || isSending}
                    aria-label="메시지 보내기"
                >
                    <FiSend />
                </button>
            </div>
        </div>
    );
};

// prop-types 검증 추가
MessageText.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.string,
        text: PropTypes.string,
        isUser: PropTypes.bool,
        isHistoryMessage: PropTypes.bool,
        isError: PropTypes.bool,
        timestamp: PropTypes.instanceOf(Date)
    }).isRequired
};

// MessageAvatar prop-types 추가
MessageAvatar.propTypes = {
    message: PropTypes.shape({
        isUser: PropTypes.bool,
        isHistoryMessage: PropTypes.bool,
        botProfileImage: PropTypes.string,
        storeName: PropTypes.string
    }).isRequired,
    store: PropTypes.shape({
        name: PropTypes.string,
        image_url: PropTypes.string
    })
};

export default ChatPage;