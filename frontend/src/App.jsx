import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainPage from '@pages/Main/MainPage';
import AdminSignInPage from '@pages/Admin/Auth/AdminSignInPage';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* 메인 페이지 */}
                <Route path="/" element={<MainPage />} />

                {/* 관리자 페이지 */}
                <Route path="/admin/sign-in" element={<AdminSignInPage />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;
