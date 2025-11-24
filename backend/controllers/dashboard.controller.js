// /controllers/dashboard.controller.js
const db = require('../models');
const { Op } = require('sequelize');
const Task = db.tasks;
const Project = db.projects;
const Status = db.statuses;

// API 1: Lấy số liệu thống kê (Stats)
exports.getStats = async (req, res) => {
    try {
        const userId = req.userId;

        // 1. Tổng số task của user
        const totalTasks = await Task.count({
            where: { assigneeId: userId }
        });

        // 2. Task đang làm (Status khác 'Done', 'Closed', 'Resolved')
        // Chúng ta sẽ lọc dựa trên tên status
        const inProgressTasks = await Task.count({
            where: { assigneeId: userId },
            include: [{
                model: Status,
                where: {
                    name: { [Op.notIn]: ['Done', 'Closed', 'Resolved'] } // Đếm những cái CHƯA xong
                }
            }]
        });

        // 3. Task quá hạn (Dùng trường isOverdue bạn đã thêm vào DB)
        // Hoặc tính toán thủ công: dueDate < NOW và chưa xong
        const overdueTasks = await Task.count({
            where: {
                assigneeId: userId,
                [Op.or]: [
                    { isOverdue: true }, // Dùng cột có sẵn trong DB
                    {
                        dueDate: { [Op.lt]: new Date() }, // Hoặc tự tính: Hạn chót < Hôm nay
                        progress: { [Op.lt]: 100 }        // Và chưa xong (progress < 100)
                    }
                ]
            }
        });

        res.status(200).send({
            totalTasks,
            inProgressTasks,
            overdueTasks
        });

    } catch (error) {
        console.error("Stats Error:", error);
        res.status(500).send({ message: error.message });
    }
};

// API 2: Lấy dữ liệu cho Gantt Chart & Biểu đồ
exports.getGanttTasks = async (req, res) => {
    try {
        const userId = req.userId;

        // Lấy task user được giao HOẶC user tạo
        const tasks = await Task.findAll({
            where: {
                [Op.or]: [
                    { assigneeId: userId },
                    { reporterId: userId }
                ]
            },
            attributes: [
                'id', 'title', 'startDate', 'dueDate', 'progress', 'priority', 'typeId'
            ], // Chỉ lấy các trường cần thiết
            include: [
                { model: Project, attributes: ['name'] }, // Để vẽ biểu đồ theo Project
                { model: Status, attributes: ['name', 'color'] } // Để vẽ biểu đồ theo Status
            ],
            order: [['startDate', 'ASC']]
        });

        // Map dữ liệu sang format Frontend cần
        const formattedData = tasks.map(task => {
            // Xử lý ngày tháng an toàn (tránh null gây lỗi biểu đồ)
            let start = task.startDate ? new Date(task.startDate) : new Date();
            let end = task.dueDate ? new Date(task.dueDate) : new Date(start.getTime() + 86400000);

            // Gantt chart yêu cầu End > Start
            if (end <= start) end = new Date(start.getTime() + 86400000);

            return {
                id: String(task.id),
                name: task.title,
                start: start,
                end: end,
                progress: task.progress || 0,
                type: 'task',
                project: task.project ? task.project.name : 'No Project', // Dữ liệu cho Bar Chart
                status: task.status ? task.status.name : 'Unknown',       // Dữ liệu cho Pie Chart

                // Config màu sắc cho Gantt
                styles: {
                    progressColor: task.status?.color || '#007bff',
                    progressSelectedColor: '#0056b3'
                },
                isDisabled: true // Chỉ xem
            };
        });

        res.status(200).send(formattedData);
    } catch (error) {
        console.error("Gantt Error:", error);
        res.status(500).send({ message: error.message });
    }
};