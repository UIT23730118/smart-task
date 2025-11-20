// /controllers/dashboard.controller.js
const db = require('../models');
const { Op } = require('sequelize');
const Task = db.tasks;
const Status = db.statuses;
const User = db.users;

exports.getStats = async (req, res) => {
    try {
        const userId = req.userId; // Lấy từ authJwt

        // 1. Đếm tổng số task được gán cho user
        const totalTasks = await Task.count({
            where: { assigneeId: userId }
        });

        // 2. Đếm task "In Progress"
        // (Chúng ta giả định status "In Progress" có tên là 'In Progress')
        const inProgressTasks = await Task.count({
            where: {
                assigneeId: userId
            },
            include: [{
                model: Status,
                where: { name: 'In Progress' },
                attributes: [] // Không cần lấy data từ status
            }]
        });

        // 3. Đếm task "Overdue" (Trễ hạn) (Chức năng 2)
        // (Là các task chưa 'Closed'/'Resolved' VÀ dueDate < hôm nay)
        const overdueTasks = await Task.count({
            where: {
                assigneeId: userId,
                dueDate: {
                    [Op.lt]: new Date() // dueDate < (less than) thời điểm hiện tại
                }
            },
            include: [{
                model: Status,
                // Loại trừ các task đã hoàn thành
                where: {
                    name: {
                        [Op.notIn]: ['Closed', 'Resolved']
                    }
                },
                attributes: []
            }]
        });

        res.status(200).send({
            totalTasks: totalTasks,
            inProgressTasks: inProgressTasks,
            overdueTasks: overdueTasks
        });

    } catch (error) {
        res.status(500).send({ message: `Error getting stats: ${error.message}` });
    }
};

// --- HÀM MỚI: Lấy dữ liệu cho Gantt Chart ---
exports.getGanttTasks = async (req, res) => {
    try {
        const userId = req.userId;

        // Lấy tất cả task mà user này liên quan (Assignee hoặc Reporter)
        const tasks = await Task.findAll({
            where: {
                [Op.or]: [
                    { assigneeId: userId },
                    { reporterId: userId }
                ]
            },
            include: [
                { model: Project, attributes: ['name'] },
                { model: Status, attributes: ['name', 'color'] }
            ]
        });

        // Format dữ liệu cho thư viện gantt-task-react
        const ganttData = tasks.map(task => {
            // Xử lý ngày tháng: Gantt cần Date object hợp lệ
            let start = task.startDate ? new Date(task.startDate) : new Date(task.createdAt);
            let end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000); // +1 ngày nếu null

            // Đảm bảo end > start (nếu không biểu đồ lỗi)
            if (end <= start) {
                end = new Date(start.getTime() + 86400000);
            }

            return {
                start: start,
                end: end,
                name: task.title,
                id: String(task.id),
                type: 'task',
                progress: task.progress || 0,
                isDisabled: true, // Chỉ xem, không kéo thả trực tiếp trên Dashboard
                styles: {
                    progressColor: task.status?.color || '#007bff',
                    progressSelectedColor: '#0056b3'
                },
                project: task.project?.name || 'No Project'
            };
        });

        res.status(200).send(ganttData);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};