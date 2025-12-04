// /src/api/user.service.js (NEW FILE)

import api from './api';
import authHeader from '../auth/auth-header';

const getAssignmentRules = (userId) => {
    // API: GET /api/users/:userId/rules
    return api.get(`/users/${userId}/rules`, { headers: authHeader() });
};

const updateAssignmentRules = (userId, rules) => {
    // API: PUT /api/users/:userId/rules
    // Gửi Rules dưới dạng JSON array trong body
    return api.put(`/users/${userId}/rules`, { rules }, { headers: authHeader() });
};

/**
   * Cập nhật danh sách chuyên môn (expertise) cho một người dùng.
   * @param {number} userId - ID của người dùng.
   * @param {Array<{name: string, score: number}>} expertiseData - Dữ liệu expertise.
   */
const updateUserExpertise = (userId, expertiseData) => {
    return axios.put(
        `${BASE_API_URL}/users/${userId}/expertise`,
        { expertise: expertiseData }, // Body phải chứa đối tượng { expertise: [...] }
        { headers: authHeader() }
    );
};

const UserService = {
    getAssignmentRules,
    updateAssignmentRules,
    updateUserExpertise,
    // ... thêm các hàm quản lý user khác nếu cần
};

export default UserService;