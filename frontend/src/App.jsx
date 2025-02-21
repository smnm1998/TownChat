import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from '@pages/Main/MainPage';
import AdminSignInPage from '@pages/Admin/Auth/AdminSignInPage';
import AdminMainPage from '@pages/Admin/AdminMainPage';
import AdminList from '@pages/Admin/ChatList/AdminList';
import AdminCreate from '@pages/Admin/CreateChat/AdminCreate';
import UserSignIn from '@pages/Service/UserSignIn';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 메인 페이지 */}
                <Route path="/" element={<MainPage />} />
                <Route path="/sign-in" element={<UserSignIn />} />

                {/* 관리자 페이지 */}
                <Route path="/admin/sign-in" element={<AdminSignInPage />} />
                <Route path="/admin" element={<AdminMainPage />}>
                    <Route index path="list" element={<AdminList />} />
                    <Route path="create" element={<AdminCreate />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;
