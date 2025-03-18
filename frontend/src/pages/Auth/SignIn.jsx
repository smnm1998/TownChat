import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import SignInForm from '@components/Auth/SignInForm';
import Logo from '@assets/Logo.svg';
import GlobeIllustration from '@assets/SignInGlobe.svg';
import styles from './SignIn.module.css';

const SignIn = () => {
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
                    email: data.email,
                    password: data.password,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '로그인에 실패했습니다.');
            }

            // 로그인 성공 시 토큰 저장 & 리다이렉트
            localStorage.setItem('accessToken', result.data.accessToken);
            localStorage.setItem('refreshToken', result.data.refreshToken);

            // 메인 페이지 이동
            navigate('/');
        } catch (error) {
            setSignInError(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.innerContainer}>
                <div className={styles.logoSection}>
                    <img src={Logo} alt="TownChat 로고" className={styles.logo} />
                    <div className={styles.taglineContainer}>
                        <p className={styles.taglineMain}>소상공인들을 위한 챗봇 서비스 플랫폼</p>
                        <p className={styles.taglineHighlight}>
                            <span className={styles.highlight}>언제 어디서든</span>매장의 정보를 받아보세요!
                        </p>
                    </div>
                </div>

                <div className={styles.illustrationContainer}>
                    <img src={GlobeIllustration} alt="위치 기반 서비스" className={styles.illustration} />
                </div>

                {signInError && <div className={styles.errorMessage}>{signInError}</div>}
                
                <SignInForm
                    onSubmit={handleSubmit(onSubmit)}
                    register={register}
                    errors={errors}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default SignIn;