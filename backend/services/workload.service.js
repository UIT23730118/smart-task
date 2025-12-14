// /services/workload.service.js (CLEANED and UPDATED for all KPIs)

const db = require('../models');
const { Op } = require('sequelize');

const Task = db.tasks;
const User = db.users;
const Project = db.projects;
const Status = db.statuses;

exports.getGlobalWorkloadSummary = async () => {
    
    // 1. Xác định Status ID của các trạng thái HOÀN THÀNH
    const doneStatuses = await Status.findAll({
        where: { name: { [Op.in]: ['Done', 'Completed', 'Closed'] } },
        attributes: ['id']
    });
    const doneStatusIds = doneStatuses.map(s => s.id);
    
    // 2. Lấy TẤT CẢ Tasks (Pending và Done) đã được giao với Project Factor và User Score
    const allAssignedTasks = await Task.findAll({
        where: { assigneeId: { [Op.ne]: null } },
        attributes: ['id', 'projectId', 'workloadWeight', 'assigneeId', 'statusId'],
        include: [
            {
                model: User,
                as: 'assignee', 
                attributes: ['name', 'score'], // Lấy score của User
                required: true 
            },
            {
                model: Project,
                as: 'project',
                attributes: ['workloadFactor'], // Lấy workloadFactor của Project
                required: true
            }
        ]
    });

    // 3. Khởi tạo Summary Map với tất cả Users
    const allUsers = await User.findAll({ attributes: ['id', 'name', 'score', 'availability'] });
    
    let summaryMap = allUsers.reduce((acc, user) => {
        acc[user.id] = {
            key: user.id,
            name: user.name,
            // Sử dụng user.score làm điểm năng suất. Dùng 1.0 nếu null/0.
            // Dùng user.availability trong tính toán nếu đó là ý định của bạn.
            userScore: user.score || 1.0, 
            userAvailability: user.availability || 1.0, 
            globalWorkload: 0,
            globalTasksCount: 0,
            totalTasksDone: 0, // 💡 KPI MỚI
            totalProjectsInvolved: new Set() // 💡 KPI MỚI
        };
        return acc;
    }, {});
    
    // 4. Lặp qua TẤT CẢ tasks để tổng hợp Workload và KPI
    allAssignedTasks.forEach(task => {
        const assigneeId = task.assigneeId;
        const summary = summaryMap[assigneeId];
        
        if (!summary) return; // Bỏ qua nếu user không được lấy (dù đã required: true)

        const isPending = !doneStatusIds.includes(task.statusId);
        const projectFactor = task.project?.workloadFactor || 1.0;
        const workloadWeight = task.workloadWeight || 0;
        
        // 💡 Tính tổng số Project (cả pending và done)
        summary.totalProjectsInvolved.add(task.projectId);
        
        if (isPending) {
            // Tính toán Workload Pending (sử dụng logic ban đầu)
            const rawWorkload = workloadWeight * projectFactor;
            
            // 🚨 FIX LỖI: Sử dụng userScore (score) hay userAvailability? Dùng trường 'score' cho năng suất
            summary.globalWorkload += rawWorkload; // Tính Workload thô trước
            summary.globalTasksCount += 1;
        } else {
            // 💡 Tính tổng số Task Đã Hoàn Thành
            summary.totalTasksDone += 1;
        }
    });

    const THRESHOLD = 20;

    // 5. Chuẩn bị kết quả cuối cùng và tính toán KPI Cân bằng Tải
    const finalSummaryData = Object.values(summaryMap).map(s => {
        // Áp dụng User Score (năng suất) cho Workload thô để có Workload đã điều chỉnh
        const finalGlobalWorkload = (s.globalWorkload / s.userScore); 
        
        const workloadBalanceIndex = finalGlobalWorkload / THRESHOLD;
        let workloadAssessment = 'Optimal'; 
        if (workloadBalanceIndex > 1.5) workloadAssessment = 'Highly Overloaded';
        else if (workloadBalanceIndex > 1.0) workloadAssessment = 'Overloaded';
        else if (workloadBalanceIndex < 0.5) workloadAssessment = 'Underutilized';

        return {
            key: s.id,
            name: s.name,
            userScore: parseFloat(s.userScore.toFixed(2)),
            globalTasksCount: s.globalTasksCount,
            totalTasksDone: s.totalTasksDone, // 💡 BỔ SUNG
            totalProjectsInvolved: s.totalProjectsInvolved.size, // 💡 BỔ SUNG
            globalWorkload: parseFloat(finalGlobalWorkload.toFixed(2)),
            workloadAssessment: workloadAssessment,
            workloadBalanceIndex: parseFloat(workloadBalanceIndex.toFixed(2)),
        };
    });

    return finalSummaryData;
};