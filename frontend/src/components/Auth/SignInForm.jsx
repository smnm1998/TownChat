import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEnvelope, FaLock } from 'react-icons/fa';
import Input from '@components/Common/Input';
import Button from '@components/Common/Button';
import styles from './SignInForm.module.css';

const SignInForm = ({ onSubmit, isLoading }) => {
    const [showPwd, setShowPwd] = useState(false);
    
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm();
    
    const toggleShowPwd = () => {
        setShowPwd(!showPwd);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
            <Input
                id="email"
                type="email"
                placeholder="이메일을 입력하세요"
                icon={<FaEnvelope />}
                error={errors.email?.message}
                {...register('email', {
                    required: '이메일을 입력해주세요',
                    pattern: {
                        value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                        message: '올바른 이메일 주소를 입력해주세요',
                    },
                })}
            />
            
            <Input
                id="password"
                type={showPwd ? 'text' : 'password'}
                placeholder="비밀번호를 입력하세요"
                icon={<FaLock />}
                error={errors.password?.message}
                showTogglePassword
                isPasswordVisible={showPwd}
                onTogglePassword={toggleShowPwd}
                {...register('password', {
                    required: '비밀번호를 입력해주세요',
                    minLength: {
                        value: 6,
                        message: '비밀번호는 최소 6자 이상이어야 합니다'
                    },
                })}
            />

            <div className={styles.rememberMeContainer}>
                <label className={styles.rememberMe}>
                    <input
                        type="checkbox"
                        id="rememberMe"
                        className={styles.checkbox}
                    />
                    <span className={styles.checkboxLabel}>로그인 상태 유지</span>
                </label>
            </div>

            <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
            >
                로그인
            </Button>
        </form>
    );
};

export default SignInForm;