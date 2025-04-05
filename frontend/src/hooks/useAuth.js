import { useState, useEffect, createContext, useContext } from 'react';

// 인증 컨텍스트 생성
const AuthContext = createContext({
    user: null,
    loading: true,
    error: null,
    signIn: () => Promise.resolve(false),
    signOut: () => Promise.resolve(false),
    fetchUserInfo: () => Promise.resolve()
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 사용자 정보 불러오기
    const fetchUserInfo = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');

            if (!token) {
                setUser(null);
                setLoading(false);
                return;
            }

            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setUser(data.data?.user || null);
            } else {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                setUser(null);
            }
        } catch (error) {
            console.error('사용자 정보 조회 실패: ', error);
            setError(error.message || '사용자 정보를 불러오는데 실패했습니다.');
            setUsers(null);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (emial, password) => {
        try {
            setLoading(true);
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || '로그인에 실패했습니다.');
            }

            if (data.data?.accessToken) {
                localStorage.setItem('accessToken', data.data.accessToken);
                
                if (data.data.refreshToken) {
                    localStorage.setItem('refreshToken', data.data.refreshToken);
                }

                // 사용자 정보 불러오기
                await fetchUserInfo();
                return true;
            } else {
                throw new Error('토큰 정보가 없습니다.');
            }
        } catch (error) {
            console.error('로그인 실패: ', error);
            setError(error.message || '로그인에 실패했습니다.');
            return false;
        } finally {
            setLoading(false);
        }
    };

    // 로그아웃
    const signOut = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('accessToken');
            const refreshToken = localStorage.getItem('refreshToken');

            if (token) {
                try {
                    await fetch('/api/auth/signout', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ refreshToken })
                    });
                } catch (error) {
                    console.warn('로그아웃 요청 실패, 로컬에서만 로그아웃 처리됨', error);
                }
            }
        } catch (error) {
            console.error('로그아웃 오류', error);
        } finally {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            setUser(null);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserInfo();
    }, []);

    const value ={
        user,
        loading,
        error,
        signIn,
        signOut,
        fetchUserInfo
    };
    
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        console.warn('useAuth 에러');
        return {
            user: null,
            loading: false,
            error: 'AuthProvider가 설정 x',
            signIn: () => Promise.resolve(false),
            signOut: () => Promise.resolve(),
            fetchUserInfo: () => Promise.resolve()
        };
    }
    return context;
};

export default useAuth;