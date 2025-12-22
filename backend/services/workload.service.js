// /services/workload.service.js
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
        attributes: ['id', 'name']
    });
    const doneStatusIds = doneStatuses.map(s => s.id);

    // 2. Lấy TẤT CẢ Tasks đã được giao (pending + done)
    const allAssignedTasks = await Task.findAll({
        where: { assigneeId: { [Op.ne]: null } },
        attributes: [
            'id',
            'title',
            'projectId',
            'workloadWeight',
            'assigneeId',
            'statusId',
            'progress',
            'dueDate'
        ],
        include: [
            {
                model: User,
                as: 'assignee',
                attributes: ['id', 'name', 'score'],
                required: true
            },
            {
                model: Project,
                as: 'project',
                attributes: ['id', 'name', 'workloadFactor'],
                required: true
            },
            {
                model: Status,
                attributes: ['id', 'name', 'color']
            }
        ]
    });

    // 3. Khởi tạo Summary Map cho TẤT CẢ Users
    const allUsers = await User.findAll({
        attributes: ['id', 'name', 'score', 'availability']
    });

    let summaryMap = allUsers.reduce((acc, user) => {
        acc[user.id] = {
            key: user.id,
            name: user.name,
            userScore: user.score || 1.0,
            userAvailability: user.availability || 1.0,

            // KPI
            globalWorkload: 0,
            globalTasksCount: 0,
            totalTasksDone: 0,
            totalProjectsInvolved: new Set(),

            // 🔥 CHI TIẾT TASK / PROJECT
            currentTasks: [],
            completedTasks: []
        };
        return acc;
    }, {});

    // 4. Tổng hợp dữ liệu
    allAssignedTasks.forEach(task => {
        const summary = summaryMap[task.assigneeId];
        if (!summary) return;

        const isDone = doneStatusIds.includes(task.statusId);
        const projectFactor = task.project?.workloadFactor || 1.0;
        const workloadWeight = task.workloadWeight || 0;

        summary.totalProjectsInvolved.add(task.projectId);

        const taskDetail = {
            taskId: task.id,
            title: task.title,
            progress: task.progress,
            dueDate: task.dueDate,
            workloadWeight: task.workloadWeight,
            project: {
                projectId: task.project.id,
                name: task.project.name,
                workloadFactor: task.project.workloadFactor
            },
            status: task.status
                ? {
                    statusId: task.status.id,
                    name: task.status.name,
                    color: task.status.color
                }
                : null
        };

        if (!isDone) {
            // Pending task
            const rawWorkload = workloadWeight * projectFactor;
            summary.globalWorkload += rawWorkload;
            summary.globalTasksCount += 1;
            summary.currentTasks.push(taskDetail);
        } else {
            // Completed task
            summary.totalTasksDone += 1;
            summary.completedTasks.push(taskDetail);
        }
    });

    const THRESHOLD = 20;

    // 5. Chuẩn hóa kết quả cuối
    return Object.values(summaryMap).map(s => {
        const finalGlobalWorkload = s.globalWorkload / s.userScore;
        const workloadBalanceIndex = finalGlobalWorkload / THRESHOLD;

        let workloadAssessment = 'Optimal';
        if (workloadBalanceIndex > 1.5) workloadAssessment = 'Highly Overloaded';
        else if (workloadBalanceIndex > 1.0) workloadAssessment = 'Overloaded';
        else if (workloadBalanceIndex < 0.5) workloadAssessment = 'Underutilized';

        return {
            key: s.key,
            name: s.name,

            // KPI
            userScore: Number(s.userScore.toFixed(2)),
            globalTasksCount: s.globalTasksCount,
            totalTasksDone: s.totalTasksDone,
            totalProjectsInvolved: s.totalProjectsInvolved.size,
            globalWorkload: Number(finalGlobalWorkload.toFixed(2)),
            workloadBalanceIndex: Number(workloadBalanceIndex.toFixed(2)),
            workloadAssessment,

            // 🔥 TASK / PROJECT DETAIL
            currentTasks: s.currentTasks,
            completedTasks: s.completedTasks
        };
    });
};
