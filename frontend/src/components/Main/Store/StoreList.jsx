import { useState, useEffect } from 'react';
import StoreCard from './StoreCard';
import storeService from '@store/storeService';
import styles from './StoreList.module.css';

const StoreList = ({ userLocation, searchTerm }) => {
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        total: 0
    });

    useEffect(() => {
        const fetchStores = async () => {
            setIsLoading(true);
            setError(null);
            
            try {
                let result;
                
                // 검색어가 있는 경우 검색
                if (searchTerm) {
                    result = await storeService.getAllStores({ 
                        search: searchTerm,
                        active: true,
                        page: 1,
                        limit: 20
                    });
                }
                // 위치 정보가 있는 경우 주변 점포 검색
                else if (userLocation && userLocation.latitude && userLocation.longitude) {
                    result = await storeService.getNearbyStores(
                        userLocation.latitude, 
                        userLocation.longitude,
                        5, // 5km 반경
                        { page: 1, limit: 20 }
                    );
                }
                // 기본 점포 목록 조회
                else {
                    result = await storeService.getAllStores({
                        active: true,
                        page: 1,
                        limit: 20
                    });
                }
                
                // API 응답 구조에 맞게 데이터 추출
                // 일반적인 응답 형식: { data: [...], pagination: {...} }
                const responseData = result.data || [];
                const paginationData = result.pagination || {
                    currentPage: 1,
                    totalPages: 1,
                    total: responseData.length
                };
                
                setStores(responseData);
                setPagination(paginationData);
                
            } catch (error) {
                console.error('점포 목록 조회 오류:', error);
                setError('점포 목록을 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStores();
    }, [userLocation, searchTerm]);

    // 더 보기 기능
    const loadMoreStores = async () => {
        if (pagination.currentPage >= pagination.totalPages) return;
        
        setIsLoading(true);
        
        try {
            const nextPage = pagination.currentPage + 1;
            let result;
            
            // 검색어가 있는 경우 검색
            if (searchTerm) {
                result = await storeService.getAllStores({ 
                    search: searchTerm,
                    active: true,
                    page: nextPage,
                    limit: 20
                });
            }
            // 위치 정보가 있는 경우 주변 점포 검색
            else if (userLocation && userLocation.latitude && userLocation.longitude) {
                result = await storeService.getNearbyStores(
                    userLocation.latitude, 
                    userLocation.longitude,
                    5,
                    { page: nextPage, limit: 20 }
                );
            }
            // 기본 점포 목록 조회
            else {
                result = await storeService.getAllStores({
                    active: true,
                    page: nextPage,
                    limit: 20
                });
            }
            
            // 기존 목록에 추가
            const responseData = result.data || [];
            const paginationData = result.pagination || {
                currentPage: nextPage,
                totalPages: pagination.totalPages,
                total: pagination.total
            };
            
            setStores([...stores, ...responseData]);
            setPagination(paginationData);
            
        } catch (error) {
            console.error('추가 점포 목록 조회 오류:', error);
        } finally {
            setIsLoading(false);
        }
    };

    if (isLoading && stores.length === 0) {
        return <div className={styles.loading}>로딩 중...</div>;
    }

    if (error && stores.length === 0) {
        return <div className={styles.error}>{error}</div>;
    }

    if (stores.length === 0) {
        return (
            <div className={styles.empty}>
                {searchTerm 
                    ? `'${searchTerm}'에 대한 검색 결과가 없습니다.` 
                    : '주변에 등록된 점포가 없습니다.'}
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <h2 className={styles.heading}>
                {searchTerm 
                    ? `'${searchTerm}' 검색 결과 (${pagination.total})` 
                    : userLocation 
                        ? '내 주변 점포' 
                        : '추천 점포'
                }
            </h2>
            
            <div className={styles.grid}>
                {stores.map((store) => (
                    <StoreCard
                        key={store.id}
                        id={store.id}
                        name={store.name}
                        address={store.address}
                        imageUrl={store.image_url || null}
                    />
                ))}
            </div>
            
            {pagination.currentPage < pagination.totalPages && (
                <div className={styles.loadMoreContainer}>
                    <button 
                        className={styles.loadMoreButton}
                        onClick={loadMoreStores}
                        disabled={isLoading}
                    >
                        {isLoading ? '로딩 중...' : '더 보기'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default StoreList;