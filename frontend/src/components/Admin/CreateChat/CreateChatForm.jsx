import { useForm } from 'react-hook-form';
import styles from './CreateChatForm.module.css';

const CreateChatForm = () => {
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        console.log(data);
        // API 연동 로직 추가 예정
    };

    return (
        <div className={styles.container}>
            <h2 className={styles.title}>챗봇 등록</h2>
            <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
                {/* 이미지 업로드 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>프로필 이미지</label>
                    <input
                        type="file"
                        accept="image/*"
                        {...register('image', {
                            required: '이미지를 업로드해주세요',
                        })}
                        className={styles.fileInput}
                    />
                    {errors.image && (
                        <p className={styles.error}>{errors.image.message}</p>
                    )}
                </div>

                {/* 등록자 정보 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>등록자 이름</label>
                    <input
                        type="text"
                        {...register('registrantName', {
                            required: '등록자 이름을 입력해주세요',
                        })}
                        className={styles.input}
                    />
                    {errors.registrantName && (
                        <p className={styles.error}>
                            {errors.registrantName.message}
                        </p>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>등록자 전화번호</label>
                    <input
                        type="tel"
                        {...register('registrantPhone', {
                            required: '전화번호를 입력해주세요',
                            pattern: {
                                value: /^\d{2,3}-\d{3,4}-\d{4}$/,
                                message: '올바른 전화번호 형식이 아닙니다',
                            },
                        })}
                        className={styles.input}
                        placeholder="010-0000-0000"
                    />
                    {errors.registrantPhone && (
                        <p className={styles.error}>
                            {errors.registrantPhone.message}
                        </p>
                    )}
                </div>

                {/* 상호 정보 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>상호명</label>
                    <input
                        type="text"
                        {...register('storeName', {
                            required: '상호명을 입력해주세요',
                        })}
                        className={styles.input}
                    />
                    {errors.storeName && (
                        <p className={styles.error}>
                            {errors.storeName.message}
                        </p>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>상호 전화번호</label>
                    <input
                        type="tel"
                        {...register('storePhone', {
                            required: '상호 전화번호를 입력해주세요',
                            pattern: {
                                value: /^\d{2,3}-\d{3,4}-\d{4}$/,
                                message: '올바른 전화번호 형식이 아닙니다',
                            },
                        })}
                        className={styles.input}
                        placeholder="02-0000-0000"
                    />
                    {errors.storePhone && (
                        <p className={styles.error}>
                            {errors.storePhone.message}
                        </p>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>상호 주소</label>
                    <input
                        type="text"
                        {...register('storeAddress', {
                            required: '상호 주소를 입력해주세요',
                        })}
                        className={styles.input}
                    />
                    {errors.storeAddress && (
                        <p className={styles.error}>
                            {errors.storeAddress.message}
                        </p>
                    )}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.label}>상호 정보</label>
                    <textarea
                        {...register('storeInfo', {
                            required: '상호 정보를 입력해주세요',
                        })}
                        className={styles.textarea}
                        rows={4}
                        style={{ resize: 'none' }}
                    />
                    {errors.storeInfo && (
                        <p className={styles.error}>
                            {errors.storeInfo.message}
                        </p>
                    )}
                </div>

                {/* 지식 베이스 파일 업로드 */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>지식 베이스 파일</label>
                    <input
                        type="file"
                        accept=".txt"
                        {...register('knowledgeBase', {
                            required: '지식 베이스 파일을 업로드해주세요',
                        })}
                        className={styles.fileInput}
                    />
                    {errors.knowledgeBase && (
                        <p className={styles.error}>
                            {errors.knowledgeBase.message}
                        </p>
                    )}
                </div>

                <button type="submit" className={styles.submitButton}>
                    등록하기
                </button>
            </form>
        </div>
    );
};

export default CreateChatForm;
