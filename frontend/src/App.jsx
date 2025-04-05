import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
// 메인 서비스
import MainPage from '@pages/Main/MainPage';
import SignIn from '@pages/Auth/SignIn';
import SignUp from '@pages/Auth/SignUp';
import ChatPage from '@pages/Chat/ChatPage';

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
                <Route path="/store/:id/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />

                {/* 일반 사용자 경로 */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                
                {/* 관리자 경로 */}
                <Route path="/admin/signin" element={<AdminSignIn />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="stores/add" element={<AdminAdd />} /> {/* 등록하기 라우트 */}
                    <Route path="chatbots" element={<AdminChatbots />} /> {/* 챗봇관리 라우트 */}
                    <Route path="chatbots/:id/edit" element={<AdminEdit />} /> {/* 수정하기 라우트 추가 */}
                    <Route index element={<Navigate to="/admin/dashboard" replace />} />
                </Route>
                
                {/* 리다이렉트 */}
                <Route path="/login" element={<Navigate to="/signin" replace />} />
                <Route path="/" element={<Navigate to="/signin" replace />} />
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        </Router>
    );
}

export default App;