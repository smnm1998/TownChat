import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import styles from './ChatListPage.module.css';
import useChatSessionStore from '@store/chatSessionStore';

const ChatListPage = () => {
    const navigate = useNavigate();
    
    // Zustand 스토어 사용
    const {
        sessions,
        loading,
        error,
        fetchSessions,
        debugSession
    } = useChatSessionStore();

    // 첫 렌더링 시 세션 목록 불러오기
    useEffect(() => {
        // 이전 세션들을 모두 초기화 후 새로 불러옴
        fetchSessions();
    }, [fetchSessions]);

    const handleStoreClick = (chatbotId, sessionId, threadId) => {
        // ID 유효성 검사 추가
        if (!chatbotId) {
            console.error('유효한 챗봇 ID가 없습니다');
            alert('죄송합니다. 이 채팅방에 접근할 수 없습니다.');
            return;
        }
        
        // 디버깅을 위해 선택한 세션 정보 로깅
        console.log('[채팅목록] 클릭한 챗봇 ID:', chatbotId);
        console.log('[채팅목록] 클릭한 세션 ID:', sessionId);
        console.log('[채팅목록] 클릭한 스레드 ID:', threadId);
        
        // 세션 디버깅 함수 호출
        if (sessionId) {
            const sessionInfo = debugSession(sessionId);
            console.log('[채팅목록] 세션 상세 정보:', sessionInfo);
        }
        
        // URL 구성 - 채팅봇 ID를 사용한 경로로 이동
        let url = `/chat/${chatbotId}`;
        
        // 쿼리 파라미터 구성
        const queryParams = new URLSearchParams();
        
        // 세션 ID 추가 (존재하는 경우)
        if (sessionId) {
            queryParams.append('session', sessionId);
        }
        
        // 스레드 ID 추가 (존재하는 경우)
        if (threadId) {
            console.log('[채팅목록] 스레드 ID 전달:', threadId);
            queryParams.append('thread', threadId);
        }
        
        // 쿼리 파라미터가 있는 경우 URL에 추가
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
            
        console.log('[채팅목록] 이동할 URL:', url);
        navigate(url);
    };

    return (
        <div className={styles.container}>
            <Header />
            
            <div className={styles.content}>
                <h1 className={styles.title}>채팅목록</h1>
                
                {loading ? (
                    <div className={styles.loading}>
                        채팅 목록을 불러오는 중...
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        {error}
                    </div>
                ) : !sessions || sessions.length === 0 ? (
                    <div className={styles.empty}>
                        채팅 내역이 없습니다.
                    </div>
                ) : (
                    <div className={styles.storeList}>
                        {sessions.map((session, index) => {
                            // chatbot_id 확인 - 두 가지 경로에서 가져옴
                            const chatbotId = session.chatbot_id || session.Chatbot?.id;
                            
                            // 스레드 ID가 있는지 확인하고 있으면 표시
                            const hasThread = !!session.thread_id;
                            
                            return (
                                <div 
                                    key={session.session_id || `session-${index}`} 
                                    className={styles.storeItem}
                                    onClick={() => handleStoreClick(
                                        chatbotId,
                                        session.session_id,
                                        session.thread_id  // thread_id 명시적으로 전달
                                    )}
                                >
                                    <div className={styles.storeImage}>
                                        <img 
                                            src={session.Chatbot?.Store?.image_url || '/placeholder-store.jpg'} 
                                            alt={session.Chatbot?.Store?.name || session.Chatbot?.name || '채팅'}
                                            onError={(e) => {
                                                e.target.src = '/placeholder-store.jpg';
                                            }}
                                        />
                                    </div>
                                    <div className={styles.storeInfo}>
                                        <h3 className={styles.storeName}>
                                            {session.Chatbot?.Store?.name || session.Chatbot?.name || '채팅'}
                                        </h3>
                                        <p className={styles.storeLastMessage}>
                                            {session.lastMessage || '(대화 내용이 없습니다)'}
                                        </p>
                                        <div className={styles.storeTime}>
                                            <span className={styles.timeText}>
                                                {session.last_chat ? new Date(session.last_chat).toLocaleString() : ''}
                                            </span>
                                            {hasThread && (
                                                <span className={styles.activeIndicator} title={`스레드 ID: ${session.thread_id}`}>
                                                    연결됨
                                                </span>
                                            )}
                                        </div>
                                        {session.thread_id && (
                                            <div className={styles.threadInfo}>
                                                스레드 ID: {session.thread_id.substring(0, 10)}...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <BottomNav />
        </div>
    );
};

export default ChatListPage;