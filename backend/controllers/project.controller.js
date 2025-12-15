// /controllers/project.controller.js
const db = require('../models');
const Project = db.projects;
const User = db.users;
const Team = db.teams;
const TeamMember = db.teamMembers;
const Status = db.statuses;
const Task = db.tasks;
const IssueType = db.issueTypes;
const { Op } = require('sequelize');

// Hàm tính thời gian làm task (Duration)
const getDurationInDays = (startDate, dueDate) => {
  if (!startDate || !dueDate) return 1;
  const start = new Date(startDate);
  const end = new Date(dueDate);
  const diffTime = end - start;
  const diffDays = diffTime / (1000 * 60 * 60 * 24);

  // Tối thiểu 1 ngày (tránh trường hợp làm trong ngày ra 0)
  return diffDays > 0 ? Math.ceil(diffDays) : 1;
};

const updateProjectProgress = async (projectId) => {
  console.log(`\n========== TÍNH TIẾN ĐỘ FINAL (WEIGHT x DURATION) (Project ID: ${projectId}) ==========`);

  if (!projectId) return 0;

  try {
    // 1. Lấy danh sách task (chỉ cần id, progress, workloadWeight, ngày tháng)
    const tasks = await Task.findAll({
      where: { projectId: projectId },
      attributes: ['id', 'progress', 'workloadWeight', 'startDate', 'dueDate', 'title'],
      raw: true
    });

    if (tasks.length === 0) {
      // Không có task nào -> Progress = 0
      await Project.update({ progress: 0 }, { where: { id: projectId } });
      return 0;
    }

    let totalWeightedProgress = 0; // Tử số: Tổng (Tiến độ * Sức nặng thực tế)
    let totalRealWeight = 0;       // Mẫu số: Tổng Sức nặng thực tế toàn dự án

    tasks.forEach(task => {
      const progress = parseFloat(task.progress) || 0;

      // A. Trọng số (Workload Weight - Nhập tay)
      const weight = parseFloat(task.workloadWeight) || 1;

      // B. Thời gian (Duration - Tính từ ngày bắt đầu đến hạn chót)
      const duration = getDurationInDays(task.startDate, task.dueDate);

      // === CÔNG THỨC FINAL ===
      // Sức nặng thực tế = Trọng số * Thời gian
      const realWeight = weight * duration;

      totalWeightedProgress += (progress * realWeight);
      totalRealWeight += realWeight;

      console.log(`  > Task [${task.title}]: Weight(${weight}) x Duration(${duration}d) = RealWeight ${realWeight.toFixed(1)} | Done: ${progress}%`);
    });

    // Tính % trung bình có trọng số
    const finalProgress = totalRealWeight === 0 ? 0 : (totalWeightedProgress / totalRealWeight);
    const roundedProgress = Math.round(finalProgress * 100) / 100;

    console.log(`📊 Tổng điểm đạt được: ${totalWeightedProgress.toFixed(1)} / Tổng sức nặng dự án: ${totalRealWeight.toFixed(1)}`);
    console.log(`✅ Progress dự án: ${roundedProgress}%`);

    // Update vào DB
    await Project.update(
      { progress: roundedProgress },
      { where: { id: projectId } }
    );

    return roundedProgress;

  } catch (err) {
    console.error("❌ LỖI TÍNH TIẾN ĐỘ:", err);
    return 0;
  }
};

// SỬA HÀM getProjectDetails - TÍNH PROGRESS TRƯỚC KHI TRẢ VỀ

