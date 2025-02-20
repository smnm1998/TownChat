import { useNavigate } from 'react-router-dom';

const MainPage = () => {
    const navigate = useNavigate();

    const onClickBtn = () => {
        navigate(`/admin/sign-in`);
    };

    return (
        <div>
            <h1>메인페이지 입니다.</h1>
            <button onClick={onClickBtn}>관리자 페이지 이동</button>
        </div>
    );
};

export default MainPage;
