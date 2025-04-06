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
            console.error('Failed to fetch user info: ', error);
            setError(error.message || 'Failed to load user information.');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email, password) => {
        try {
            setLoading(true);
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password, username: email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed.');
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
                throw new Error('No token information.');
            }
        } catch (error) {
            console.error('Login failed: ', error);
            setError(error.message || 'Login failed.');
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
                    console.warn('Logout request failed, logging out locally only', error);
                }
            }
        } catch (error) {
            console.error('Logout error', error);
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

    const value = {
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
        console.warn('useAuth error');
        return {
            user: null,
            loading: false,
            error: 'AuthProvider is not set up',
            signIn: () => Promise.resolve(false),
            signOut: () => Promise.resolve(),
            fetchUserInfo: () => Promise.resolve()
        };
    }
    return context;
};

export default useAuth;