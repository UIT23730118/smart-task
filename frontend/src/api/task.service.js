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

// =======================================================
// FIX: SỬ DỤNG 'api' ĐÃ IMPORT VÀ BỎ 'API_URL' KHÔNG TỒN TẠI
// =======================================================
const deleteTask = (taskId) => {
  // Sử dụng phương thức DELETE của axios
  return api.delete(`/tasks/${taskId}`, { headers: authHeader() }); // Thêm authHeader()
};
// =======================================================

// Cập nhật status (dùng cho Kéo thả Kanban)
const updateTaskStatus = (taskId, statusId) => {
    return api.put(`/tasks/${taskId}/status`, { statusId }, { headers: authHeader() });
};

// Thêm comment
const addComment = (taskId, message) => {
    return api.post(`/tasks/${taskId}/comments`, { message }, { headers: authHeader() });
};

// --- HÀM MỚI CHO ATTACHMENTS ---

// Hàm Tải lên tệp đính kèm
const uploadAttachment = (taskId, file) => {
    const formData = new FormData();
    // 'attachment' PHẢI MATCH với tên key trong Multer (upload.single('attachment'))
    formData.append('attachment', file); 

    return api.post(`/tasks/${taskId}/attachments`, formData, {
        headers: {
            ...authHeader(),
            'Content-Type': 'multipart/form-data', // Cần thiết cho việc gửi file
        },
    });
};

// Hàm Lấy danh sách tệp đính kèm của Task
const getTaskAttachments = (taskId) => {
    return api.get(`/tasks/${taskId}/attachments`, { headers: authHeader() });
};

const uploadProjectAttachment = (projectId, file) => {
    const formData = new FormData();
    formData.append('attachment', file); 
    return api.post(`/projects/${projectId}/attachments`, formData, {
        headers: { ...authHeader(), 'Content-Type': 'multipart/form-data' },
    });
};

const getProjectAttachments = (projectId) => {
    return api.get(`/projects/${projectId}/attachments`, { headers: authHeader() });
};

const deleteAttachment = (attachmentId) => {
    // Gọi route DELETE /api/attachments/:id
    return api.delete(`/attachments/${attachmentId}`, { headers: authHeader() });
};

const suggestTaskAssignment = (taskId) => {
    // Gọi API PUT (hoặc POST) đã định nghĩa ở Backend
    // Giả định API là POST /api/tasks/:taskId/suggest-assignee
    return api.post(`/tasks/${taskId}/suggest-assignee`, {}, { headers: authHeader() });
};

const TaskService = {
    createTask,
    getTaskDetails,
    updateTask,
    deleteTask, // FIX: THÊM DELETE TASK VÀO ĐỐI TƯỢNG EXPORT
    updateTaskStatus,
    addComment,
    uploadAttachment,
    getTaskAttachments,
    uploadProjectAttachment,
    getProjectAttachments,
    deleteAttachment,
    suggestTaskAssignment,
};

export default TaskService;