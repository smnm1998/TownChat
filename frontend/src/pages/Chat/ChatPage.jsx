import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import PropTypes from 'prop-types';
import useTypewriter from '../../hooks/useTypeWriter';
import useChatStore from '../../store/chatStore';
import styles from './ChatPage.module.css';

// 인증 헤더 가져오는 함수 추가
const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const ChatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [newMessage, setNewMessage] = useState('');
    const [store, setStore] = useState(null);

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
        setError,  // setError 함수 추가
        reset
    } = useChatStore();

    // 이미지 URL 처리 함수 추가
    const getImageUrl = (message) => {
        // 1. 히스토리 메시지이고 botProfileImage가 있는 경우
        if (message.isHistoryMessage && message.botProfileImage) {
            console.log(`[ChatPage] 히스토리 메시지(${message.id})의 이미지 URL:`, message.botProfileImage);
            
            // 이미지 URL이 http로 시작하는 경우 그대로 사용
            if (message.botProfileImage.startsWith('http')) {
                return message.botProfileImage;
            }
            
            // 상대 경로 처리 (앞에 / 있는 경우와 없는 경우 처리)
            return `${window.location.origin}${message.botProfileImage.startsWith('/') ? '' : '/'}${message.botProfileImage}`;
        }
        
        // 2. 일반 메시지의 경우 store 객체의 이미지 사용
        if (store?.image_url) {
            console.log(`[ChatPage] 일반 메시지의 store 이미지 URL:`, store.image_url);
            
            // 이미지 URL이 http로 시작하는 경우 그대로 사용
            if (store.image_url.startsWith('http')) {
                return store.image_url;
            }
            
            // 상대 경로 처리
            return `${window.location.origin}${store.image_url.startsWith('/') ? '' : '/'}${store.image_url}`;
        }
        
        // 3. 이미지가 없는 경우 기본 이미지 사용
        return `${window.location.origin}/placeholder-store.jpg`;
    };

    // 이미지 로드 오류 처리 함수 추가
    const handleImageError = (e) => {
        console.log('이미지 로드 실패:', e.target.src);
        e.target.src = `${window.location.origin}/placeholder-store.jpg`;
        e.target.onerror = null; // 무한 루프 방지
    };

    // 컴포넌트 마운트 시 상태 초기화
    useEffect(() => {
        // 클린업 함수에서 상태 초기화
        return () => reset();
    }, [reset]);

    // URL 쿼리 파라미터에서 세션 ID와 스레드 ID 설정
    useEffect(() => {
        // URL 쿼리 파라미터에서 세션 ID와 스레드 ID 추출
        const queryParams = new URLSearchParams(location.search);
        const querySessionId = queryParams.get('session');
        const queryThreadId = queryParams.get('thread');
        
        // 디버깅 로그 추가
        console.log('[ChatPage] URL 쿼리 파라미터:');
        console.log('- sessionId:', querySessionId);
        console.log('- threadId:', queryThreadId);

        // 우선순위: URL 쿼리 파라미터 > 로컬스토리지
        if (querySessionId) {
            console.log('[ChatPage] URL에서 세션 ID 설정:', querySessionId);
            setSessionId(querySessionId);
        }
        
        if (queryThreadId) {
            console.log('[ChatPage] URL에서 스레드 ID 설정:', queryThreadId);
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
                console.log('[ChatPage] 저장된 사용자 세션 ID 사용:', savedUserSession);
                setSessionId(savedUserSession);
            } else {
                const newUserSessionId = `session_user_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                console.log('[ChatPage] 새 사용자 세션 ID 생성:', newUserSessionId);
                localStorage.setItem(userSessionKey, newUserSessionId);
                setSessionId(newUserSessionId);
            }
        } else {
            // 비로그인 사용자는 기존 방식으로 sessionId 관리
            const anonymousSessionKey = `chat_session_${id}`;
            const savedSessionId = localStorage.getItem(anonymousSessionKey);
            
            if (savedSessionId) {
                console.log('[ChatPage] 저장된 익명 세션 ID 사용:', savedSessionId);
                setSessionId(savedSessionId);
            } else {
                const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
                console.log('[ChatPage] 새 익명 세션 ID 생성:', newSessionId);
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
            console.log(`[ChatPage] URL 경로 분석: ${location.pathname} -> 타입: ${type}, ID: ${pathId}`);
            
            if (!pathId) {
                setError('유효하지 않은 접근입니다.');
                return;
            }
            
            try {
                let result;
                
                if (type === 'store') {
                    // 점포 ID인 경우: 점포 정보를 먼저 가져오고 연결된 챗봇 조회
                    console.log(`[ChatPage] 점포 ID ${pathId}로 챗봇 조회 중...`);
                    
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
                    
                    result = {
                        store: storeData.data,
                        chatbot: chatbotData.data
                    };
                    
                } else if (type === 'chatbot') {
                    // 챗봇 ID인 경우: 직접 챗봇 정보 조회
                    console.log(`[ChatPage] 챗봇 ID ${pathId} 직접 사용`);
                    
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
                    
                    result = {
                        chatbot: chatbotData.data,
                        store: chatbotData.data.Store
                    };
                } else {
                    throw new Error('유효하지 않은 URL 경로입니다.');
                }
                
                if (result) {
                    // 결과 로깅
                    // console.log('[ChatPage] 불러온 데이터:', result);
                    // console.log('[ChatPage] - 챗봇 ID:', result.chatbot?.id);
                    // console.log('[ChatPage] - 스토어 ID:', result.store?.id);
                }
            } catch (error) {
                console.error('[ChatPage] 데이터 로딩 중 오류:', error);
                setError(error.message);
            }
        };
        
        loadStoreAndChatbot();
    }, [location.pathname, setError, setChatbotId]);

    // 채팅 기록 로드 (세션 ID와 챗봇 ID가 모두 있는 경우에만)
    useEffect(() => {
        if (!sessionId || !chatbotId) {
            // console.log('[ChatPage] 세션ID 또는 챗봇ID가 없어 채팅 기록을 로드할 수 없습니다.');
            // console.log('- sessionId:', sessionId);
            // console.log('- chatbotId:', chatbotId);
            // console.log('- threadId:', threadId);
            return;
        }
        
        const loadChatHistory = async () => {
            // console.log('[ChatPage] 채팅 기록 로드 시작:');
            // console.log('- chatbotId:', chatbotId);
            // console.log('- sessionId:', sessionId);
            // console.log('- threadId:', threadId);
            
            const chatHistory = await fetchChatHistory({
                chatbotId,
                sessionId,
                threadId
            });
            
            // 히스토리 로드 결과 로깅
            // console.log(`[ChatPage] 채팅 기록 로드 완료: ${chatHistory.length}개 메시지`);
            
            // 채팅 기록이 없는 경우 인사말 표시
            if (chatHistory.length === 0 && store) {
                // console.log('[ChatPage] 대화 기록 없음, 인사말 표시');
                setGreetingMessage(store.greeting_message || '안녕하세요! 무엇을 도와드릴까요?');
            }
        };
        
        loadChatHistory();
    }, [chatbotId, sessionId, threadId, fetchChatHistory, store, setGreetingMessage]);

    // 메시지 스크롤 자동 이동
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // 이미지 디버깅을 위한 useEffect 추가
    useEffect(() => {
        // 이미지 URL 확인
        if (store?.image_url) {
            console.log('[ChatPage] 점포 이미지 URL 확인:', store.image_url);
            
            // 이미지 존재 여부 체크
            const testImage = new Image();
            testImage.onload = () => {
                console.log('✅ 점포 이미지 로드 성공:', store.image_url);
            };
            testImage.onerror = () => {
                console.log('❌ 점포 이미지 로드 실패:', store.image_url);
                console.log('절대 경로 확인:', `${window.location.origin}${store.image_url.startsWith('/') ? '' : '/'}${store.image_url}`);
            };
            
            // 이미지 로드 시도
            if (store.image_url.startsWith('http')) {
                testImage.src = store.image_url;
            } else {
                testImage.src = `${window.location.origin}${store.image_url.startsWith('/') ? '' : '/'}${store.image_url}`;
            }
        }
        
        // 메시지의 이미지 URL도 확인
        messages.forEach(msg => {
            if (!msg.isUser && msg.isHistoryMessage && msg.botProfileImage) {
                console.log('[ChatPage] 메시지 이미지 URL 확인:', msg.botProfileImage);
                
                // 이미지 존재 여부 체크
                const testImage = new Image();
                testImage.onload = () => {
                    console.log(`✅ 메시지(${msg.id}) 이미지 로드 성공:`, msg.botProfileImage);
                };
                testImage.onerror = () => {
                    console.log(`❌ 메시지(${msg.id}) 이미지 로드 실패:`, msg.botProfileImage);
                };
                
                // 이미지 로드 시도
                if (msg.botProfileImage.startsWith('http')) {
                    testImage.src = msg.botProfileImage;
                } else {
                    testImage.src = `${window.location.origin}${msg.botProfileImage.startsWith('/') ? '' : '/'}${msg.botProfileImage}`;
                }
            }
        });
    }, [store, messages]);

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
                                {!message.isUser && (
                                    <div className={styles.botAvatar}>
                                        <img
                                            src={getImageUrl(message)}
                                            alt={message.storeName || store?.name || '점포 이미지'}
                                            className={styles.avatarImage}
                                            onError={handleImageError}
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
                                        store?.image_url
                                        ? (
                                            store.image_url.startsWith('http')
                                            ? store.image_url
                                            : `${window.location.origin}${store.image_url.startsWith('/') ? '' : '/'}${store.image_url}`
                                        )
                                        : `${window.location.origin}/placeholder-store.jpg`
                                    }
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