// src/pages/Nearby/NearbyPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiCrosshair, FiList, FiMap, FiX, FiMessageSquare } from 'react-icons/fi';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import MapView from '@components/Main/Map/MapView';
import StoreCard from '@components/Main/Store/StoreCard';
import styles from './NearbyPage.module.css';

const NearbyPage = () => {
    const navigate = useNavigate();
    const [userLocation, setUserLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('map'); // 'map' 또는 'list'
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedStore, setSelectedStore] = useState(null);

    // MapView 컴포넌트에 대한 참조 추가
    const mapViewRef = useRef(null);

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

                            // 위치 정보 획득 후 모든 점포 조회
                            fetchAllStores(latitude, longitude);
                        },
                        (error) => {
                            console.error('위치 정보 획득 실패:', error);
                            setError(
                                '위치 정보를 가져올 수 없습니다. 권한을 허용해주세요.'
                            );
                            setLoading(false);
                            // 기본 위치(서울) 사용
                            fetchAllStores(37.5665, 126.978);
                        }
                    );
                } else {
                    setError('이 브라우저는 위치 정보를 지원하지 않습니다.');
                    setLoading(false);
                    // 기본 위치(서울) 사용
                    fetchAllStores(37.5665, 126.978);
                }
            } catch (error) {
                console.error('위치 권한 요청 오류:', error);
                setError('위치 정보를 가져오는데 문제가 발생했습니다.');
                setLoading(false);
            }
        };

        requestLocationPermission();
    }, []);

    // 모든 점포 조회 함수
    const fetchAllStores = async (userLat, userLng) => {
        setLoading(true);
        try {
            // 모든 점포 데이터 가져오기 (활성 상태인 점포만)
            const response = await fetch(`/api/stores?active=true&limit=100`, {
                headers: {
                    'Cache-Control': 'no-cache',
                },
            });

            if (!response.ok) {
                throw new Error('점포 정보를 불러오는데 실패했습니다.');
            }

            const result = await response.json();
            console.log('모든 점포 데이터:', result);

            // 데이터 구조 확인 (응답 구조에 따라 조정)
            let storesData = [];
            if (result.success) {
                if (result.data && Array.isArray(result.data.stores)) {
                    storesData = result.data.stores;
                } else if (Array.isArray(result.data)) {
                    storesData = result.data;
                }
            }

            console.log('추출된 점포 데이터:', storesData);

            // 좌표 데이터가 있는 점포만 필터링
            const storesWithCoordinates = storesData.filter(
                (store) => store.latitude && store.longitude
            );

            console.log('좌표 있는 점포:', storesWithCoordinates);

            setStores(
                storesWithCoordinates.map((store) => ({
                    id: store.id,
                    title: store.name,
                    latitude: parseFloat(store.latitude),
                    longitude: parseFloat(store.longitude),
                    address: store.address,
                    imageUrl: store.image_url,
                    isActive: store.is_active,
                }))
            );
        } catch (error) {
            console.error('점포 조회 오류:', error);
            setError(error.message);

            // 테스트용 더미 데이터 추가 (실제 데이터가 없을 때)
            setStores([
                {
                    id: 1,
                    title: '테스트 점포 1',
                    latitude: userLat + 0.002,
                    longitude: userLng + 0.002,
                    address: '테스트 주소 1',
                    imageUrl: null,
                    isActive: true,
                },
                {
                    id: 2,
                    title: '테스트 점포 2',
                    latitude: userLat - 0.001,
                    longitude: userLng + 0.001,
                    address: '테스트 주소 2',
                    imageUrl: null,
                    isActive: true,
                },
                {
                    id: 3,
                    title: '테스트 점포 3',
                    latitude: userLat + 0.001,
                    longitude: userLng - 0.002,
                    address: '테스트 주소 3',
                    imageUrl: null,
                    isActive: true,
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    // 검색 처리 함수
    const handleSearch = (e) => {
        e.preventDefault();
        if (!searchTerm.trim()) return;

        // 검색 API 호출
        searchStores(searchTerm);
    };

    // 점포 검색 함수
    const searchStores = async (query) => {
        setLoading(true);
        try {
            const response = await fetch(
                `/api/stores?search=${encodeURIComponent(query)}&active=true`,
                {
                    headers: {
                        'Cache-Control': 'no-cache',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('검색에 실패했습니다.');
            }

            const data = await response.json();
            console.log('검색 결과:', data);

            // 데이터 변환 및 저장
            if (data.success && data.data && Array.isArray(data.data.stores)) {
                // 좌표 데이터가 있는 점포만 필터링
                const storesWithCoordinates = data.data.stores.filter(
                    (store) => store.latitude && store.longitude
                );

                setStores(
                    storesWithCoordinates.map((store) => ({
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
            console.error('검색 오류:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // 내 위치 찾기 함수
    const findMyLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ latitude, longitude });

                    // 위치 기반으로 다시 모든 점포 조회
                    fetchAllStores(latitude, longitude);
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

        // mapViewRef를 통해 맵 중심 이동 메서드 호출
        if (mapViewRef.current && mapViewRef.current.panToLocation) {
            mapViewRef.current.panToLocation(
                markerData.latitude,
                markerData.longitude
            );
        }
    };

    // 모드 전환 (지도 <-> 목록)
    const toggleViewMode = () => {
        setViewMode((prevMode) => (prevMode === 'map' ? 'list' : 'map'));
    };

    // 마커 데이터 변환 함수
    const getMarkersFromStores = () => {
        return stores.map((store) => ({
            id: store.id,
            latitude: store.latitude,
            longitude: store.longitude,
            title: store.title || store.name,
            address: store.address,
            imageUrl: store.imageUrl,
            isActive: store.isActive,
        }));
    };

    // 점포 채팅 페이지로 이동
    const goToStoreChat = (storeId) => {
        navigate(`/store/${storeId}/chat?newSession=true`);
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
                                    fetchAllStores(
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
                                ref={mapViewRef}
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
                        </div>
                    ) : (
                        // 목록 뷰
                        <div className={styles.listWrapper}>
                            {stores.length === 0 ? (
                                <div className={styles.emptyState}>
                                    <p>등록된 점포가 없습니다.</p>
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

            {/* 선택된 점포 정보 모달 (중앙에 표시) */}
            {selectedStore && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <button 
                            className={styles.modalCloseButton}
                            onClick={() => setSelectedStore(null)}
                        >
                            <FiX />
                        </button>
                        
                        <div className={styles.modalImageContainer}>
                            <img
                                src={selectedStore.imageUrl || '/placeholder-store.jpg'}
                                alt={selectedStore.title}
                                className={styles.modalImage}
                                onError={(e) => {
                                    e.target.src = '/placeholder-store.jpg';
                                }}
                            />
                        </div>
                        
                        <div className={styles.modalInfo}>
                            <h3 className={styles.modalTitle}>{selectedStore.title}</h3>
                            <p className={styles.modalAddress}>{selectedStore.address}</p>
                            
                            <button 
                                className={styles.chatButton}
                                onClick={() => goToStoreChat(selectedStore.id)}
                            >
                                <FiMessageSquare className={styles.chatIcon} />
                                채팅하기
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
        </div>
    );
};

export default NearbyPage;