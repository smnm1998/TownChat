// src/App.jsx (변경 사항만 표시)
import {
    BrowserRouter as Router,
    Routes,
    Route,
    Navigate,
} from 'react-router-dom';
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
// 탐색하기 페이지 추가
import NearbyPage from '@pages/Nearby/NearbyPage';

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

    return (
        <Router>
            <Routes>
                {/* 인증된 사용자만 접근 가능한 메인 서비스 라우트 */}
                <Route
                    path="/"
                    element={
                        isAuthenticated ? (
                            <MainPage />
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />
                <Route path="/store/:id/chat" element={<ChatPage />} />
                <Route path="/chat/:id" element={<ChatPage />} />
                <Route path="/add" element={<AddPage />} />

                {/* BottomNav 컴포넌트에서 사용하는 경로 추가 */}
                {/* 탐색하기 페이지 경로 수정 - NotImplementedPage에서 NearbyPage로 변경 */}
                <Route
                    path="/nearby"
                    element={
                        isAuthenticated ? (
                            <NearbyPage />
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />
                <Route
                    path="/add/results"
                    element={
                        isAuthenticated ? (
                            <AddResultsPage />
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />
                <Route
                    path="/chats"
                    element={
                        isAuthenticated ? (
                            <ChatListPage />
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />

                {/* 프로필 관련 라우트 */}
                <Route
                    path="/profile"
                    element={
                        isAuthenticated ? (
                            <ProfilePage />
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />
                <Route
                    path="/profile/edit"
                    element={
                        isAuthenticated ? (
                            <EditProfilePage />
                        ) : (
                            <Navigate to="/signin" replace />
                        )
                    }
                />

                {/* 인증 관련 라우트 - 이미 로그인된 사용자는 메인 페이지로 리다이렉트 */}
                <Route
                    path="/signin"
                    element={
                        isAuthenticated ? (
                            <Navigate to="/" replace />
                        ) : (
                            <SignIn />
                        )
                    }
                />
                <Route
                    path="/signup"
                    element={
                        isAuthenticated ? (
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
