import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
// 메인 서비스
import MainPage from '@pages/Main/MainPage';
import SignIn from '@pages/Auth/SignIn';
import SignUp from '@pages/Auth/SignUp';
import ChatPage from '@pages/Chat/ChatPage';
// 프로필 페이지 추가
import { ProfilePage, EditProfilePage } from '@pages/Profile';

// 관리자 페이지
import AdminSignIn from '@pages/Admin/AdminSignIn';
import AdminLayout from '@components/Layouts/AdminLayout';
import AdminDashboard from '@components/Admin/AdminDashboard';
import AdminAdd from '@pages/Admin/AdminAdd';
import AdminEdit from '@pages/Admin/AdminEdit';
import AdminChatbots from '@components/Admin/AdminChatbots';

function App() {
    return (
        <Router>
            <Routes>
                {/* 메인 서비스 */}
                <Route path="/" element={<MainPage />} />
                <Route path="/main" element={<MainPage />} />
                <Route path="/store/:id/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />

                {/* 일반 사용자 경로 */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                
                {/* 프로필 페이지 라우트 추가 */}
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/profile/edit" element={<EditProfilePage />} />
                
                {/* 관리자 경로 */}
                <Route path="/admin/signin" element={<AdminSignIn />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="stores/add" element={<AdminAdd />} /> {/* 등록하기 라우트 */}
                    <Route path="chatbots" element={<AdminChatbots />} /> {/* 챗봇관리 라우트 */}
                    <Route path="chatbots/:id/edit" element={<AdminEdit />} /> {/* 수정하기 라우트 추가 */}
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                </Route>
                
                {/* 로그인 여부에 따라 메인 페이지 또는 로그인 페이지로 리디렉션 */}
                
                {/* 알 수 없는 경로는 로그인 페이지로 리디렉션 */}
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        </Router>
    );
}

export default App;