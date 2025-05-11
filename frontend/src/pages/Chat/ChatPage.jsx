import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { FiArrowLeft, FiSend } from 'react-icons/fi';
import PropTypes from 'prop-types';
import useTypewriter from '../../hooks/useTypeWriter'; // '@hooks/useTypeWriter' 사용 가능
import useChatStore from '../../store/chatStore';       // '@store/chatStore' 사용 가능
import { MarkdownRenderer } from '../../utils/MarkdownParser'; // 경로 확인
import styles from './ChatPage.module.css';

// 프록시를 통해 백엔드의 '/uploads/stores/' 경로에 접근하므로, BASE_URL은 필요 없습니다.
// 모든 이미지 경로는 프론트엔드 루트 기준의 상대 경로로 작성합니다.
const DEFAULT_PLACEHOLDER_IMAGE_PATH = '/uploads/stores/placeholder-store.jpg';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const getFinalImageUrl = (imageUrlFromApi) => {

    if (!imageUrlFromApi || typeof imageUrlFromApi !== 'string' || imageUrlFromApi.trim() === '') {
        return DEFAULT_PLACEHOLDER_IMAGE_PATH;
    }

    // 시나리오 1: API가 이미 전체 URL을 제공하는 경우 (예: 외부 CDN 이미지)
    if (imageUrlFromApi.startsWith('http://') || imageUrlFromApi.startsWith('https://')) {
        return imageUrlFromApi;
    }

    // 시나리오 2: API가 "/uploads/stores/파일명.jpg" 형태의 서버 루트 기준 상대 경로를 제공하는 경우
    // 이 경로는 프록시에 의해 백엔드로 전달됩니다.
    if (imageUrlFromApi.startsWith('/uploads/stores/')) {
        return imageUrlFromApi; // 프록시가 있으므로 BASE_URL 없이 그대로 사용
    }

    // 시나리오 3: API가 "파일명.jpg"만 제공하는 경우 (uploads/stores/ 경로는 고정이라고 가정)
    // 또는 "/파일명.jpg" (앞에 슬래시 하나만 있는 경우)
    // 또는 "uploads/stores/파일명.jpg" (앞에 슬래시가 없는 경우)
    // 이 경우는 경로를 재구성해준다.
    let potentialRelativePath = imageUrlFromApi;
    if (!potentialRelativePath.startsWith('/')) {
        potentialRelativePath = `/${potentialRelativePath}`; // 앞에 슬래시가 없으면 붙여줌
    }
    if (!potentialRelativePath.startsWith('/uploads/stores/')) {
        // '/uploads/stores/'가 아닌 다른 상대 경로이거나, 순수 파일명일 경우
        // 여기서는 '/uploads/stores/'를 붙여주는 것으로 가정 (API 스펙에 따라 조정 필요)
        if (potentialRelativePath.startsWith('/')) { // 예: /filename.jpg
             potentialRelativePath = `/uploads/stores${potentialRelativePath}`; // /uploads/stores/filename.jpg
        } else { // 예: filename.jpg (이 경우는 위에서 이미 /filename.jpg로 변환됨)
            potentialRelativePath = `/uploads/stores/${potentialRelativePath.substring(1)}`; // /uploads/stores/filename.jpg
        }
        return potentialRelativePath;
    }


    // 위의 모든 조건에 해당하지 않는 예상치 못한 형식의 경우
    console.warn(`%c[getFinalImageUrl] WARNING: Unexpected image URL format: "${imageUrlFromApi}". Returning DEFAULT_PLACEHOLDER: "${DEFAULT_PLACEHOLDER_IMAGE_PATH}"`, 'color: red; font-weight: bold;');
    return DEFAULT_PLACEHOLDER_IMAGE_PATH;
};

// --- MessageAvatar, MessageText, ChatPage 컴포넌트의 나머지 부분은 이전 답변과 동일하게 유지 ---
// (단, ChatPage 상단의 BACKEND_BASE_URL 상수는 제거 또는 주석 처리)

