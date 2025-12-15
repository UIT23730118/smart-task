// /src/api/user.service.js (NEW FILE)

import api from './axios';
import authHeader from './auth.header';

const getAllUsers = () => {
  return api.get(`/users`, { headers: authHeader() });
};

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
 * Lấy danh sách chuyên môn (expertise) hiện tại của một người dùng.
 * API: GET /api/users/:userId/expertise
 * @param {number} userId - ID của người dùng.
 */
const getUserExpertise = (userId) => {
    return api.get(`/users/${userId}/expertise`, { headers: authHeader() });
};

/**
   * Cập nhật danh sách chuyên môn (expertise) cho một người dùng.
   * API: PUT /api/users/:userId/expertise
   * @param {number} userId - ID của người dùng.
   * @param {Array<{name: string, score: number}>} expertiseData - Dữ liệu expertise.
   */
const updateUserExpertise = (userId, expertiseData) => {
    // Sử dụng api.put và định dạng body đúng: { expertise: [...] }
    return api.put(
        `/users/${userId}/expertise`,
        { expertise: expertiseData }, 
        { headers: authHeader() }
    );
};

const getGlobalWorkloadSummary = () => {
    // Endpoint không cần userId vì nó lấy thông tin toàn cục
    return api.get(`/users/workload/global-summary`, { headers: authHeader() });
};

const UserService = {
    getAllUsers,
    getAssignmentRules,
    updateAssignmentRules,
    getUserExpertise,
    updateUserExpertise,
    getGlobalWorkloadSummary,
    // ... thêm các hàm quản lý user khác nếu cần
};

export default UserService;