exports.getProjectDetails = async (req, res) => {
	try {
		const projectId = req.params.id;

		// ✅ TÍNH LẠI PROGRESS TRƯỚC KHI LOAD
		const calculatedProgress = await updateProjectProgress(projectId);

		const project = await Project.findByPk(projectId, {
			attributes: [
				'id',
				'name',
				'description',
				'leaderId',
				'startDate',
				'endDate',
				'progress',
				'workloadFactor',
				'createdAt',
				'updatedAt'
			],
			include: [
				{ model: User, as: 'leader', attributes: ['id', 'name', 'email'] },
				{
					model: Status,
					required: false,
					where: { [Op.or]: [{ projectId }, { projectId: null }] },
					order: [['position', 'ASC']],
				},
				{
					model: Task,
					required: false,
					include: [
						{ model: User, as: 'assignee', attributes: ['id', 'name'] },
						{ model: IssueType, as: 'type', attributes: ['id', 'name'] },
					],
				},
			],
		});

		if (!project) return res.status(404).send({ message: 'Not found' });

		// Lấy members từ bảng Teams
		const teams = await Team.findAll({
			where: { projectId },
			include: [
				{
					model: User,
					as: 'members',
					attributes: ['id', 'name', 'email', 'skills'],
					through: { attributes: ['role'] },
				},
			],
		});

		// Flatten members
		const membersMap = new Map();
		teams.forEach((t) => t.members.forEach((m) => membersMap.set(m.id, m)));

		const result = project.toJSON();
		result.members = Array.from(membersMap.values());

		// ✅ ĐẢM BẢO PROGRESS ĐƯỢC CẬP NHẬT
		result.progress = calculatedProgress;

		// ✅ LOG
		console.log(`📊 [API] Returning project #${projectId} with progress: ${result.progress}%`);

		res.status(200).send(result);
	} catch (error) {
		console.error("Error getProjectDetails:", error);
		res.status(500).send({ message: error.message });
	}
};

