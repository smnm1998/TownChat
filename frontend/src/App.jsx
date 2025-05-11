import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
    useNavigate,
    useLocation
} from 'react-router-dom';
import { useEffect } from 'react';
import './App.css';
// 메인 서비스
import MainPage from '@pages/Main/MainPage';
import SignIn from '@pages/Auth/SignIn';
import SignUp from '@pages/Auth/SignUp';
import ChatPage from '@pages/Chat/ChatPage';
import AddPage from '@pages/Add/AddPage';
import AddResultsPage from '@pages/Add/AddResult';
import ChatListPage from '@pages/ChatList/ChatListPage';
import { ProfilePage, EditProfilePage } from '@pages/Profile';
// 탐색하기 페이지
import NearbyPage from '@pages/Nearby/NearbyPage';

// 관리자 페이지
import AdminSignIn from '@pages/Admin/AdminSignIn';
import AdminLayout from '@components/Layouts/AdminLayout';
import AdminDashboard from '@components/Admin/AdminDashboard';
import AdminAdd from '@pages/Admin/AdminAdd';
import AdminEdit from '@pages/Admin/AdminEdit';
import AdminChatbots from '@components/Admin/AdminChatbots';

// 인증 상태를 확인하는 컴포넌트
const AuthCheck = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    useEffect(() => {
        const token = localStorage.getItem('accessToken');
        
        if (!token) {
            // 로그인 화면이 아닌 다른 페이지에 접근하려 할 때
            if (!['/signin', '/signup', '/admin/signin'].includes(location.pathname)) {
                navigate('/signin', { replace: true });
            }
        }
    }, [navigate, location]);
    
    return null;
};

// 인증 필요한 라우트를 감싸는 컴포넌트
const ProtectedRoute = ({ children }) => {
    const isAuthenticated = localStorage.getItem('accessToken') !== null;
    
    if (!isAuthenticated) {
        return <Navigate to="/signin" replace />;
    }
    
    return children;
};

function App() {
    return (
        <Router>
            {/* 모든 라우트에서 인증 상태 확인 */}
            <AuthCheck />
            
            <Routes>
                {/* 인증된 사용자만 접근 가능한 메인 서비스 라우트 */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <MainPage />
                        </ProtectedRoute>
                    }
                />
                <Route 
                    path="/store/:id/chat" 
                    element={
                        <ProtectedRoute>
                            <ChatPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/chat/:id" 
                    element={
                        <ProtectedRoute>
                            <ChatPage />
                        </ProtectedRoute>
                    } 
                />
                <Route 
                    path="/add" 
                    element={
                        <ProtectedRoute>
                            <AddPage />
                        </ProtectedRoute>
                    } 
                />

                {/* BottomNav 컴포넌트에서 사용하는 경로 */}
                <Route
                    path="/nearby"
                    element={
                        <ProtectedRoute>
                            <NearbyPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/add/results"
                    element={
                        <ProtectedRoute>
                            <AddResultsPage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/chats"
                    element={
                        <ProtectedRoute>
                            <ChatListPage />
                        </ProtectedRoute>
                    }
                />

                {/* 프로필 관련 라우트 */}
                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <ProfilePage />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/profile/edit"
                    element={
                        <ProtectedRoute>
                            <EditProfilePage />
                        </ProtectedRoute>
                    }
                />

                {/* 인증 관련 라우트 - 이미 로그인된 사용자는 메인 페이지로 리디렉트 */}
                <Route
                    path="/signin"
                    element={
                        localStorage.getItem('accessToken') ? (
                            <Navigate to="/" replace />
                        ) : (
                            <SignIn />
                        )
                    }
                />
                <Route
                    path="/signup"
                    element={
                        localStorage.getItem('accessToken') ? (
                            <Navigate to="/" replace />
                        ) : (
                            <SignUp />
                        )
                    }
                />
                <Route
                    path="/login"
                    element={<Navigate to="/signin" replace />}
                />

                {/* 관리자 경로 */}
                <Route path="/admin/signin" element={<AdminSignIn />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="stores/add" element={<AdminAdd />} />
                    <Route path="chatbots" element={<AdminChatbots />} />
                    <Route path="chatbots/:id/edit" element={<AdminEdit />} />
                    <Route
                        index
                        element={<Navigate to="/admin/dashboard" replace />}
                    />
                </Route>

                {/* 알 수 없는 경로는 로그인 페이지로 리다이렉트 */}
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        </Router>
    );
}

export default App;