const MessageAvatar = ({ message, store: propStore }) => {
    const imageUrlToLoad = getFinalImageUrl(message?.botProfileImage || propStore?.image_url);
    // console.log(`[MessageAvatar] ID: ${message?.id} - 결정된 imageUrlToLoad: "${imageUrlToLoad}"`);

    const [currentSrc, setCurrentSrc] = useState(imageUrlToLoad);
    const [hasError, setHasError] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);
    const imgRef = useRef(null);

    useEffect(() => {
        setCurrentSrc(imageUrlToLoad);
        setHasError(false);
        setIsLoaded(false);
    }, [imageUrlToLoad, message?.id]);

    useEffect(() => {
        if (!currentSrc) { setIsLoaded(true); return; }
        const img = new Image();
        img.src = currentSrc; // 이제 이 currentSrc는 /uploads/stores/... 형태의 상대 경로가 됨
        let isMounted = true;
        if (img.complete) {
            if (isMounted) { setIsLoaded(true); setHasError(false); }
        } else {
            setIsLoaded(false);
            img.onload = () => { if (isMounted) { setIsLoaded(true); setHasError(false); } };
            img.onerror = () => {
                if (isMounted) {
                    setHasError(true); setIsLoaded(true);
                    if (currentSrc !== DEFAULT_PLACEHOLDER_IMAGE_PATH) { setCurrentSrc(DEFAULT_PLACEHOLDER_IMAGE_PATH); }
                }
            };
        }
        return () => { isMounted = false; };
    }, [currentSrc, message?.id]);

    if (message?.isUser) return null;
    const altText = message?.storeName || propStore?.name || '점포 이미지';
    return (
        <div className={styles.botAvatar}>
            {!isLoaded && <div className={styles.avatarPlaceholder}><span>L</span></div>}
            <img ref={imgRef} src={currentSrc} alt={altText} className={`${styles.avatarImage} ${isLoaded ? '' : styles.hidden} ${hasError ? styles.avatarError : ''}`} />
        </div>
    );
};

const MessageText = ({ message }) => {
    const textForTypewriter = message.text || '';
    const skipTypingEffect = Boolean(message.isUser || message.isHistoryMessage);
    const { text: typewrittenText, isComplete, completeTyping } = useTypewriter(textForTypewriter, 30, skipTypingEffect);
    return (
        <div className={styles.messageText} onClick={() => { if (!isComplete) completeTyping(); }}>
            {isComplete ? <MarkdownRenderer content={typewrittenText} className={styles.markdownContent} /> : (<>{typewrittenText}<span className={styles.cursor}>|</span></>)}
        </div>
    );
};

