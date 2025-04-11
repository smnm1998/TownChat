import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
// 메인 서비스
import MainPage from '@pages/Main/MainPage';
import SignIn from '@pages/Auth/SignIn';
import SignUp from '@pages/Auth/SignUp';
import ChatPage from '@pages/Chat/ChatPage';
import AddPage from '@pages/Add/AddPage'; 
import { ProfilePage, EditProfilePage } from '@pages/Profile'; // 프로필 관련 페이지들 가져오기

// 관리자 페이지
import AdminSignIn from '@pages/Admin/AdminSignIn';
import AdminLayout from '@components/Layouts/AdminLayout';
import AdminDashboard from '@components/Admin/AdminDashboard';
import AdminAdd from '@pages/Admin/AdminAdd';
import AdminEdit from '@pages/Admin/AdminEdit';
import AdminChatbots from '@components/Admin/AdminChatbots';

function App() {
    // 로그인 상태 확인
    const isAuthenticated = localStorage.getItem('accessToken') !== null;

    // 각 하단 네비게이션 경로에 대한 미구현 페이지 컴포넌트
    const NotImplementedPage = ({ pageName }) => (
        <div style={{ 
            padding: '20px', 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100vh' 
        }}>
            <h1 style={{ marginBottom: '20px' }}>{pageName} 페이지</h1>
            <p>이 기능은 아직 구현되지 않았습니다.</p>
            <button 
                onClick={() => window.history.back()}
                style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    backgroundColor: '#FFC100',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                }}
            >
                뒤로 가기
            </button>
        </div>
    );

    return (
        <Router>
            <Routes>
                {/* 인증된 사용자만 접근 가능한 메인 서비스 라우트 */}
                <Route path="/" element={isAuthenticated ? <MainPage /> : <Navigate to="/signin" replace />} />
                <Route path="/store/:id/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
                <Route path="/add" element={<AddPage />} />
                
                {/* BottomNav 컴포넌트에서 사용하는 경로 추가 */}
                <Route path="/nearby" element={isAuthenticated ? <NotImplementedPage pageName="탐색하기" /> : <Navigate to="/signin" replace />} />
                <Route path="/add" element={isAuthenticated ? <NotImplementedPage pageName="추가하기" /> : <Navigate to="/signin" replace />} />
                <Route path="/chats" element={isAuthenticated ? <NotImplementedPage pageName="채팅목록" /> : <Navigate to="/signin" replace />} />
                
                {/* 프로필 관련 라우트 */}
                <Route path="/profile" element={isAuthenticated ? <ProfilePage /> : <Navigate to="/signin" replace />} />
                <Route path="/profile/edit" element={isAuthenticated ? <EditProfilePage /> : <Navigate to="/signin" replace />} />

                {/* 인증 관련 라우트 - 이미 로그인된 사용자는 메인 페이지로 리다이렉트 */}
                <Route path="/signin" element={isAuthenticated ? <Navigate to="/" replace /> : <SignIn />} />
                <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <SignUp />} />
                <Route path="/login" element={<Navigate to="/signin" replace />} />
                
                {/* 관리자 경로 */}
                <Route path="/admin/signin" element={<AdminSignIn />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="stores/add" element={<AdminAdd />} />
                    <Route path="chatbots" element={<AdminChatbots />} />
                    <Route path="chatbots/:id/edit" element={<AdminEdit />} />
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                </Route>
                
                {/* 알 수 없는 경로는 로그인 페이지로 리다이렉트 */}
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        </Router>
    );
}

export default App;