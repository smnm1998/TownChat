// src/components/Main/Map/MapView.jsx
import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import styles from './MapView.module.css';

const MapView = ({
    center = { latitude: 37.5665, longitude: 126.978 }, // 기본값: 서울
    zoom = 3,
    markers = [],
    onMarkerClick = () => {},
    mapId = 'kakao-map',
}) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const [isMapLoaded, setIsMapLoaded] = useState(false);
    const [error, setError] = useState(null);

    // 카카오 맵 스크립트 로드
    useEffect(() => {
        // 이미 로드되었는지 확인
        if (window.kakao && window.kakao.maps) {
            console.log('Kakao Maps API가 이미 로드되어 있습니다.');
            setIsMapLoaded(true);
            return;
        }

        const script = document.createElement('script');
        script.async = true;
        // 프로토콜 없이 상대 경로로 변경
        script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=${
            import.meta.env.VITE_KAKAO_MAPS_API_KEY
        }&autoload=false`;

        script.onload = () => {
            console.log('Kakao Maps 스크립트 로드 완료, 초기화 시작');
            window.kakao.maps.load(() => {
                console.log('Kakao Maps API 초기화 완료');
                setIsMapLoaded(true);
            });
        };

        script.onerror = (error) => {
            console.error('Kakao Maps 스크립트 로드 실패:', error);
            setError('지도 스크립트를 불러오는데 실패했습니다.');
        };

        document.head.appendChild(script);

        return () => {
            // 스크립트가 아직 DOM에 존재하는 경우에만 제거
            if (document.head.contains(script)) {
                document.head.removeChild(script);
            }
        };
    }, []);

    // 맵 초기화
    useEffect(() => {
        if (!isMapLoaded) return;
        console.log('지도 초기화 시작');

        try {
            const mapContainer = document.getElementById(mapId);
            if (!mapContainer) {
                console.error(`ID가 ${mapId}인 요소를 찾을 수 없습니다.`);
                setError('지도 컨테이너를 찾을 수 없습니다.');
                return;
            }

            console.log('지도 컨테이너:', mapContainer);
            console.log('지도 중심 좌표:', center.latitude, center.longitude);

            // 맵 옵션 설정
            const mapOption = {
                center: new window.kakao.maps.LatLng(
                    center.latitude,
                    center.longitude
                ),
                level: zoom,
            };

            // 맵 인스턴스 생성
            console.log('지도 인스턴스 생성 중...');
            const map = new window.kakao.maps.Map(mapContainer, mapOption);
            console.log('지도 인스턴스 생성 완료!');
            mapInstanceRef.current = map;

            // 현재 위치 마커 표시
            const currentPositionMarker = new window.kakao.maps.Marker({
                position: new window.kakao.maps.LatLng(
                    center.latitude,
                    center.longitude
                ),
                map: map,
            });

            // 마커 저장 (정리용)
            markersRef.current.push(currentPositionMarker);

            // 컨트롤러 추가
            const zoomControl = new window.kakao.maps.ZoomControl();
            map.addControl(
                zoomControl,
                window.kakao.maps.ControlPosition.RIGHT
            );

            // 지도 이벤트 리스너
            window.kakao.maps.event.addListener(map, 'dragend', () => {
                const latlng = map.getCenter();
                console.log(
                    '지도 중심 좌표:',
                    latlng.getLat(),
                    latlng.getLng()
                );
            });

            console.log('지도 초기화 완료');
        } catch (err) {
            console.error('지도 초기화 오류:', err);
            setError(`지도 초기화 중 오류 발생: ${err.message}`);
        }

        return () => {
            // 정리 로직
            // 카카오맵 API에서는 명시적인 정리 메서드가 없지만,
            // 마커와 참조를 정리합니다.
            if (markersRef.current.length > 0) {
                markersRef.current.forEach((marker) => marker.setMap(null));
                markersRef.current = [];
            }
        };
    }, [isMapLoaded, center, zoom, mapId]);

    // 마커 업데이트
    useEffect(() => {
        if (!isMapLoaded || !mapInstanceRef.current) return;

        // 기존 마커 제거
        markersRef.current.forEach((marker) => marker.setMap(null));
        markersRef.current = [];

        // 새 마커 생성
        markers.forEach((markerData, index) => {
            const position = new window.kakao.maps.LatLng(
                markerData.latitude,
                markerData.longitude
            );

            const marker = new window.kakao.maps.Marker({
                position: position,
                map: mapInstanceRef.current,
            });

            // 마커 클릭 이벤트
            window.kakao.maps.event.addListener(marker, 'click', () => {
                onMarkerClick(markerData, index);
            });

            // 인포윈도우 설정 (마커 위에 표시되는 정보창)
            if (markerData.title) {
                const infowindow = new window.kakao.maps.InfoWindow({
                    content: `<div style="padding:5px;">${markerData.title}</div>`,
                });

                // 마커에 마우스 오버시 인포윈도우 표시
                window.kakao.maps.event.addListener(marker, 'mouseover', () => {
                    infowindow.open(mapInstanceRef.current, marker);
                });

                // 마커에서 마우스 아웃시 인포윈도우 닫기
                window.kakao.maps.event.addListener(marker, 'mouseout', () => {
                    infowindow.close();
                });
            }

            markersRef.current.push(marker);
        });
    }, [isMapLoaded, markers, onMarkerClick]);

    return (
        <div className={styles.mapWrapper}>
            <div id={mapId} ref={mapRef} className={styles.mapContainer}></div>
            {!isMapLoaded && (
                <div className={styles.loadingOverlay}>
                    지도를 불러오는 중입니다...
                </div>
            )}
            {error && (
                <div className={styles.errorOverlay}>
                    <p>{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className={styles.reloadButton}
                    >
                        새로고침
                    </button>
                </div>
            )}
        </div>
    );
};

MapView.propTypes = {
    center: PropTypes.shape({
        latitude: PropTypes.number.isRequired,
        longitude: PropTypes.number.isRequired,
    }),
    zoom: PropTypes.number,
    markers: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            latitude: PropTypes.number.isRequired,
            longitude: PropTypes.number.isRequired,
            title: PropTypes.string,
        })
    ),
    onMarkerClick: PropTypes.func,
    mapId: PropTypes.string,
};

export default MapView;
