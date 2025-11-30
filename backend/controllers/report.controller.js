// /controllers/report.controller.js

const db = require('../models');
const Task = db.tasks;
const User = db.users;
const Project = db.projects;
const { Parser } = require('json2csv'); 
const { Op } = require('sequelize');

// Giả định Status ID 5 là "Closed" (Hoàn thành), dựa trên Seed Data
const COMPLETED_STATUS_ID = 5; 

// --- HÀM XUẤT BÁO CÁO KHỐI LƯỢNG CÔNG VIỆC ---
exports.exportWorkloadReport = async (req, res) => {
    // Nhận projectId từ URL parameter
    const { projectId } = req.params; 

    try {
        // 1. Kiểm tra Project tồn tại
        const project = await Project.findByPk(projectId);
        if (!project) {
            return res.status(404).send({ message: "Dự án không tồn tại." });
        }
        
        // 2. Truy vấn dữ liệu: Đếm số Task theo assigneeId và Status
        const tasksByAssignee = await Task.findAll({
            where: { projectId: projectId, assigneeId: { [Op.not]: null } }, 
            attributes: [
                'assigneeId',
                [db.sequelize.fn('COUNT', db.sequelize.col('tasks.id')), 'totalTasks'],
                [db.sequelize.literal(`SUM(CASE WHEN statusId = ${COMPLETED_STATUS_ID} THEN 1 ELSE 0 END)`), 'completedTasks'], 
                [db.sequelize.literal(`SUM(CASE WHEN dueDate < NOW() AND statusId != ${COMPLETED_STATUS_ID} THEN 1 ELSE 0 END)`), 'overdueTasks']
            ],
            
            // --- SỬA LỖI TẠI ĐÂY: SỬ DỤNG ALIAS 'assignee' ---
            include: [{ 
                model: User, 
                as: 'assignee', // SỬ DỤNG ALIAS ĐÃ ĐỊNH NGHĨA TRONG models/index.js
                attributes: ['name'] 
            }], 

            // Cập nhật Group: Phải dùng alias 'assignee' để tham chiếu cột tên người dùng
            group: ['assigneeId', 'assignee.id', 'assignee.name'],
            raw: true
        });

        // 3. Chuẩn hóa dữ liệu cho CSV
        const reportData = tasksByAssignee.map(item => {
            const total = parseInt(item.totalTasks);
            const completed = parseInt(item.completedTasks);

            return {
                'ID Người Xử Lý': item.assigneeId,
                // SỬ DỤNG 'assignee.name' (chữ thường) vì nó là tên cột từ raw: true
                'Tên Người Xử Lý': item['assignee.name'], 
                'Tổng số Task': total,
                'Task đã Hoàn thành': completed,
                'Task Quá Hạn': parseInt(item.overdueTasks),
                'Tỷ lệ Hoàn thành': total > 0 ? ((completed / total) * 100).toFixed(2) + '%' : '0.00%'
            };
        });

        // 4. Chuyển đổi sang CSV và gửi file
        const fields = ['ID Người Xử Lý', 'Tên Người Xử Lý', 'Tổng số Task', 'Task đã Hoàn thành', 'Task Quá Hạn', 'Tỷ lệ Hoàn thành'];
        const parser = new Parser({ fields, delimiter: ',' });
        const csv = parser.parse(reportData);

        // Gửi header để trình duyệt hiểu đây là file CSV
        res.header('Content-Type', 'text/csv; charset=utf-8');
        res.attachment(`workload_report_${project.name.replace(/\s/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
        res.send('\ufeff' + csv); // Thêm BOM (\ufeff) để hỗ trợ hiển thị tiếng Việt trong Excel

    } catch (error) {
        console.error("Lỗi khi xuất báo cáo:", error);
        res.status(500).send({ message: "Lỗi Server khi tạo báo cáo: " + error.message });
    }
};