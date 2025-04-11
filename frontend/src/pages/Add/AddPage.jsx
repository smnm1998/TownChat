import { useState, useEffect } from 'react';
import { FiX } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import styles from './AddPage.module.css';

const AddPage = () => {
    const navigate = useNavigate();
    const [showPicker1, setShowPicker1] = useState(false);
    const [showPicker2, setShowPicker2] = useState(false);
    const [provinces, setProvinces] = useState([]);
    const [cities, setCities] = useState([]);
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedCity, setSelectedCity] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 시/도 목록 불러오기
    useEffect(() => {
        const fetchProvinces = async () => {
            try {
                setLoading(true);
                const response = await fetch('/api/regions/provinces');
                
                if (!response.ok) {
                    throw new Error('지역 데이터를 불러오는데 실패했습니다.');
                }
                
                const result = await response.json();
                setProvinces(result.data || []);
                
                // 기본 선택값 설정
                if (result.data && result.data.length > 0) {
                    setSelectedProvince(result.data[0]);
                }
            } catch (error) {
                console.error('시/도 목록 로딩 실패:', error);
                setError(error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchProvinces();
    }, []);

    // 선택된 시/도가 변경되면 해당 시/군/구 목록 불러오기
    useEffect(() => {
        if (!selectedProvince) return;

        const fetchCities = async () => {
            try {
                const response = await fetch(`/api/regions/provinces/${selectedProvince.id}/cities`);
                
                if (!response.ok) {
                    throw new Error('시/군/구 데이터를 불러오는데 실패했습니다.');
                }
                
                const result = await response.json();
                setCities(result.data || []);
                
                // 기본 선택값 설정
                if (result.data && result.data.length > 0) {
                    setSelectedCity(result.data[0]);
                } else {
                    setSelectedCity(null);
                }
            } catch (error) {
                console.error('시/군/구 목록 로딩 실패:', error);
                setCities([]);
                setSelectedCity(null);
            }
        };

        fetchCities();
    }, [selectedProvince]);
    
    const handleClose = () => {
        navigate(-1);
    };
    
    const handleNext = () => {
        if (!selectedProvince || !selectedCity) {
            alert('지역을 모두 선택해주세요.');
            return;
        }
        
        // 다음 화면으로 이동 (스토어 추가 정보 입력 등)
        navigate('/add/details', { 
            state: { 
                province: selectedProvince,
                city: selectedCity
            } 
        });
    };
    
    const handleSelectProvince = (province) => {
        setSelectedProvince(province);
        setShowPicker1(false);
    };
    
    const handleSelectCity = (city) => {
        setSelectedCity(city);
        setShowPicker2(false);
    };

    return (
        <div className={styles.container}>
            <Header />
            
            <div className={styles.content}>
                <h1 className={styles.title}>챗봇 시작하기</h1>
                <p className={styles.subtitle}>지역을 선택해주세요!</p>

                {loading ? (
                    <div className={styles.loading}>데이터 로딩 중...</div>
                ) : error ? (
                    <div className={styles.error}>
                        {error}
                        <button 
                            onClick={() => window.location.reload()}
                            className={styles.retryButton}
                        >
                            다시 시도
                        </button>
                    </div>
                ) : (
                    <div className={styles.form}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>선택 1 (도):</label>
                            <div className={styles.selectWrapper}>
                                <div 
                                    className={styles.select}
                                    onClick={() => setShowPicker1(true)}
                                >
                                    {selectedProvince?.name || '선택해주세요'}
                                </div>
                                
                                {showPicker1 && (
                                    <div className={styles.picker}>
                                        <div className={styles.pickerContent}>
                                            {provinces.map((province) => (
                                                <div 
                                                    key={province.id}
                                                    className={`${styles.pickerItem} ${selectedProvince?.id === province.id ? styles.selected : ''}`}
                                                    onClick={() => handleSelectProvince(province)}
                                                >
                                                    {province.name}
                                                </div>
                                            ))}
                                        </div>
                                        <div 
                                            className={styles.pickerOverlay}
                                            onClick={() => setShowPicker1(false)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className={styles.formGroup}>
                            <label className={styles.label}>선택 2 (시/군/구):</label>
                            <div className={styles.selectWrapper}>
                                <div 
                                    className={`${styles.select} ${!selectedProvince ? styles.disabled : ''}`}
                                    onClick={() => selectedProvince && cities.length > 0 && setShowPicker2(true)}
                                >
                                    {selectedCity?.name || (cities.length === 0 ? '사용 가능한 지역 없음' : '선택해주세요')}
                                </div>
                                
                                {showPicker2 && (
                                    <div className={styles.picker}>
                                        <div className={styles.pickerContent}>
                                            {cities.map((city) => (
                                                <div 
                                                    key={city.id}
                                                    className={`${styles.pickerItem} ${selectedCity?.id === city.id ? styles.selected : ''}`}
                                                    onClick={() => handleSelectCity(city)}
                                                >
                                                    {city.name}
                                                </div>
                                            ))}
                                        </div>
                                        <div 
                                            className={styles.pickerOverlay}
                                            onClick={() => setShowPicker2(false)}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            className={styles.nextButton}
                            onClick={handleNext}
                            disabled={!selectedProvince || !selectedCity}
                        >
                            다음으로
                        </button>
                    </div>
                )}
            </div>

            <div className={styles.closeButtonWrapper}>
                <button 
                    className={styles.closeButton}
                    onClick={handleClose}
                    aria-label="닫기"
                >
                    <FiX size={24} />
                </button>
            </div>

            <BottomNav />
        </div>
    );
};

export default AddPage;