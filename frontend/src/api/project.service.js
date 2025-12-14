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

// --- HÀM MỚI (Chia team) ---
const addMember = (projectId, email) => {
    return api.post(`/projects/${projectId}/members`, { email }, { headers: authHeader() });
};

// --- HÀM MỚI (Chia team) ---
const removeMember = (projectId, userId) => {
    return api.delete(`/projects/${projectId}/members/${userId}`, { headers: authHeader() });
};

const createProject = (data) => {
    // data = { name, description }
    return api.post('/projects', data, { headers: authHeader() });
};

const exportWorkloadReport = (projectId) => {
    return api.get(`/projects/${projectId}/reports/workload`, { 
        headers: authHeader(),
        responseType: 'blob' // RẤT QUAN TRỌNG: Yêu cầu Axios trả về dữ liệu nhị phân (blob)
    });
};

const updateProject = (projectId, updateData) => {
    return api.put(`/projects/${projectId}`, updateData, { headers: authHeader() });
};

const ProjectService = {
    getMyProjects,
    getProjectDetails, // Thêm
    addMember,         // Thêm
    removeMember,      // Thêm
    createProject,
    exportWorkloadReport,
    updateProject,
};

export default ProjectService;