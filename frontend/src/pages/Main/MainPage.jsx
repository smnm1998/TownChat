import { useEffect, useState } from 'react';
import Header from '@components/Main/Common/Header';
import SearchBar from '@components/Main/SearchBar/SearchBar';
import BottomNav from '@components/Main/Common/BottomNav';
import StoreList from '@components/Main/Store/StoreList';
import styles from './MainPage.module.css';

const MainPage = () => {
    const [userLocation, setUserLocation] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [locationStatus, setLocationStatus] = useState('pending'); // 'pending', 'granted', 'denied'

    // 위치 권한 요청
    useEffect(() => {
        const requestLocationPermission = async () => {
            try {
                setLocationStatus('pending');
                
                if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            // 위치 정보 획득 성공
                            const { latitude, longitude } = position.coords;
                            console.log('현재 위치:', latitude, longitude);
                            setUserLocation({ latitude, longitude });
                            setLocationStatus('granted');
                        },
                        (error) => {
                            console.error('위치 정보 획득 실패:', error);
                            setLocationStatus('denied');
                        }
                    );
                } else {
                    console.error('브라우저가 위치 정보를 지원하지 않습니다.');
                    setLocationStatus('denied');
                }
            } catch (error) {
                console.error('위치 권한 요청 오류:', error);
                setLocationStatus('denied');
            }
        };

        requestLocationPermission();
    }, []);

    // 검색 처리 함수
    const handleSearch = async (term) => {
        if (!term.trim()) {
            setSearchTerm('');
            return;
        }
        
        setIsSearching(true);
        
        try {
            // 검색어 상태 업데이트
            setSearchTerm(term);
            
            // 검색 결과는 StoreList 컴포넌트에서 API 호출로 처리
        } catch (error) {
            console.error('검색 처리 중 오류 발생:', error);
        } finally {
            setIsSearching(false);
        }
    };

    // 검색 초기화 함수
    const clearSearch = () => {
        setSearchTerm('');
    };

    return (
        <div className={styles.container}>
            <Header />
            
            <main className={styles.content}>
                <SearchBar 
                    onSearch={handleSearch} 
                    isSearching={isSearching}
                    initialSearchTerm={searchTerm}
                    onClear={clearSearch}
                />
                
                {locationStatus === 'pending' && !searchTerm && (
                    <div className={styles.locationMessage}>
                        <p>위치 정보를 가져오는 중입니다...</p>
                    </div>
                )}
                
                {locationStatus === 'denied' && !searchTerm && (
                    <div className={styles.locationWarning}>
                        <p>위치 정보 사용이 거부되었습니다. 가까운 점포 찾기를 위해 위치 권한을 허용해주세요.</p>
                    </div>
                )}
                
                <StoreList 
                    userLocation={userLocation} 
                    searchTerm={searchTerm}
                />
            </main>
            
            <BottomNav />
        </div>
    );
};

export default MainPage;