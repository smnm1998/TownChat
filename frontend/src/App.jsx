import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css'
import SignIn from '@pages/Auth/SignIn';
import SignUp from '@pages/Auth/SignUp';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/signin" element={<SignIn />} />
                
                <Route path="/signup" element={<SignUp />} />
                
                <Route path="/login" element={<Navigate to="/signin" replace />} />
                <Route path="/" element={<Navigate to="/signin" replace />} />
                <Route path="*" element={<Navigate to="/signin" replace />} />
            </Routes>
        </Router>
    );
}

export default App;