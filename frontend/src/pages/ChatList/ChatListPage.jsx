import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import styles from './ChatListPage.module.css';

const ChatListPage = () => {
    const navigate = useNavigate();
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStores = async () => {
            try {
                setLoading(true);
                
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    throw new Error('로그인이 필요합니다');
                }
                
                // 캐싱 방지를 위한 타임스탬프 추가
                const timestamp = new Date().getTime();
                
                // API 호출 - 사용자 채팅 목록 조회
                const response = await fetch(`/api/chatbots/user/sessions?t=${timestamp}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Cache-Control': 'no-cache, no-store, must-revalidate',
                        'Pragma': 'no-cache',
                        'Expires': '0'
                    }
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || '채팅 목록을 불러오는데 실패했습니다');
                }
                
                const data = await response.json();
                console.log('세션 API 응답:', data);
                
                if (data.success && data.data && Array.isArray(data.data)) {
                    // 각 세션에 대해 마지막 메시지 및 thread_id 가져오기
                    const sessionsWithMessages = await Promise.all(
                        data.data.map(async (session) => {
                            try {
                                // 디버깅 로그 추가
                                console.log('세션 정보:', session);
                                console.log('- chatbot_id:', session.chatbot_id);
                                console.log('- session_id:', session.session_id);
                                console.log('- thread_id:', session.thread_id);
                                console.log('- Chatbot:', session.Chatbot);

                                // 유효한 chatbot_id 확인
                                if (!session.chatbot_id && !session.Chatbot?.id) {
                                    console.warn('유효하지 않은 세션 (chatbot_id 없음):', session);
                                    return null;
                                }
                                
                                // 실제 사용할 chatbot_id 결정
                                const chatbotId = session.chatbot_id || session.Chatbot?.id;
                                
                                // 세션 ID를 사용하여 대화 이력 조회
                                const historyResponse = await fetch(
                                    `/api/chatbots/${chatbotId}/history?sessionId=${session.session_id}`,
                                    {
                                        headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Cache-Control': 'no-cache'
                                        }
                                    }
                                );
                                
                                if (historyResponse.ok) {
                                    const historyData = await historyResponse.json();
                                    console.log('히스토리 응답:', historyData);
                                    
                                    if (historyData.success && historyData.data && historyData.data.length > 0) {
                                        // 마지막 메시지 찾기 (가장 최근 메시지)
                                        const sortedMessages = [...historyData.data]
                                            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                                        
                                        const lastMessage = sortedMessages[0];
                                        
                                        // 중요: thread_id 찾기
                                        // 가장 최근 메시지에서 thread_id를 가져오거나, 존재하는 아무 thread_id나 가져옴
                                        const threadId = lastMessage.thread_id || 
                                                        sortedMessages.find(msg => msg.thread_id)?.thread_id || 
                                                        session.thread_id || null;
                                        
                                        console.log('채팅 기록에서 찾은 thread_id:', threadId);
                                        
                                        return {
                                            ...session,
                                            lastMessage: lastMessage.response || lastMessage.message || '(메시지 없음)',
                                            thread_id: threadId // thread_id 저장
                                        };
                                    }
                                }
                                
                                // 메시지를 가져오지 못한 경우
                                return {
                                    ...session,
                                    lastMessage: '(메시지 내용을 불러올 수 없습니다)'
                                };
                            } catch (err) {
                                console.error('대화 내용 조회 오류:', err);
                                return {
                                    ...session,
                                    lastMessage: '(메시지 내용을 불러올 수 없습니다)'
                                };
                            }
                        })
                    );
                    
                    // 유효한 세션만 필터링 (null이 아닌 세션)
                    const validSessions = sessionsWithMessages.filter(session => session !== null);
                    
                    console.log('유효한 세션 수:', validSessions.length);
                    setStores(validSessions);
                } else {
                    setStores([]);
                }
            } catch (err) {
                console.error('채팅 목록 조회 에러:', err);
                setError(err.message || '채팅 목록을 불러오는데 문제가 발생했습니다');
            } finally {
                setLoading(false);
            }
        };
        
        fetchStores();
    }, []);

    const handleStoreClick = (chatbotId, sessionId, threadId) => {
        // ID 유효성 검사 추가
        if (!chatbotId) {
            console.error('유효한 챗봇 ID가 없습니다');
            alert('죄송합니다. 이 채팅방에 접근할 수 없습니다.');
            return;
        }
        
        console.log('클릭한 챗봇 ID:', chatbotId);
        console.log('클릭한 세션 ID:', sessionId);
        console.log('클릭한 스레드 ID:', threadId);
        
        // URL 구성 - thread_id도 함께 전달
        let url = `/chat/${chatbotId}`;
        
        // 쿼리 파라미터 구성
        const queryParams = new URLSearchParams();
        if (sessionId) queryParams.append('session', sessionId);
        if (threadId) queryParams.append('thread', threadId);
        
        // 쿼리 파라미터가 있는 경우 URL에 추가
        const queryString = queryParams.toString();
        if (queryString) {
            url += `?${queryString}`;
        }
            
        console.log('이동할 URL:', url);
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
                ) : !stores || stores.length === 0 ? (
                    <div className={styles.empty}>
                        채팅 내역이 없습니다.
                    </div>
                ) : (
                    <div className={styles.storeList}>
                        {stores.map((session, index) => (
                            <div 
                                key={session.session_id || `session-${index}`} 
                                className={styles.storeItem}
                                onClick={() => handleStoreClick(
                                    session.chatbot_id || session.Chatbot?.id,
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
                                    <p className={styles.storeTime}>
                                        {session.lastMessage || '(대화 내용이 없습니다)'}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            
            <BottomNav />
        </div>
    );
};

export default ChatListPage;