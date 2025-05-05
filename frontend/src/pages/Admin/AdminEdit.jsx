import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import AdminAddForm from '@components/Admin/AdminAddForm';
import styles from './AdminEdit.module.css';

const AdminEdit = () => {
    const { id } = useParams(); // 이 id는 챗봇 id
    const [store, setStore] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchChatbotAndStore = async () => {
            setIsLoading(true);
            try {
                const token = localStorage.getItem('accessToken');
                
                // 먼저 챗봇 정보 가져오기
                const chatbotResponse = await fetch(`/api/chatbots/${id}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!chatbotResponse.ok) {
                    throw new Error('챗봇 정보를 불러오는데 실패했습니다.');
                }

                const chatbotData = await chatbotResponse.json();
                console.log('챗봇 데이터:', chatbotData);
                
                // 챗봇 데이터에서 store_id 추출
                const storeId = chatbotData.data.store_id;
                
                if (!storeId) {
                    throw new Error('챗봇에 연결된 점포 정보가 없습니다.');
                }
                
                // 스토어 정보 가져오기
                const storeResponse = await fetch(`/api/stores/${storeId}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!storeResponse.ok) {
                    throw new Error('점포 정보를 불러오는데 실패했습니다.');
                }

                const storeData = await storeResponse.json();
                console.log('스토어 데이터:', storeData);
                
                // API 응답 구조에 따라 data.data 또는 data로 접근
                setStore(storeData.data || storeData);
                
            } catch (error) {
                console.error('데이터 조회 오류:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchChatbotAndStore();
    }, [id]);

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <p className={styles.loadingText}>정보를 불러오는 중...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.errorContainer}>
                <p className={styles.errorMessage}>{error}</p>
                <button
                    className={styles.retryButton}
                    onClick={() => window.location.href = '/admin/dashboard'}
                >
                    대시보드로 돌아가기
                </button>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>점포 정보 수정</h1>
                <p className={styles.pageDescription}>
                    점포 정보를 수정하세요. 점포 정보 변경은 연결된 챗봇에도 자동으로 반영됩니다.
                </p>
            </div>
            <div className={styles.formContainer}>
            {store && <AdminAddForm isEditMode={true} storeData={store} storeId={store.id} />}
            </div>
        </div>
    );
};

export default AdminEdit;