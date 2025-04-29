const BASE_URL = '/api';

const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return token ? { 'Authorization' : `Bearer ${token}`} : {};
};

const apiRequest = async (endpoint, options = {}) => {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
            ...options.headers
        };

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            ...options,
            headers
        });

        if (response.status === 401) {
            const refreshToken = localStorage.getItem('refreshToken');

            if (refreshToken) {
                const refreshResponse = await fetch(`${BASE_URL}/auth/refresh-token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ refreshToken })
                });

                if (refreshResponse.ok) {
                    const refreshData = await refreshResponse.json();
                    localStorage.setItem('accessToken', refreshData.data.accessToken);


                    return apiRequest(endpoint, options);
                }
            }

            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            window.location.href = '/signin';
            throw new Error('인증이 필요합니다. 다시 로그인해주세요.');
        }

        if (!response.ok) {
            let errorMessage = '요청 처리 중 오류가 발생했습니다.';
            try {
                const errorData = await response.json();
                errorMessage = errorData.message || errorMessage;
            } catch (e) {
                // 실패 - 기본 메시지 파싱
            } 
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('API 요청 오류', error);
        throw error;
    }
};

// 점포 서비스 객체
const storeService = {
    getAllStores: async (params = {}) => {
        const queryParams = new URLSearchParams();

        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);
        if (params.search) queryParams.append('search', params.search);
        if (params.active !== undefined) queryParams.append('active', params.active);

        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        return apiRequest(`/stores${query}`);
    },

    // 주변 점포 검색
    getNearbyStores: async (latitude, longitude, radius = 5, params = {}) => {
        const queryParams = new URLSearchParams();

        queryParams.append('latitude', latitude);
        queryParams.append('longitude', longitude);
        if (radius) queryParams.append('radius', radius);
        if (params.page) queryParams.append('page', params.page);
        if (params.limit) queryParams.append('limit', params.limit);

        return apiRequest(`/stores/nearby?${queryParams.toString()}`);
    },

    getStoresByRegion: async (provinceId, cityId) => {
        let queryString = `?provinceId=${provinceId}`;
        if (cityId) {
            queryString += `&cityId=${cityId}`;
        }
        
        return apiRequest(`/stores/region${queryString}`);
    },

    getSearchSuggestions: async (query) => {
        if (!query || query.length < 2) return { data: [] };
        return apiRequest(`/stores/suggestions?query=${encodeURIComponent(query)}`);
    },

    getStoreById: async (storeId) => {
        return apiRequest(`/stores/${storeId}`);
    },

    getStoreChatbot: async (storeId) => {
        return apiRequest(`/chatbots/store/${storeId}`);
    }
};

export default storeService;