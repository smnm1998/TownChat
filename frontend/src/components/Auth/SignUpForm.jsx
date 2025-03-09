import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaEnvelope, FaLock, FaUser, FaPhone } from 'react-icons/fa';
import Input from '@components/common/Input';
import Button from '@components/common/Button';
import styles from './SignUpForm.module.css';

const SignUpForm = ({ onSubmit, isLoading }) => {
    const [showPwd, setShowPwd] = useState(false);
    
    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm();
    
    const password = watch('password', '');
    
    const toggleShowPwd = () => {
        setShowPwd(!showPwd);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit(onSubmit)}>
            <Input
                id="username"
                type="text"
                placeholder="사용자 이름을 입력하세요"
                icon={<FaUser />}
                error={errors.username?.message}
                {...register('username', {
                    required: '사용자 이름을 입력해주세요',
                    minLength: {
                        value: 3,
                        message: '사용자 이름은 최소 3자 이상이어야 합니다',
                    },
                })}
            />
            
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
                    pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{6,}$/,
                        message: '비밀번호는 최소 6자 이상이며, 대문자, 소문자, 숫자를 포함해야 합니다',
                    },
                })}
            />
            
            <Input
                id="confirmPassword"
                type={showPwd ? 'text' : 'password'}
                placeholder="비밀번호를 다시 입력하세요"
                icon={<FaLock />}
                error={errors.confirmPassword?.message}
                {...register('confirmPassword', {
                    required: '비밀번호 확인을 입력해주세요',
                    validate: value => 
                        value === password || '비밀번호가 일치하지 않습니다',
                })}
            />
            
            <Input
                id="phone"
                type="tel"
                placeholder="전화번호를 입력하세요 (선택사항)"
                icon={<FaPhone />}
                error={errors.phone?.message}
                {...register('phone', {
                    pattern: {
                        value: /^[0-9]{10,11}$/,
                        message: '유효한 전화번호를 입력해주세요',
                    },
                })}
            />

            <div className={styles.termsContainer}>
                <label className={styles.terms}>
                    <input
                        type="checkbox"
                        className={styles.checkbox}
                        {...register('terms', {
                            required: '서비스 이용약관에 동의해주세요',
                        })}
                    />
                    <span className={`${styles.checkboxLabel} ${errors.terms ? styles.error : ''}`}>
                        서비스 이용약관 및 개인정보 처리방침에 동의합니다
                    </span>
                </label>
                {errors.terms && (
                    <p className={styles.errorMessage}>{errors.terms.message}</p>
                )}
            </div>

            <Button
                type="submit"
                variant="primary"
                size="md"
                fullWidth
                isLoading={isLoading}
            >
                회원가입
            </Button>
        </form>
    );
};

export default SignUpForm;