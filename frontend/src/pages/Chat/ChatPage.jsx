import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import PropTypes from 'prop-types';
import useTypewriter from '../../hooks/useTypeWriter';
import useChatStore from '../../store/chatStore';
import styles from './ChatPage.module.css';

const ChatPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [newMessage, setNewMessage] = useState('');

    // URL 쿼리 파라미터에서 세션 ID와 스레드 ID 추출
    const queryParams = new URLSearchParams(location.search);
    const querySessionId = queryParams.get('session');
    const queryThreadId = queryParams.get('thread');

    // Zustand 스토어에서 상태 및 액션 가져오기
    const {
        messages,
        isLoading,
        isSending,
        error,
        store,
        threadId,
        sessionId,
        chatbotId,
        user,
        fetchUserInfo,
        fetchStoreAndChatbot,
        fetchChatHistory,
        setGreetingMessage,
        sendMessage,
        setSessionId,
        setThreadId,
        setChatbotId,
        reset
    } = useChatStore();

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
        console.log('URL 쿼리 파라미터:');
        console.log('- sessionId:', querySessionId);
        console.log('- threadId:', queryThreadId);
      
        // 우선순위: URL 쿼리 파라미터 > 로컬스토리지
        if (querySessionId) {
          console.log('URL에서 세션 ID 설정:', querySessionId);
          setSessionId(querySessionId);
        }
        
        if (queryThreadId) {
          console.log('URL에서 스레드 ID 설정:', queryThreadId);
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
            setChatbotId(null); // 기존 챗봇 ID 초기화
            
            // 현재 URL 경로에서 ID 타입 및 값 추출
            const { type, id: pathId } = extractIdFromPath(location.pathname);
            console.log(`URL 경로 분석: ${location.pathname} -> 타입: ${type}, ID: ${pathId}`);
            
            if (!pathId) {
                setError('유효하지 않은 접근입니다.');
                return;
            }
            
            try {
                let result;
                
                if (type === 'store') {
                    // 점포 ID인 경우: 점포 정보를 먼저 가져오고 연결된 챗봇 조회
                    console.log(`점포 ID ${pathId}로 챗봇 조회 중...`);
                    result = await fetchStoreAndChatbot(pathId);
                } else if (type === 'chatbot') {
                    // 챗봇 ID인 경우: 직접 챗봇 정보 조회
                    console.log(`챗봇 ID ${pathId} 직접 사용`);
                    
                    // 챗봇 정보 직접 조회
                    const chatbotResponse = await fetch(`/api/chatbots/${pathId}`, {
                        headers: getAuthHeaders()
                    });
                    
                    if (!chatbotResponse.ok) {
                        throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                    }
                    
                    const chatbotData = await chatbotResponse.json();
                    setChatbotId(pathId);
                    
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
                    console.log('불러온 데이터:', result);
                    console.log('- 챗봇 ID:', result.chatbot?.id);
                    console.log('- 스토어 ID:', result.store?.id);
                    
                    // 챗봇 ID 설정
                    setChatbotId(result.chatbot.id);
                }
            } catch (error) {
                console.error('데이터 로딩 중 오류:', error);
                setError(error.message);
            }
        };
        
        loadStoreAndChatbot();
    }, [location.pathname, fetchStoreAndChatbot, setChatbotId]);

    // 채팅 기록 로드 (세션 ID와 챗봇 ID가 모두 있는 경우에만)
    useEffect(() => {
        if (!sessionId || !chatbotId) {
          console.log('세션ID 또는 챗봇ID가 없어 채팅 기록을 로드할 수 없습니다.');
          console.log('- sessionId:', sessionId);
          console.log('- chatbotId:', chatbotId);
          console.log('- threadId:', threadId);
          return;
        }
        
        const loadChatHistory = async () => {
          console.log('채팅 기록 로드 시작:');
          console.log('- chatbotId:', chatbotId);
          console.log('- sessionId:', sessionId);
          console.log('- threadId:', threadId);
          
          const chatHistory = await fetchChatHistory({
            chatbotId,
            sessionId,
            threadId
          });
          
          // 히스토리 로드 결과 로깅
          console.log(`채팅 기록 로드 완료: ${chatHistory.length}개 메시지`);
          
          // 채팅 기록이 없는 경우 인사말 표시
          if (chatHistory.length === 0 && store) {
            console.log('대화 기록 없음, 인사말 표시');
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