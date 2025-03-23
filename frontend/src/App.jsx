import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import SignIn from '@pages/Auth/SignIn';
import SignUp from '@pages/Auth/SignUp';
import AdminSignIn from '@pages/Admin/AdminSignIn';
import AdminLayout from '@components/Layouts/AdminLayout';
import AdminDashboard from '@components/Admin/AdminDashboard';
import AdminAdd from '@pages/Admin/AdminAdd'; // 추가된 임포트
import AdminChatbots from '@components/Admin/AdminChatbots';

function App() {
    return (
        <Router>
            <Routes>
                {/* 일반 사용자 경로 */}
                <Route path="/signin" element={<SignIn />} />
                <Route path="/signup" element={<SignUp />} />
                
                {/* 관리자 경로 */}
                <Route path="/admin/signin" element={<AdminSignIn />} />
                <Route path="/admin" element={<AdminLayout />}>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="stores/add" element={<AdminAdd />} /> {/* 등록하기 라우트 */}
                    <Route path="chatbots" element={<AdminChatbots />} /> {/* 챗봇관리 라우트 */}
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