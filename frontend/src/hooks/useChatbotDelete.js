import { useState } from 'react';

export const useChatbotDelete = () => {
    const [isDeleting, setIsDeleting] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const deleteChatbot = async (chatbotId) => {
        if (!window.confirm('정말로 이 챗봇을 삭제하시겠습니까?')) {
            return false;
        }
        
        setIsDeleting(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/chatbots/${chatbotId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '챗봇 삭제에 실패했습니다.');
            }

            setSuccess(true);
            return true;
        } catch (error) {
            setError(error.message);
            return false;
        } finally {
            setIsDeleting(false);
        }
    };

    return { deleteChatbot, isDeleting, error, success };
}