import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { FiUpload } from 'react-icons/fi';
import styles from './AdminAddForm.module.css';

const AdminAddForm = ({ isEditMode = false, storeData = null, storeId = null }) => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [previewImage, setPreviewImage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [addressDetail, setAddressDetail] = useState('');
    const [addressSelected, setAddressSelected] = useState(false);
    const [geocodeData, setGeocodeData] = useState({
        latitude: null,
        longitude: null
    });

    const {
        register,
        handleSubmit,
        formState: { errors },
        watch,
        setValue,
        clearErrors,
        reset
    } = useForm();

    const imageFile = watch('image');

    // 편집 모드에서 초기 데이터 설정
    useEffect(() => {
        if (isEditMode && storeData) {
            // 주소 처리 - 주소와 상세주소 분리
            const addressParts = storeData.address ? storeData.address.split(',') : ['', ''];
            const mainAddress = addressParts[0].trim();
            const detailAddress = addressParts.length > 1 ? addressParts.slice(1).join(',').trim() : '';
            
            // 폼 데이터 설정
            setValue('name', storeData.name || '');
            setValue('address', mainAddress);
            setValue('address_detail', detailAddress);
            setValue('phone', storeData.phone || '');
            setValue('description', storeData.description || '');
            setValue('owner_name', storeData.owner_name || '');
            setValue('owner_phone', storeData.owner_phone || '');
            setValue('assistant_id', storeData.assistant_id || '');
            
            // 주소 상태 설정
            setAddressDetail(mainAddress);
            setAddressSelected(!!mainAddress);
            
            // 위치 데이터 설정
            if (storeData.latitude && storeData.longitude) {
                setGeocodeData({
                    latitude: storeData.latitude,
                    longitude: storeData.longitude
                });
            }
            
            // 이미지 미리보기 설정
            if (storeData.image_url) {
                setPreviewImage(storeData.image_url.startsWith('http') 
                    ? storeData.image_url 
                    : `${window.location.origin}${storeData.image_url}`);
            }
        }
    }, [isEditMode, storeData, setValue]);

    // Daum 우편번호 스크립트 로드
    useEffect(() => {
        const script = document.createElement('script');
        script.src = '//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
        script.async = true;
        document.body.appendChild(script);
        
        return () => {
            document.body.removeChild(script);
        };
    }, []);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreviewImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    // 우편번호 검색 팝업 열기
    const openPostcode = () => {
        if (!window.daum || !window.daum.Postcode) {
            alert('우편번호 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.');
            return;
        }

        new window.daum.Postcode({
            oncomplete: handleComplete
        }).open();
    };

    const handleComplete = async (data) => {
        let fullAddress = data.address;
        let extraAddress = '';

        if (data.addressType === 'R') {
            if (data.bname !== '') {
                extraAddress += data.bname;
            }
            if (data.buildingName !== '') {
                extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName);
            }
            fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '');
        }

        // 카카오 맵 GeoCoder API 위도-경도 추출
        try {
            const response = await fetch(`https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(fullAddress)}`, {
                headers: {
                    'Authorization': `KakaoAK ${import.meta.env.VITE_KAKAO_REST_API_KEY}`
                }
            });

            const result = await response.json();

            if (result.documents && result.documents.length > 0) {
                const { x: longitude, y: latitude } = result.documents[0];
                setGeocodeData({ latitude: parseFloat(latitude), longitude: parseFloat(longitude) });
            }
        } catch (error) {
            console.error('주소 좌표 변환 오류: ', error);
        }

        setValue('address', fullAddress);
        setAddressDetail(fullAddress);
        setAddressSelected(true);
        clearErrors('address');
    };

    const onSubmit = async (data) => {
        setIsLoading(true);
        try {
            const formData = new FormData();

            // 이미지 파일 처리
            if (data.image && data.image[0]) {
                formData.append('image', data.image[0]);
            }
            
            // 지식 베이스 파일 첨부
            if (data.knowledge_base_file && data.knowledge_base_file[0]) {
                formData.append('knowledge_base_file', data.knowledge_base_file[0]);
                
                // 파일 내용을 읽어서 지식 베이스 텍스트로 추가
                try {
                    const fileReader = new FileReader();
                    fileReader.onload = async (e) => {
                        const content = e.target.result;
                        formData.append('knowledge_base', content); // 이 부분이 중요합니다
                        
                        // 파일 읽기 완료 후 폼 제출 계속
                        await submitFormData(formData, data);
                    };
                    fileReader.readAsText(data.knowledge_base_file[0]);
                } catch (error) {
                    console.error('파일 읽기 오류:', error);
                    // 파일 읽기 실패해도 계속 제출
                    await submitFormData(formData, data);
                }
            }
        } catch (error) {
            console.error(isEditMode ? '점포 수정 오류: ' : '점포 등록 오류: ', error);
            alert(error.message || `점포 ${isEditMode ? '수정' : '등록'} 중 오류가 발생했습니다.`);
        } finally {
            setIsLoading(false);
        }
    };
    
    // 실제 폼 데이터 제출 함수
    const submitFormData = async (formData, data) => {
        // 주소 처리 (기본 주소 + 상세 주소)
        const fullAddress = data.address_detail 
            ? `${data.address}, ${data.address_detail}` 
            : data.address;
            
        formData.append('name', data.name);
        formData.append('address', fullAddress);
        formData.append('phone', data.phone || '');
        formData.append('description', data.description || '');
        formData.append('owner_name', data.owner_name);
        formData.append('owner_phone', data.owner_phone || '');

        // 위도-경도 추가
        if (geocodeData.latitude && geocodeData.longitude) {
            formData.append('latitude', geocodeData.latitude);
            formData.append('longitude', geocodeData.longitude);
        }

        if (data.assistant_id) {
            formData.append('assistant_id', data.assistant_id);
        }

        const token = localStorage.getItem('accessToken');
        
        // API 엔드포인트와 메서드 설정 (수정 또는 등록)
        const endpoint = isEditMode ? `/api/stores/${storeId || id}` : '/api/stores';

        const method = isEditMode ? 'PUT' : 'POST';
        
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`
                // Content-Type은 자동으로 설정되므로 지정하지 않음
            },
            body: formData
        });

        // 응답 분석
        if (!response.ok) {
            let errorMessage = `점포 ${isEditMode ? '수정' : '등록'}에 실패했습니다.`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                console.error('에러 응답 파싱 실패:', e);
            }
            throw new Error(errorMessage);
        }

        const result = await response.json();
        
        // 성공
        alert(`점포가 성공적으로 ${isEditMode ? '수정' : '등록'}되었습니다.`);
        
        // 성공 후 대시보드로 이동
        navigate('/admin/dashboard');
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.pageTitle}>{isEditMode ? '점포 정보 수정' : '새 점포 등록'}</h2>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name" className={styles.label}>점포명</label>
                        <input
                            id="name"
                            type="text"
                            className={styles.input}
                            placeholder="점포명을 입력하세요"
                            {...register('name', {
                                required: '점포명을 입력해주세요',
                                minLength: {
                                    value: 2,
                                    message: '점포명은 최소 2자 이상이어야 합니다.'
                                }
                            })}
                        />
                        {errors.name && <p className={styles.error}>{errors.name.message}</p>}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone" className={styles.label}>점포 전화번호</label>
                        <input
                            id="phone"
                            type="tel"
                            className={styles.input}
                            placeholder="점포 전화번호"
                            {...register('phone', {
                                pattern: {
                                    value: /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/,
                                    message: '올바른 전화번호 형식이 아닙니다.'
                                }
                            })}
                        />
                        {errors.phone && <p className={styles.error}>{errors.phone.message}</p>}
                    </div>

                    <div className={`${styles.fullWidthGroup} ${styles.addressGroup}`}>
                        <label htmlFor="address" className={styles.label}>점포 주소</label>
                        <div className={styles.addressInputWrapper}>
                            <input
                                id="address"
                                type="text"
                                className={styles.input}
                                placeholder="주소 검색을 클릭하세요"
                                value={addressDetail}
                                readOnly
                                {...register('address', {
                                    required: '점포 주소를 입력해주세요'
                                })}
                            />
                            <button
                                type="button"
                                onClick={openPostcode}
                                className={styles.addressSearchButton}>
                                    주소 검색
                            </button>
                        </div>
                        {errors.address && <p className={styles.error}>{errors.address.message}</p>}
                        
                        <div className={styles.mt2}>
                            <label htmlFor="address_detail" className={styles.label}>상세 주소</label>
                            <input
                                id="address_detail"
                                type="text"
                                className={`${styles.input} ${!addressSelected ? styles.inputDisabled : ''}`}
                                placeholder={addressSelected ? "상세 주소를 입력하세요 (동/호수 등)" : "먼저 주소 검색을 해주세요"}
                                disabled={!addressSelected}
                                {...register('address_detail')}
                            />
                        </div>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="owner_name" className={styles.label}>대표명</label>
                        <input 
                            id="owner_name"
                            type="text" 
                            className={styles.input}
                            placeholder="대표명을 입력하세요."
                            {...register('owner_name', {
                                required: '대표명을 입력해주세요.'
                            })}
                        />
                        {errors.owner_name && <p className={styles.error}>{errors.owner_name.message}</p>}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="owner_phone" className={styles.label}>대표 전화번호</label>
                        <input 
                            id="owner_phone"
                            type="tel"
                            className={styles.input}
                            placeholder="대표 전화번호"
                            {...register('owner_phone', {
                                pattern: {
                                    value: /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/,
                                    message: '올바른 전화번호 형식이 아닙니다.'
                                }
                            })}
                        />
                        {errors.owner_phone && <p className={styles.error}>{errors.owner_phone.message}</p>}
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="description" className={styles.label}>점포 설명</label>
                    <textarea
                        id="description"
                        className={styles.textarea}
                        placeholder="점포에 대한 설명을 입력하세요"
                        {...register('description')}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="assistant_id" className={styles.label}>OpenAI Assistant ID (선택)</label>
                    <input
                        id="assistant_id"
                        type="text"
                        className={styles.input}
                        placeholder="예: asst_mNVgXGeExVjGMSJI3pI6uhx"
                        {...register('assistant_id')}
                    />
                    <p className={styles.helpText}>
                        OpenAI에서 직접 생성한 Assistant ID가 있다면 입력하세요. 없으면 자동으로 생성됩니다.
                    </p>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>챗봇 지식 베이스 (.txt)</label>
                    <div className={styles.fileUploadWrapper}>
                        <input
                            id="knowledge_base_file"
                            type="file"
                            accept=".txt"
                            className={styles.fileInput}
                            {...register('knowledge_base_file')}
                        />
                        <label htmlFor="knowledge_base_file" className={styles.fileUploadLabel}>
                            <FiUpload className={styles.uploadIcon} />
                            <span>지식 베이스 파일 업로드</span>
                        </label>
                        {watch('knowledge_base_file') && watch('knowledge_base_file')[0] && (
                            <div className={styles.fileInfo}>
                                <span className={styles.fileName}>{watch('knowledge_base_file')[0].name}</span>
                                <span className={styles.fileSize}>
                                    {(watch('knowledge_base_file')[0].size / 1024).toFixed(2)} KB
                                </span>
                            </div>
                        )}
                    </div>
                    <p className={styles.helpText}>
                        챗봇이 질문에 답변할 때 참고할 텍스트 파일을 업로드해주세요. (.txt 파일만 가능)
                        {isEditMode && ' 파일을 업로드하지 않으면 기존 지식 베이스가 유지됩니다.'}
                    </p>
                </div>

                <div className={styles.fullWidthGroup}>
                    <label className={styles.label}>점포 이미지</label>
                    <div className={styles.imageUploadWrapper}>
                        <input
                            id="image"
                            type="file"
                            accept="image/*"
                            className={styles.imageInput}
                            {...register('image')}
                            onChange={handleImageUpload}
                        />
                        <label htmlFor="image" className={styles.imageUploadLabel}>
                            <FiUpload className={styles.uploadIcon} />
                            <span>{isEditMode ? '이미지 변경' : '이미지 업로드'}</span>
                        </label>
                        {previewImage && (
                            <div className={styles.imagePreview}>
                                <img src={previewImage} alt="미리보기" />
                            </div>
                        )}
                    </div>
                    {isEditMode && (
                        <p className={styles.helpText}>
                            이미지를 업로드하지 않으면 기존 이미지가 유지됩니다.
                        </p>
                    )}
                </div>

                <div className={styles.submitButtonWrapper}>
                    <button
                        type="button"
                        className={styles.cancelButton}
                        onClick={() => navigate('/admin/dashboard')}
                    >취소</button>
                    <button
                        type="submit"
                        className={styles.submitButton}
                        disabled={isLoading}
                    >{isLoading ? '처리 중...' : isEditMode ? '점포 수정' : '점포 등록'}</button>
                </div>
            </form>
        </div>
    );
};

export default AdminAddForm;