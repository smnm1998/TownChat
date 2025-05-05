import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import styles from './AdminSignIn.module.css';
import Logo from '@assets/Logo.svg';

const AdminSignIn = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [signInError, setSignInError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        setIsLoading(true);
        setSignInError('');
        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: data.email,
                    email: data.email,
                    password: data.password,
                }),
            });

            const result = await response.json();
            console.log('전체 응답: ', result);

            if (!response.ok) {
                throw new Error(result.message || '로그인에 실패했습니다.');
            }

            localStorage.setItem('accessToken', result.data.accessToken);
            localStorage.setItem('refreshToken', result.data.refreshToken);

            const meResponse = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${result.data.accessToken}`
                }
            });

            const meResult = await meResponse.json();
            console.log('사용자 정보', meResult);

            if (meResult.data.user.role !== 'admin') {
                throw new Error('관리자 권한이 필요합니다.');
            }

            navigate('/admin/dashboard');
        } catch (error) {
            console.error('로그인 에러: ', error);
            setSignInError(error.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.signInBox}>
                <div className={styles.logoSection}>
                    <img src={Logo} alt="TownChat_Logo" className={styles.logo} />
                    <h1 className={styles.title}>관리자 로그인</h1>
                </div>

                {signInError && <div className={styles.errorMessage}>{signInError}</div>}
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className={styles.form}>
                <div className={styles.formGroup}>
                    <label htmlFor="email" className={styles.label}>이메일</label>
                    <input
                        id="email"
                        type="email"
                        className={styles.input}
                        placeholder="관리자 이메일"
                        {...register('email', {
                            required: '이메일을 입력해주세요',
                            pattern: {
                                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                message: '유효한 이메일 주소를 입력해주세요'
                            }
                        })}
                    />
                    {errors.email && <p className={styles.fieldError}>{errors.email.message}</p>}
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password" className={styles.label}>비밀번호</label>
                    <input
                        id="password"
                        type="password" 
                        className={styles.input}
                        placeholder="비밀번호"
                        {...register('password', {
                            required: '비밀번호를 입력해주세요',
                        })}
                    />
                    {errors.password && <p className={styles.fieldError}>{errors.password.message}</p>}
                </div>

                <button
                    type="submit"
                    className={styles.signInButton}
                    disabled={isLoading}
                >
                    {isLoading ? '로그인 중...' : '관리자 로그인'}
                </button>
            </form>
        </div>
    );
};

export default AdminSignIn;