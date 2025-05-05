import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiEdit, FiTrash2, FiToggleLeft, FiToggleRight } from 'react-icons/fi';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        storeCount: 0,
        activeChatbots: 0,
        totalChatSessions: 0
    });
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchStats = async() => {
            try {
                // 현재 더미 데이터
                setStats({
                    storeCount: 24,
                    activeChatbots: 18,
                    totalChatSessions: 156
                });
            } catch (error) {
                console.error('통계 데이터 로딩 실패: ', error);
            }
        };
        
        const fetchStores = async() => {
            setIsLoading(true);
            setError(null);
            try {
                const token = localStorage.getItem('accessToken');
                const response = await fetch('/api/stores/user/stores', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                
                if (!response.ok) {
                    throw new Error('점포 목록을 불러오는데 실패했습니다.');
                }
                
                const data = await response.json();
                if (data.data && Array.isArray(data.data)) {
                    setStores(data.data);
                }
            } catch (error) {
                console.error('점포 목록 로딩 실패:', error);
                setError(error.message);
                // 데모 목적으로 더미 데이터 설정 (실제 구현에서는 제거)
                setStores([
                    { id: 1, name: '카페 서울', address: '서울시 강남구', is_active: true },
                    { id: 2, name: '분식왕', address: '서울시 마포구', is_active: true },
                    { id: 3, name: '동네 치킨', address: '서울시 관악구', is_active: false }
                ]);
            } finally {
                setIsLoading(false);
            }
        };
        
        fetchStats();
        fetchStores();
    }, []);

    const handleDeleteStore = async (id) => {
        if (!window.confirm('정말로 이 점포를 삭제하시겠습니까?')) {
            return;
        }
        
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/stores/${id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('점포 삭제에 실패했습니다.');
            }
            
            setStores(stores.filter(store => store.id !== id));
            alert('점포가 삭제되었습니다.');
        } catch (error) {
            console.error('점포 삭제 실패:', error);
            alert(error.message);
        }
    };
    
    const handleToggleActive = async (id, currentStatus) => {
        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/stores/${id}/toggle-active`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error('점포 상태 변경에 실패했습니다.');
            }
            
            setStores(stores.map(store => 
                store.id === id ? { ...store, is_active: !currentStatus } : store
            ));
        } catch (error) {
            console.error('점포 상태 변경 실패:', error);
            alert(error.message);
        }
    };

    if (isLoading) {
        return <div className={styles.loading}>데이터 로딩 중...</div>;
    }

    return (
        <div className={styles.dashboard}>
            <h2 className={styles.title}>대시보드</h2>
        
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <h3 className={styles.statTitle}>등록된 점포</h3>
                    <p className={styles.statValue}>{stats.storeCount}</p>
                </div>
            
                <div className={styles.statCard}>
                    <h3 className={styles.statTitle}>활성화된 챗봇</h3>
                    <p className={styles.statValue}>{stats.activeChatbots}</p>
                </div>
            
                <div className={styles.statCard}>
                    <h3 className={styles.statTitle}>총 대화 세션</h3>
                    <p className={styles.statValue}>{stats.totalChatSessions}</p>
                </div>
            </div>
            
            <div className={styles.storesSection}>
                <div className={styles.sectionHeader}>
                    <h3 className={styles.sectionTitle}>내 점포 목록</h3>
                    <Link to="/admin/stores/add" className={styles.addButton}>+ 새 점포 등록</Link>
                </div>
                
                {error && <p className={styles.errorMessage}>{error}</p>}
                
                {stores.length === 0 ? (
                    <p className={styles.emptyState}>등록된 점포가 없습니다. 새 점포를 등록해보세요.</p>
                ) : (
                    <div className={styles.storeGrid}>
                        {stores.map(store => (
                            <div key={store.id} className={styles.storeCard}>
                                <div className={styles.storeHeader}>
                                    <h4 className={styles.storeName}>{store.name}</h4>
                                    <span className={`${styles.statusBadge} ${store.is_active ? styles.statusActive : styles.statusInactive}`}>
                                        {store.is_active ? '활성' : '비활성'}
                                    </span>
                                </div>
                                <p className={styles.storeAddress}>{store.address}</p>
                                <div className={styles.storeActions}>
                                    <button 
                                        className={styles.actionButton}
                                        onClick={() => handleToggleActive(store.id, store.is_active)}
                                    >
                                        {store.is_active ? (
                                            <>
                                                <FiToggleRight className={styles.actionIcon} />
                                                비활성화
                                            </>
                                        ) : (
                                            <>
                                                <FiToggleLeft className={styles.actionIcon} />
                                                활성화
                                            </>
                                        )}
                                    </button>
                                    <Link 
                                        to={`/admin/stores/edit/${store.id}`} 
                                        className={styles.editButton}
                                    >
                                        <FiEdit className={styles.actionIcon} />
                                        수정
                                    </Link>
                                    <button 
                                        className={styles.deleteButton}
                                        onClick={() => handleDeleteStore(store.id)}
                                    >
                                        <FiTrash2 className={styles.actionIcon} />
                                        삭제
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDashboard;