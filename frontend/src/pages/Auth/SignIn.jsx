import { useState } from 'react';
import { Link } from 'react-router-dom';
import SignInForm from '@components/Auth/SignInForm';
import styles from '@components/Auth/SignInForm.module.css';

const SignIn = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (data) => {
        try {
            setIsLoading(true);
            setError(null);
            
            // API 호출 로직은 나중에 구현
            console.log('로그인 데이터:', data);
            
            // 임시 대기 시간 (API 호출 시뮬레이션)
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // 로그인 성공 후 메인 페이지로 리다이렉트 (나중에 구현)
        } catch (err) {
            setError(err.message || '로그인 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.pageContainer}>
            <div className={styles.contentContainer}>
                <div className={styles.header}>
                    <h2 className={styles.title}>로그인</h2>
                    <p className={styles.subtitle}>
                        계정이 없으신가요?{' '}
                        <Link to="/signup" className={styles.link}>
                            회원가입
                        </Link>
                    </p>
                </div>

                {error && (
                    <div className={styles.errorContainer}>
                        <p className={styles.errorMessage}>{error}</p>
                    </div>
                )}

                <SignInForm onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
        </div>
    );
};

export default SignIn;