const ChatPage = () => {
    const { id: routeId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const [newMessage, setNewMessage] = useState('');
    const [localStore, setLocalStore] = useState(null);

    const { messages, isLoading, isSending, error, threadId, sessionId, chatbotId, user,
            fetchUserInfo, fetchChatHistory, setGreetingMessage, sendMessage,
            setSessionId, setThreadId, setChatbotId, setError: setChatError, reset,
            setStore: setZustandStore,
    } = useChatStore();

    useEffect(() => {
        const init = async () => {
            await fetchUserInfo();
            const params = new URLSearchParams(location.search);
            const qSessionId = params.get('session');
            const qThreadId = params.get('thread');
            if (qSessionId) { setSessionId(qSessionId); }
            else if (routeId) {
                const token = localStorage.getItem('accessToken');
                const uId = localStorage.getItem('userId');
                const entityId = routeId;
                const pfx = (token && uId) ? `user_${uId}` : 'anon';
                const key = `chat_${pfx}_entity_${entityId}`;
                let csid = localStorage.getItem(key);
                if (!csid) { csid = `session_${pfx}_${Date.now()}_${Math.random().toString(36).substring(2,9)}`; localStorage.setItem(key, csid); }
                setSessionId(csid);
            }
            if (qThreadId) setThreadId(qThreadId);
        };
        init();
    }, [routeId, location.search, fetchUserInfo, setSessionId, setThreadId, reset]);

    const extractIdFromPath = (path) => {
        const storeMatch = path.match(/\/store\/(\d+)\/chat/); if (storeMatch) return { type: 'store', id: storeMatch[1] };
        const chatMatch = path.match(/\/chat\/(\d+)/); if (chatMatch) return { type: 'chatbot', id: chatMatch[1] };
        return { type: null, id: null };
    };

    useEffect(() => {
        if (!routeId) return;
        const loadStoreAndBotData = async () => {
            const { type, id: pathId } = extractIdFromPath(location.pathname);
            if (!pathId) { setChatError('유효하지 않은 접근'); return; }
            try {
                let storeInfo = null; let cId = null;
                if (type === 'store') {
                    const storeRes = await fetch(`/api/stores/${pathId}`, { headers: getAuthHeaders() });
                    if (!storeRes.ok) throw new Error('점포 정보를 불러오는데 실패했습니다.');
                    storeInfo = (await storeRes.json()).data; // <<--- 이 storeInfo.data 객체 안에 image_url이 있는지 확인!
                } else if (type === 'chatbot') {
                    const botRes = await fetch(`/api/chatbots/${pathId}`, { headers: getAuthHeaders() });
                    if (!botRes.ok) throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                    const botData = await botRes.json();
                    cId = pathId;
                    storeInfo = botData.data?.Store || { name: '챗봇', image_url: null, /*...*/ }; // <<--- 이 botData.data.Store 객체 안에 image_url이 있는지 확인!
                } else throw new Error('유효하지 않은 URL');

                if (storeInfo) {
                    console.log(`%c[ChatPage] Store data loaded. storeInfo from API:`, 'color: green; font-weight: bold;', JSON.stringify(storeInfo, null, 2)); // ★★★ 이 로그를 다시 확인!
                    setLocalStore(storeInfo);
                    setZustandStore(storeInfo);
                }
                if (cId) setChatbotId(cId);
            } catch (e) { console.error('[ChatPage] Error loading store/bot data:', e); setChatError(e.message); setLocalStore(null); setZustandStore(null); }
        };
        loadStoreAndBotData();
    }, [routeId, location.pathname, setChatError, setChatbotId, setZustandStore]);

    useEffect(() => {
        if (!sessionId || !chatbotId) return;
        const loadHistory = async () => {
            try {
                const history = await fetchChatHistory({ chatbotId, sessionId, threadId });
                if ((!history || history.length === 0) && localStore) {
                    setGreetingMessage(localStore.greeting_message || `안녕하세요! ${localStore.name}입니다.`);
                }
            } catch (e) { console.error('[ChatPage] Error loading chat history:', e); if (localStore) setGreetingMessage(localStore.greeting_message || `안녕하세요! ${localStore.name}입니다.`); }
        };
        loadHistory();
    }, [chatbotId, sessionId, threadId, fetchChatHistory, localStore, setGreetingMessage]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const handleSendMessage = async () => {
        if (!newMessage.trim() || isSending) return;
        console.log('[ChatPage] handleSendMessage - localStore at this moment:', JSON.stringify(localStore, null, 2)); // ★★★ 이 로그 추가
        await sendMessage(newMessage, {
            botProfileImage: localStore?.image_url,
            storeName: localStore?.name
        });
        setNewMessage('');
        inputRef.current?.focus();
    };

    const handleKeyPress = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }};
    const handleGoBack = () => navigate(-1);
    const typingIndicatorAvatarMessage = { botProfileImage: localStore?.image_url, storeName: localStore?.name };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.backButton} onClick={handleGoBack} aria-label="뒤로 가기"><FiArrowLeft /></button>
                <h1 className={styles.storeName}>{isLoading && !localStore ? '로딩 중...' : localStore?.name || '점포 정보 없음'}</h1>
            </header>
            <div className={styles.messageContainer}>
                {(isLoading && messages.length === 0) ? <div className={styles.loadingContainer}><div className={styles.loading}>메시지 로딩 중...</div></div>
                : error ? <div className={styles.errorContainer}><div className={styles.error}>{error}</div><button className={styles.retryButton} onClick={() => window.location.reload()}>다시 시도</button></div>
                : (
                    <>
                        {messages.map((message) => (
                            <div key={message.id} className={`${styles.message} ${message.isUser ? styles.userMessage : styles.botMessage} ${message.isError ? styles.errorMessage : ''}`}>
                                {!message.isUser && <MessageAvatar message={message} store={localStore} />}
                                <div className={styles.messageContent}>
                                    <MessageText message={message} />
                                    <div className={styles.messageTime}>{new Date(message.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            </div>
                        ))}
                        <div ref={messagesEndRef} />
                        {isSending && (
                            <div className={`${styles.message} ${styles.botMessage}`}>
                                <MessageAvatar message={typingIndicatorAvatarMessage} store={localStore} />
                                <div className={styles.typingIndicator}><span></span><span></span><span></span></div>
                            </div>
                        )}
                    </>
                )}
            </div>
            <div className={styles.inputContainer}>
                <input type="text" className={styles.messageInput} placeholder="메시지를 입력하세요..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyPress={handleKeyPress} disabled={isLoading || isSending} ref={inputRef} />
                <button className={`${styles.sendButton} ${(!newMessage.trim() || isSending) ? styles.disabled : ''}`} onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} aria-label="메시지 보내기"><FiSend /></button>
            </div>
        </div>
    );
};

MessageText.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
        text: PropTypes.string,
        isUser: PropTypes.bool,
        isHistoryMessage: PropTypes.bool,
        isError: PropTypes.bool,
        timestamp: PropTypes.oneOfType([PropTypes.instanceOf(Date), PropTypes.string, PropTypes.number]),
    }).isRequired
};

MessageAvatar.propTypes = {
    message: PropTypes.shape({
        id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
        isUser: PropTypes.bool,
        botProfileImage: PropTypes.string,
        storeName: PropTypes.string,
    }).isRequired,
    store: PropTypes.shape({
        name: PropTypes.string,
        image_url: PropTypes.string
    })
};

export default ChatPage;