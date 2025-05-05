import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import SignUpForm from '@components/Auth/SignUpForm';
import Logo from '@assets/Logo.svg';
import styles from './SignUp.module.css';

const SignUp = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [signUpError, setSignUpError] = useState('');

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();

    const onSubmit = async (data) => {
        setIsLoading(true);
        setSignUpError('');
        
        try {
            // 비밀번호 확인은 서버로 보내지 않음
            const { passwordConfirm, termsAgreed, ...formData } = data;
            
            const response = await fetch('http://localhost:3000/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || '회원가입에 실패했습니다.');
            }

            // 회원가입 성공 시 토큰 저장 & 리다이렉트
            localStorage.setItem('accessToken', result.data.accessToken);
            localStorage.setItem('refreshToken', result.data.refreshToken);

            // 로그인 페이지 또는 메인 페이지로 이동
            navigate('/signin', { state: { message: '회원가입이 완료되었습니다. 로그인해주세요.' } });
        } catch (error) {
            setSignUpError(error.message);
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
                            <span className={styles.highlight}>지금 바로</span> 회원가입하고 서비스를 이용해보세요!
                        </p>
                    </div>
                </div>

                {signUpError && <div className={styles.errorMessage}>{signUpError}</div>}
                
                <SignUpForm
                    onSubmit={handleSubmit(onSubmit)}
                    register={register}
                    errors={errors}
                    isLoading={isLoading}
                />
            </div>
        </div>
    );
};

export default SignUp;