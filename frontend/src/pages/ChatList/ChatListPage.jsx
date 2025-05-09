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
        fetchSessions
    } = useChatSessionStore();

    // 첫 렌더링 시 세션 목록 불러오기
    useEffect(() => {
        // 이전 세션들을 모두 초기화 후 새로 불러옴
        fetchSessions();
    }, [fetchSessions]);

    // 날짜 형식화 함수
    const formatDate = (dateString) => {
        if (!dateString) return '';
        
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // 오늘인 경우 시간만 표시
        if (diff < 24 * 60 * 60 * 1000 && 
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear()) {
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
        
        // 일주일 이내인 경우 요일 표시
        if (diff < 7 * 24 * 60 * 60 * 1000) {
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            return `${days[date.getDay()]}요일`;
        }
        
        // 그 외에는 날짜 표시
        return date.toLocaleDateString();
    };

    const handleStoreClick = (chatbotId, sessionId, threadId) => {
        // ID 유효성 검사 추가
        if (!chatbotId) {
            alert('죄송합니다. 이 채팅방에 접근할 수 없습니다.');
            return;
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
            queryParams.append('thread', threadId);
        }
        
        // 쿼리 파라미터가 있는 경우 URL에 추가
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
            
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
                            
                            return (
                                <div 
                                    key={session.session_id || `session-${index}`} 
                                    className={styles.storeItem}
                                    onClick={() => handleStoreClick(
                                        chatbotId,
                                        session.session_id,
                                        session.thread_id
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
                                                {formatDate(session.last_chat)}
                                            </span>
                                        </div>
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