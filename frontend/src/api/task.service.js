// /src/api/task.service.js
import api from './axios';
import authHeader from './auth.header';

// Tạo task mới
const createTask = (data) => {
    // data = { title, description, projectId, assigneeId, typeId, ... }
    return api.post('/tasks', data, { headers: authHeader() });
};

// Lấy chi tiết 1 task (dùng cho Modal Edit)
const getTaskDetails = (taskId) => {
    return api.get(`/tasks/${taskId}`, { headers: authHeader() });
};

// Cập nhật task (Thêm/Sửa/Assign)
const updateTask = (taskId, data) => {
    // data = { title, description, assigneeId, priority, ... }
    return api.put(`/tasks/${taskId}`, data, { headers: authHeader() });
};

// Cập nhật status (dùng cho Kéo thả Kanban)
const updateTaskStatus = (taskId, statusId) => {
    return api.put(`/tasks/${taskId}/status`, { statusId }, { headers: authHeader() });
};

// Thêm comment
const addComment = (taskId, message) => {
    return api.post(`/tasks/${taskId}/comments`, { message }, { headers: authHeader() });
};

// (Bạn có thể thêm hàm xóa task ở đây)

const TaskService = {
    createTask,
    getTaskDetails,
    updateTask,
    updateTaskStatus,
    addComment,
};

export default TaskService;