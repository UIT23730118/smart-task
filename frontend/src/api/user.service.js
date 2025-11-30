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

const UserService = {
    getAssignmentRules,
    updateAssignmentRules,
    // ... thêm các hàm quản lý user khác nếu cần
};

export default UserService;