import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Header from '@components/Main/Common/Header';
import BottomNav from '@components/Main/Common/BottomNav';
import styles from './EditProfilePage.module.css';

const EditProfilePage = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors }
    } = useForm();

    useEffect(() => {
        const fetchUserInfo = async () => {
            setIsLoading(true);
            setError(null);

            try {
                const token = localStorage.getItem('accessToken');
                if (!token) {
                    navigate('/signin');
                    return;
                }

                const response = await fetch('/api/auth/me', {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('사용자 정보를 불러오는데 실패했습니다.');
                }

                const data = await response.json();
                const user = data.data.user;

                // 폼 초기값 설정
                setValue('username', user.username);
                setValue('email', user.email);
                setValue('phone', user.phone || '');
            } catch (error) {
                console.error('사용자 정보 조회 오류:', error);
                setError(error.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchUserInfo();
    }, [navigate, setValue]);

    const onSubmit = async (data) => {
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                navigate('/signin');
                return;
            }

            // 비밀번호가 비어있으면 요청에서 제외
            if (!data.password.trim()) {
                delete data.password;
            }

            const response = await fetch('/api/users/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '프로필 업데이트에 실패했습니다.');
            }

            setSuccess(true);

            // 2초 후 프로필 페이지로 이동
            setTimeout(() => {
                navigate('/profile');
            }, 2000);
        } catch (error) {
            console.error('프로필 업데이트 오류:', error);
            setError(error.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        navigate('/profile');
    };

    if (isLoading) {
        return (
            <div className={styles.container}>
                <Header />
                <div className={styles.loadingContainer}>
                    <p>정보를 불러오는 중...</p>
                </div>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Header />
            <div className={styles.content}>
                <div className={styles.pageHeader}>
                    <h1 className={styles.title}>개인정보 수정</h1>
                </div>

                {error && (
                    <div className={styles.errorMessage}>
                        {error}
                    </div>
                )}

                {success && (
                    <div className={styles.successMessage}>
                        프로필이 성공적으로 업데이트되었습니다.
                    </div>
                )}

                <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label htmlFor="username" className={styles.label}>이름</label>
                        <input
                            id="username"
                            className={styles.input}
                            type="text"
                            placeholder="이름을 입력하세요"
                            {...register('username', {
                                required: '이름은 필수 입력 항목입니다.',
                                minLength: {
                                    value: 2,
                                    message: '이름은 최소 2자 이상이어야 합니다.'
                                }
                            })}
                        />
                        {errors.username && <p className={styles.fieldError}>{errors.username.message}</p>}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="email" className={styles.label}>이메일</label>
                        <input
                            id="email"
                            className={styles.input}
                            type="email"
                            placeholder="이메일을 입력하세요"
                            disabled
                            {...register('email')}
                        />
                        <p className={styles.helpText}>이메일은 변경할 수 없습니다.</p>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="phone" className={styles.label}>전화번호</label>
                        <input
                            id="phone"
                            className={styles.input}
                            type="tel"
                            placeholder="전화번호를 입력하세요"
                            {...register('phone', {
                                pattern: {
                                    value: /^[0-9]{2,3}-?[0-9]{3,4}-?[0-9]{4}$/,
                                    message: '올바른 전화번호 형식이 아닙니다.'
                                }
                            })}
                        />
                        {errors.phone && <p className={styles.fieldError}>{errors.phone.message}</p>}
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="password" className={styles.label}>새 비밀번호</label>
                        <input
                            id="password"
                            className={styles.input}
                            type="password"
                            placeholder="변경할 비밀번호를 입력하세요"
                            {...register('password', {
                                minLength: {
                                    value: 6,
                                    message: '비밀번호는 최소 6자 이상이어야 합니다.'
                                },
                                pattern: {
                                    value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
                                    message: '비밀번호는 대문자, 소문자, 숫자를 포함해야 합니다.'
                                }
                            })}
                        />
                        {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
                        <p className={styles.helpText}>변경하지 않으려면 비워두세요.</p>
                    </div>

                    <div className={styles.buttonGroup}>
                        <button 
                            type="button" 
                            className={styles.cancelButton}
                            onClick={handleCancel}
                        >
                            취소
                        </button>
                        <button 
                            type="submit" 
                            className={styles.saveButton}
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? '저장 중...' : '저장하기'}
                        </button>
                    </div>
                </form>
            </div>
            <BottomNav />
        </div>
    );
};

export default EditProfilePage;