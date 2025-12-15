// /src/api/project.service.js
import api from './axios';
import authHeader from './auth.header'; // Import hàm lấy token

// Gọi API lấy project của tôi
const getMyProjects = () => {
    // Gửi request với header chứa token
    return api.get('/projects', { headers: authHeader() });
};

// Lấy chi tiết 1 project (bao gồm members, tasks, statuses)
const getProjectDetails = (id) => {
    return api.get(`/projects/${id}`, { headers: authHeader() });
};


// --- API Quản lý Thành viên ---
const addMember = (projectId, email) => {
    return api.post(`/projects/${projectId}/members`, { email }, { headers: authHeader() });
};

const removeMember = (projectId, userId) => {
    return api.delete(`/projects/${projectId}/members/${userId}`, { headers: authHeader() });
};

// Tạo project mới
const createProject = (data) => {
    // data = { name, description }
    return api.post('/projects', data, { headers: authHeader() });
};
// --- API Báo cáo & Xuất file ---
const exportWorkloadReport = (projectId) => {
    return api.get(`/projects/${projectId}/reports/workload`, { 
        headers: authHeader(),
        responseType: 'blob' // RẤT QUAN TRỌNG: Yêu cầu Axios trả về dữ liệu nhị phân (blob)
    });
};

// Cập nhật Project
const updateProject = (projectId, updateData) => {
    return api.put(`/projects/${projectId}`, updateData, { headers: authHeader() });
};

// =========================================================
// CHỨC NĂNG MỚI
// =========================================================

/**
 * Gọi API tính ngày kết thúc dự án dựa trên Due Date muộn nhất của Tasks.
 * @param {number} projectId ID của dự án
 * @returns {Promise} Kết quả từ API
 */
const calculateProjectEndDate = (projectId) => {
    // Sử dụng POST vì thao tác này thay đổi dữ liệu (endDate của Project)
    return api.post(`/projects/${projectId}/calculate-end-date`, {}, { headers: authHeader() });
};

/**
 * Gọi API để import toàn bộ cấu trúc dự án (Project, Statuses, Tasks, Members).
 * @param {Object} projectData Đối tượng JSON đầy đủ của dự án
 * @returns {Promise} Kết quả từ API
 */
const importFullProject = (projectData) => {
    return api.post('/projects/import-full', projectData, { headers: authHeader() });
};

const ProjectService = {
    getMyProjects,
    getProjectDetails,
    addMember,
    removeMember,
    createProject,
    exportWorkloadReport,
    updateProject,
    calculateProjectEndDate, 
    importFullProject,
};

export default ProjectService;