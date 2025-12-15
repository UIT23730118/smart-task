// /src/api/dashboard.service.js
import api from './axios';
import authHeader from './auth.header';

// Gọi API lấy thống kê (Backend vừa tạo)
const getDashboardStats = () => {
    return api.get('/dashboard/stats', { headers: authHeader() });
};

const getGanttTasks = () => {
    return api.get('/dashboard/gantt', { headers: authHeader() });
};

const getGanttTasksWithMembers = () => {
    return api.get('/dashboard/gantt-tasks', { headers: authHeader() });
};

const DashboardService = {
    getDashboardStats,
    getGanttTasks,
    getGanttTasksWithMembers,
};

export default DashboardService;