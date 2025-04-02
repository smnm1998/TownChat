import { useState } from 'react';

export const useChatbotUpdate = () => {
    const [isUpdating, setIsUpdating] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const updateChatbot = async (chatbotId, updatedData) => {
        setIsUpdating(true);
        setError(null);
        setSuccess(false);

        try {
            const token = localStorage.getItem('accessToken');
            const response = await fetch(`/api/chatbots/${chatbotId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updatedData)
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || '챗봇 업데이트에 실패했습니다.');
            }

            const result = await response.json();
            setSuccess(true);
            return result.data;
        } catch (error) {
            setError(error.message);
            return null;
        } finally {
            setIsUpdating(false);
        }
    };

    return { updateChatbot, isUpdating, error, success };
};