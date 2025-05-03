// src/pages/Nearby/NearbyPage.jsx
import { useState, useEffect } from 'react';
import { FiSearch, FiCrosshair, FiList, FiMap } from 'react-icons/fi';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import MapView from '@components/Main/Map/MapView';
import StoreCard from '@components/Main/Store/StoreCard';
import styles from './NearbyPage.module.css';

const NearbyPage = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('map'); // 'map' 또는 'list'
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);

    // 위치 권한 요청 및 위치 정보 획득
    useEffect(() => {
        const requestLocationPermission = async () => {
            try {
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            console.log('현재 위치:', latitude, longitude);
                            setUserLocation({ latitude, longitude });
                            fetchNearbyStores(latitude, longitude);
                        },
                        (error) => {
                            console.error('위치 정보 획득 실패:', error);
                            setError(
                                '위치 정보를 가져올 수 없습니다. 권한을 허용해주세요.'
                            );
                            setLoading(false);
                            // 기본 위치(서울) 사용
                            fetchNearbyStores(37.5665, 126.978);
                        }
                    );
                } else {
                    setError('이 브라우저는 위치 정보를 지원하지 않습니다.');
                    setLoading(false);
                    // 기본 위치(서울) 사용
                    fetchNearbyStores(37.5665, 126.978);
                }
            } catch (error) {
                console.error('위치 권한 요청 오류:', error);
                setError('위치 정보를 가져오는데 문제가 발생했습니다.');
                setLoading(false);
            }
        };

        requestLocationPermission();
    }, []);

    // 주변 점포 조회 함수
    const fetchNearbyStores = async (latitude, longitude, radius = 5) => {
        setLoading(true);
        try {
            // API 호출
            const response = await fetch(
                `/api/stores/nearby?latitude=${latitude}&longitude=${longitude}&radius=${radius}`,
                {
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('주변 점포 정보를 불러오는데 실패했습니다.');
            }

            const data = await response.json();
            console.log('주변 점포 데이터:', data);

            // 데이터 변환 및 저장
            if (data.success && data.data && Array.isArray(data.data.stores)) {
                setStores(
                    data.data.stores.map((store) => ({
                        id: store.id,
                        title: store.name,
                        latitude: store.latitude,
                        longitude: store.longitude,
                        address: store.address,
                        imageUrl: store.image_url,
                        isActive: store.is_active,
                    }))
                );
            } else {
                setStores([]);
            }
        } catch (error) {
            console.error('주변 점포 조회 오류:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // 검색 처리 함수
    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        // 검색 API 호출 (구현 필요)
        console.log('검색어:', searchTerm);
    };

    // 내 위치 찾기 함수
    const findMyLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });
                    fetchNearbyStores(latitude, longitude);
                },
                (error) => {
                    console.error('위치 정보 획득 실패:', error);
                    alert(
                        '위치 정보를 가져올 수 없습니다. 권한을 확인해주세요.'
                    );
                }
            );
        } else {
            alert('이 브라우저는 위치 정보를 지원하지 않습니다.');
        }
    };

    // 마커 클릭 핸들러
    const handleMarkerClick = (markerData) => {
        console.log('선택된 점포:', markerData);
        setSelectedStore(markerData);
    };

    // 모드 전환 (지도 <-> 목록)
    const toggleViewMode = () => {
        setViewMode((prevMode) => (prevMode === 'map' ? 'list' : 'map'));
    };

    // 마커 데이터 변환
    const getMarkersFromStores = () => {
        return stores.map((store) => ({
            id: store.id,
            latitude: store.latitude,
            longitude: store.longitude,
            title: store.title,
        }));
    };

    return (
        <div className={styles.container}>
            <Header />

            <main className={styles.content}>
                {/* 검색 바 */}
                <div className={styles.searchContainer}>
                    <form onSubmit={handleSearch} className={styles.searchForm}>
                        <FiSearch className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="점포명, 주소로 검색"
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </form>

                    <div className={styles.actionButtons}>
                        <button
                            className={styles.locationButton}
                            onClick={findMyLocation}
                            title="내 위치 찾기"
                        >
                            <FiCrosshair />
                        </button>

                        <button
                            className={styles.viewToggleButton}
                            onClick={toggleViewMode}
                            title={
                                viewMode === 'map'
                                    ? '목록으로 보기'
                                    : '지도로 보기'
                            }
                        >
                            {viewMode === 'map' ? <FiList /> : <FiMap />}
                        </button>
                    </div>
                </div>

                {/* 콘텐츠 영역 (지도 또는 목록) */}
                <div className={styles.contentArea}>
                    {loading ? (
                        <div className={styles.loadingContainer}>
                            <p>데이터를 불러오는 중...</p>
                        </div>
                    ) : error ? (
                        <div className={styles.errorContainer}>
                            <p>{error}</p>
                            <button
                                className={styles.retryButton}
                                onClick={() =>
                                    userLocation &&
                                    fetchNearbyStores(
                                        userLocation.latitude,
                                        userLocation.longitude
                                    )
                                }
                            >
                                다시 시도
                            </button>
                        </div>
                    ) : viewMode === 'map' ? (
                        // 지도 뷰
                        <div className={styles.mapWrapper}>
                            <MapView
                                center={
                                    userLocation || {
                                        latitude: 37.5665,
                                        longitude: 126.978,
                                    }
                                }
                                markers={getMarkersFromStores()}
                                onMarkerClick={handleMarkerClick}
                                zoom={3}
                            />

                            {/* 선택된 점포 정보 카드 */}
                            {selectedStore && (
                                <div className={styles.selectedStoreCard}>
                                    <StoreCard
                                        id={selectedStore.id}
                                        name={selectedStore.title}
                                        address={selectedStore.address}
                                        imageUrl={selectedStore.imageUrl}
                                    />
                                    <button
                                        className={styles.closeButton}
                                        onClick={() => setSelectedStore(null)}
                                    >
                                        닫기
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        // 목록 뷰
                        <div className={styles.listWrapper}>
                            {stores.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>주변에 등록된 점포가 없습니다.</p>
                                </div>
                            ) : (
                                <div className={styles.storeGrid}>
                                    {stores.map((store) => (
                                        <StoreCard
                                            key={store.id}
                                            id={store.id}
                                            name={store.title}
                                            address={store.address}
                                            imageUrl={store.imageUrl}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            <BottomNav />
        </div>
    );
};

export default NearbyPage;