// 1. TẠO PROJECT (Tự động tạo Team "General" cho Leader)
exports.createProject = async (req, res) => {
	try {
		const leaderId = req.userId;
		const project = await Project.create({
			name: req.body.name,
			description: req.body.description,
			leaderId: leaderId,
			startDate: new Date(),
			progress: 0,
		});

		// Tạo team mặc định
		const team = await Team.create({
			name: `${project.name} Core Team`,
			projectId: project.id,
			leaderId: leaderId,
		});

		// Thêm Leader vào team
		await TeamMember.create({
			teamId: team.id,
			userId: leaderId,
			role: 'subleader',
		});

		res.status(201).send(project);
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

// 2. LẤY PROJECT CỦA TÔI (Qua Leader ID hoặc qua Team Member)
exports.getMyProjects = async (req, res) => {
	try {
		const userId = req.userId;

		const user = await User.findByPk(userId, {
			include: [
				{
					model: Project,
					as: 'ledProjects',
					attributes: ['id', 'name', 'description', 'startDate', 'endDate', 'progress', 'workloadFactor', 'createdAt', 'updatedAt']
				}, // Project mình làm Leader
				{
					model: Team,
					as: 'teams', // Project mình tham gia qua Team
					include: [{
						model: Project,
						required: true,
						attributes: ['id', 'name', 'description', 'startDate', 'endDate', 'progress', 'workloadFactor', 'createdAt', 'updatedAt']
					}],
				},
			],
		});

		if (!user) return res.status(404).send({ message: 'User not found' });

		const directProjects = user.ledProjects || [];
		const teamProjects = user.teams.map((t) => t.project).filter((p) => p);

		// Gộp và lọc trùng
		const projectMap = new Map();
		[...directProjects, ...teamProjects].forEach((p) => projectMap.set(p.id, p));

		res.status(200).send(Array.from(projectMap.values()));
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

// 3. LẤY CHI TIẾT PROJECT (Bao gồm cả Members từ tất cả Teams)
exports.getProjectDetails = async (req, res) => {
	try {
		const projectId = req.params.id;
		const calculatedProgress = await updateProjectProgress(projectId);
		const project = await Project.findByPk(projectId, {
			attributes: [
				'id',
				'name',
				'description',
				'leaderId',
				'startDate',
				'endDate',
				'progress',
				'workloadFactor',
				'createdAt',
				'updatedAt'
			],
			include: [
				{ model: User, as: 'leader', attributes: ['id', 'name', 'email'] },
				{
					model: Status,
					required: false,
					where: { [Op.or]: [{ projectId }, { projectId: null }] },
					order: [['position', 'ASC']],
				},
				{
					model: Task,
					required: false,
					include: [
						{ model: User, as: 'assignee', attributes: ['id', 'name'] },
						{ model: IssueType, as: 'type', attributes: ['id', 'name'] },
					],
				},
			],
		});

		if (!project) return res.status(404).send({ message: 'Not found' });

		// Lấy members từ bảng Teams
		const teams = await Team.findAll({
			where: { projectId },
			include: [
				{
					model: User,
					as: 'members',
					attributes: ['id', 'name', 'email', 'skills'],
					through: { attributes: ['role'] },
				},
			],
		});

		// Flatten members
		const membersMap = new Map();
		teams.forEach((t) => t.members.forEach((m) => membersMap.set(m.id, m)));

		const result = project.toJSON();
		result.members = Array.from(membersMap.values());
		result.progress = calculatedProgress;

		res.status(200).send(result);
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

// 4. THÊM THÀNH VIÊN (Vào Team mặc định của Project)
exports.addMember = async (req, res) => {
	try {
		const projectId = req.params.id;
		const userEmail = req.body.email;

		const user = await User.findOne({ where: { email: userEmail } });
		if (!user) return res.status(404).send({ message: 'User not found' });

		// Tìm hoặc tạo team mặc định
		let team = await Team.findOne({ where: { projectId } });
		if (!team) {
			// Fallback nếu project cũ chưa có team
			const proj = await Project.findByPk(projectId);
			team = await Team.create({ name: `${proj.name} Team`, projectId, leaderId: req.userId });
		}

		// Check tồn tại
		const exists = await TeamMember.findOne({ where: { teamId: team.id, userId: user.id } });
		if (exists) return res.status(400).send({ message: 'User already in team' });

		await TeamMember.create({ teamId: team.id, userId: user.id, role: 'member' });
		res.status(200).send({ message: 'Member added' });
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

// 5. XÓA THÀNH VIÊN (Hàm này bị thiếu trước đó)
exports.removeMember = async (req, res) => {
	try {
		const projectId = req.params.id;
		const userIdToRemove = req.params.userId;

		// 1. Tìm tất cả các team thuộc về project này
		const teams = await Team.findAll({ where: { projectId: projectId } });
		const teamIds = teams.map((t) => t.id);

		if (teamIds.length === 0) {
			return res.status(404).send({ message: 'Project has no teams found.' });
		}

		// 2. Xóa user khỏi tất cả các team thuộc project này
		const result = await TeamMember.destroy({
			where: {
				userId: userIdToRemove,
				teamId: { [Op.in]: teamIds }, // Xóa nếu thuộc bất kỳ team nào của project
			},
		});

		if (result === 0) {
			return res.status(404).send({ message: 'Member not found in this project.' });
		}

		res.status(200).send({ message: 'User removed from project successfully.' });
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

exports.updateProject = async (req, res) => {
	const projectId = req.params.id;
	// Lấy các trường cần cập nhật, bao gồm workloadFactor
	const { name, description, endDate, workloadFactor } = req.body;
	try {
		const project = await Project.findByPk(projectId);
		if (!project) {
			return res.status(404).send({ message: "Project not found." });
		}

		// 💡 Giả định kiểm tra quyền Leader ở đây (hoặc dùng middleware)
		if (project.leaderId !== req.userId) {
			return res.status(403).send({ message: "Access denied. Only the project leader can update project details." });
		}

		const updateData = {
			name: name,
			description: description,
			endDate: endDate || null,

			// 💡 Cập nhật workloadFactor, đảm bảo nó là số và nằm trong phạm vi an toàn (ví dụ: 0.1 - 2.0)
			...(typeof workloadFactor !== 'undefined' && {
				workloadFactor: Math.min(2.0, Math.max(0.1, Number(workloadFactor)))
			})
		};

		const [updated] = await Project.update(updateData, { where: { id: projectId } });

		if (updated) {
			const updatedProject = await Project.findByPk(projectId);
			return res.status(200).send({
				message: "Project updated successfully.",
				project: updatedProject
			});
		} else {
			// Không có gì thay đổi hoặc không tìm thấy
			return res.status(200).send({ message: "Project retrieved, but no changes were applied." });
		}
	} catch (error) {
		console.error("Error updating project:", error);
		res.status(500).send({ message: error.message || "Server error while updating project." });
	}
};

// HÀM EXPORT WORKLOAD REPORT
exports.exportWorkloadReport = async (req, res) => {
	try {
		const projectId = req.params.id;

		const project = await Project.findByPk(projectId, {
			include: [
				{
					model: Task,
					include: [
						{model: User, as: 'assignee', attributes: ['id', 'name', 'email']}
					]
				}
			]
		});

		if (!project) {
			return res.status(404).send({message: 'Project not found.'});
		}

		// Tạo CSV data
		let csvData = 'Task ID,Task Title,Assignee,Progress,Workload Weight,Status\n';

		project.Tasks.forEach(task => {
			const assigneeName = task.assignee ? task.assignee.name : 'Unassigned';
			csvData += `${task.id},"${task.title}","${assigneeName}",${task.progress},${task.workloadWeight},${task.statusId}\n`;
		});

		// Thêm summary
		csvData += `\n\nProject Progress,${project.progress}%\n`;
		csvData += `Workload Factor,${project.workloadFactor}x\n`;

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename="workload_report_${projectId}.csv"`);
		res.status(200).send(csvData);

	} catch (error) {
		console.error('Error exporting workload report:', error);
		res.status(500).send({message: error.message || 'Error exporting report.'});
	}
};
	// 👇 HÀM MỚI: Lấy thống kê chi tiết của 1 dự án để xuất báo cáo
exports.getProjectStats = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId; // Lấy từ middleware verifyToken

        // 1. Lấy thông tin dự án
        const project = await Project.findByPk(id);
        if (!project) return res.status(404).send({ message: "Project not found" });

        // 🛡️ SECURITY CHECK: Chỉ Leader mới được xem báo cáo này
        // Nếu không phải leader -> Trả về 403
        if (project.leaderId !== Number(userId)) {
            console.log(`❌ Access Denied: User ${userId} is not leader of Project ${id}`);
            return res.status(403).send({ message: "Access denied. Only project leader can view stats." });
        }

        // 2. Thống kê Task
        const tasks = await Task.findAll({ where: { projectId: id } });

        const stats = {
            total: tasks.length,
            todo: tasks.filter(t => t.statusId && t.progress === 0).length, // Hoặc check theo status name nếu cấu hình
            inProgress: tasks.filter(t => t.progress > 0 && t.progress < 100).length,
            done: tasks.filter(t => t.progress === 100).length, // Cách check Done an toàn nhất
            late: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.progress < 100).length
        };

        // 3. Thống kê Workload
        const teams = await Team.findAll({
            where: { projectId: id },
            attributes: ['id']
        });
        const teamIds = teams.map(t => t.id);

        if (teamIds.length === 0) {
             return res.status(200).send({ project: project.name, stats, workload: [] });
        }

        const memberStats = await TeamMember.findAll({
            where: { teamId: { [Op.in]: teamIds } },
            include: [{
                model: User,
                attributes: ['id', 'name', 'email'] // Lấy thêm ID để so sánh chính xác
            }]
        });

        const workload = [];
        const processedUserIds = new Set();

        for (const m of memberStats) {
            // Check m.user tồn tại để tránh crash
            if (m.user && !processedUserIds.has(m.user.id)) {
                // Đếm task được assign cho user này trong dự án
                const userTaskCount = await Task.count({
                    where: { projectId: id, assigneeId: m.user.id }
                });

                // Đếm task đã xong (progress = 100 hoặc status DONE tùy db của bạn)
                // Ở đây mình dùng progress 100 cho an toàn
                const userDoneCount = await Task.count({
                    where: { projectId: id, assigneeId: m.user.id, progress: 100 }
                });

                processedUserIds.add(m.user.id);

                workload.push({
                    name: m.user.name,
                    email: m.user.email,
                    totalTasks: userTaskCount,
                    completedTasks: userDoneCount,
                    role: m.role
                });
            }
        }

        res.status(200).send({ project: project.name, stats, workload });

    } catch (error) {
        console.error("STATS ERROR:", error);
        res.status(500).send({ message: error.message });
    }
};
