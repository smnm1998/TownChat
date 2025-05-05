import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import StoreCard from '@components/Main/Store/StoreCard';
import storeService from '@store/storeService';
import styles from './AddResult.module.css';

const AddResultsPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [stores, setStores] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const { province, city } = location.state || {};

    useEffect(() => {
        // 선택 지역 없으면 이전 페이지로 리다이렉트
        if (!province || !city) {
            navigate(-1);
            return;
        }

        const fetchStores = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await storeService.getStoresByRegion(
                    province.id,
                    city.id
                );

                if (response && response.data) {
                    setStores(response.data.stores || []);
                }
            } catch (error) {
                console.error('지역별 매장 조회 오류: ', error);
                setError('매장 정보를 불러오는데 실패했습니다.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchStores();
    }, [province, city, navigate]);

    const handleBack = () => {
        navigate(-1);
    };

    return (
        <div className={styles.container}>
            <Header />

            <div className={styles.content}>
                <div className={styles.pageHeader}>
                    <button className={styles.backButton} onClick={handleBack}>
                        <FiArrowLeft />
                    </button>
                    <h1 className={styles.title}>
                        {province?.name} {city?.name} 챗봇
                    </h1>
                </div>

                {isLoading ? (
                    <div className={styles.loading}>데이터를 불러오는 중...</div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : stores.length === 0 ? (
                    <div className={styles.empty}>
                        <p>이 지역에 등록된 챗봇이 없습니다.</p>
                        <p>다른 지역을 선택하거나 나중에 다시 확인해주세요.</p>
                    </div>
                ) : (
                    <div className={styles.storeGrid}>
                        {stores.map(store => (
                            <StoreCard
                                key={store.id}
                                id={store.id}
                                name={store.name}
                                address={store.address}
                                imageUrl={store.image_url}
                            />
                        ))}
                    </div>
                )}
            </div>

            <BottomNav />
        </div>
    )
};

export default AddResultsPage;