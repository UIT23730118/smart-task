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

// --- HÀM TÍNH CPM (ĐỂ NGUYÊN BÊN NGOÀI hoac TRÊN CÙNG) ---
const calculateCPM = (tasks) => {

    const normalizeDate = (dateStr) => {
        if (!dateStr) return null;
        const d = new Date(dateStr);
        d.setHours(12, 0, 0, 0);
        return d.getTime();
    };

    const taskMap = {};

    // 1. TÌM MỐC 0 (Để tính Duration và Deadline)
    const validStartDates = tasks
        .map(t => normalizeDate(t.startDate))
        .filter(t => t && t > 946684800000);

    const projectMinDate = validStartDates.length > 0 ? Math.min(...validStartDates) : normalizeDate(new Date());

    // 2. MAP DỮ LIỆU
    tasks.forEach(t => {
        const taskData = t.toJSON ? t.toJSON() : t;

        const start = normalizeDate(taskData.startDate);
        const end = normalizeDate(taskData.dueDate);

        // Tính Duration
        let duration = 1;
        if (start && end) {
            const diffTime = end - start;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            duration = diffDays > 0 ? diffDays : 1;
        }

        taskMap[taskData.id] = {
            ...taskData,
            duration: duration,
            // 👇👇👇 THAY ĐỔI Ở ĐÂY: LUÔN KHỞI TẠO LÀ 0 👇👇👇
            // Không quan tâm StartDate nhập tay nữa.
            // Nếu không có ai nối đuôi, nó sẽ đứng yên ở 0.
            es: 0,
            ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false,
            predecessors: taskData.Predecessors ? taskData.Predecessors.map(p => p.id) : [],
            successors: []
        };

        // EF tạm tính theo ES=0
        taskMap[taskData.id].ef = taskMap[taskData.id].es + duration;
    });

    const ids = Object.keys(taskMap);

    // 3. XÂY DỰNG MỐI QUAN HỆ
    ids.forEach(id => {
        const task = taskMap[id];
        task.predecessors.forEach(pId => {
            if (taskMap[pId]) taskMap[pId].successors.push(Number(id));
        });
    });

    // 4. FORWARD PASS (CHỈ ĐẨY ES LÊN KHI CÓ PHỤ THUỘC)
    let changed = true;
    let loopCount = 0;
    while(changed) {
        changed = false;
        if (loopCount++ > 100) break;

        ids.forEach(id => {
            const task = taskMap[id];
            let maxPrevEF = 0; // Mặc định là 0 nếu không có cha

            // Chỉ quan tâm Task Cha kết thúc khi nào
            task.predecessors.forEach(pId => {
                if (taskMap[pId] && taskMap[pId].ef > maxPrevEF) {
                    maxPrevEF = taskMap[pId].ef;
                }
            });

            // Cập nhật ES
            if (task.es < maxPrevEF) {
                task.es = maxPrevEF;
                task.ef = task.es + task.duration;
                changed = true;
            }
        });
    }

    // 5. BACKWARD PASS (TÍNH DEADLINE)
    const projectDuration = Math.max(...ids.map(id => taskMap[id].ef), 0);

    ids.forEach(id => {
        const task = taskMap[id];
        let deadlineIndex = projectDuration;

        task.lf = deadlineIndex;
        // Khởi tạo LS ngay để tránh lỗi LF=0
        task.ls = task.lf - task.duration;
    });

    changed = true;
    loopCount = 0;
    while(changed) {
        changed = false;
        if (loopCount++ > 100) break;

        ids.forEach(id => {
            const task = taskMap[id];
            let minNextLS = Number.MAX_SAFE_INTEGER;

            if (task.successors.length > 0) {
                const nextLSValues = task.successors.map(sId => taskMap[sId] ? taskMap[sId].ls : projectDuration);
                minNextLS = Math.min(...nextLSValues);

                if (minNextLS < task.lf) {
                    task.lf = minNextLS;
                    const newLS = task.lf - task.duration;
                    if(task.ls !== newLS){
                        task.ls = newLS;
                        changed = true;
                    }
                }
            }

            const currentLS = task.lf - task.duration;
            if (task.ls !== currentLS) {
                task.ls = currentLS;
            }
        });
    }

    // 6. TÍNH SLACK
    ids.forEach(id => {
        const task = taskMap[id];
        task.ls = task.lf - task.duration;
        task.slack = task.lf - task.ef;

        if (task.slack <= 0) {
            task.isCritical = true;
        } else {
            task.isCritical = false;
        }
    });

    return {
        tasks: Object.values(taskMap),
        duration: projectDuration
    };
};

// --- API LẤY CHI TIẾT DỰ ÁN (ĐÃ UPDATE) ---
exports.getProjectDetails = async (req, res) => {
    try {
        const projectId = req.params.id;

        // Cập nhật progress (giữ nguyên logic cũ của ông)
        await updateProjectProgress(projectId);

        const project = await Project.findByPk(projectId, {
            include: [
                { model: User, as: 'leader', attributes: ['id', 'name', 'email'] },
                { model: Status, required: false, where: { [Op.or]: [{ projectId }, { projectId: null }] } },
                {
                    model: Task,
                    required: false,
                    include: [
                        { model: User, as: 'assignee', attributes: ['id', 'name'] },
                        {
                            model: Task,
                            as: 'Predecessors',
                            attributes: ['id', 'title', 'dueDate'],
                            through: { attributes: [] } // Bỏ qua bảng trung gian
                        }
                    ]
                }
            ]
        });

        if (!project) return res.status(404).send({ message: 'Not found' });

        // Xử lý team members (giữ nguyên logic cũ)
        const teams = await Team.findAll({ where: { projectId }, include: [{ model: User, as: 'members' }] });
        const membersMap = new Map();
        teams.forEach(t => t.members.forEach(m => membersMap.set(m.id, m)));

        // --- TÍNH TOÁN CPM ---
        // Biến project thành JSON thuần
        const projectData = project.toJSON();

        // Gọi hàm tính toán
        let tasksToCalculate = projectData.tasks || projectData.Tasks || [];

        if (tasksToCalculate.length > 0) {
            console.log(`✅ [DEBUG] Found ${tasksToCalculate.length} tasks. Running CPM...`);

            const cpmResult = calculateCPM(tasksToCalculate);

            projectData.tasks = cpmResult.tasks;
            projectData.estimatedDuration = cpmResult.duration;

            console.log(`🔥 [CPM DONE] Project Duration: ${cpmResult.duration} days`);
        } else {
            console.log("⚠️ [DEBUG] No tasks found to calculate.");
            projectData.tasks = [];
        }

        projectData.tasks = projectData.tasks.map(t => ({
            ...t,
            es: t.es ?? 0,
            ef: t.ef ?? 0,
            ls: t.ls ?? 0,
            lf: t.lf ?? 0,
            slack: t.slack ?? 0,
            isCritical: t.isCritical ?? false
        }));

        delete projectData.Tasks;

        projectData.members = Array.from(membersMap.values());

        res.status(200).send(projectData);

    } catch (error) {
        console.error(error);
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

// 4. ADD MEMBER
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
			return res.status(200).send({ message: "No changes applied." });
		}
	} catch (error) {
		console.error("Error updating project:", error);
		res.status(500).send({ message: "Server error while updating project." });
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
						{ model: User, as: 'assignee', attributes: ['id', 'name', 'email'] }
					]
				}
			]
		});

		if (!project) {
			return res.status(404).send({ message: 'Project not found.' });
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
		res.status(500).send({ message: error.message || 'Error exporting report.' });
	}
};

// =========================================================
// NEW FEATURE 1: CALCULATE & UPDATE END DATE
// =========================================================

exports.updateProjectEndDate = async (req, res) => {
	const { projectId } = req.params;

	if (!projectId || isNaN(projectId)) {
		return res.status(400).send({ message: "Invalid Project ID." });
	}

	try {
		const maxDueDateResult = await Task.findOne({
			where: { projectId, dueDate: { [Op.not]: null } },
			attributes: [[db.sequelize.fn('MAX', db.sequelize.col('dueDate')), 'maxDueDate']],
			raw: true
		});

		const newEndDate = maxDueDateResult?.maxDueDate;

		if (!newEndDate) {
			return res.status(200).send({
				message: "No tasks with due date were found. Unable to calculate End Date."
			});
		}

		const [updatedRows] = await Project.update({ endDate: newEndDate }, { where: { id: projectId } });

		if (updatedRows === 0) {
			return res.status(404).send({ message: "Project not found." });
		}

		res.status(200).send({
			message: `Project End Date updated successfully. New End Date (based on the latest task due date): ${newEndDate}`,
			newEndDate
		});

	} catch (error) {
		console.error("Error updating project end date:", error);
		res.status(500).send({ message: "Server error while calculating and updating End Date." });
	}
};

// =========================================================
// NEW FEATURE 2: IMPORT FULL PROJECT (Statuses, Tasks, Members)
// =========================================================

exports.importFullProject = async (req, res) => {
	const projectData = req.body;
	const currentUserId = req.userId;

	if (!projectData || !projectData.name || !projectData.tasks) {
		return res.status(400).send({ message: "Invalid Import Project data. Must include name and task list." });
	}

	const oldStatuses = projectData.statuses || [];
	const oldTasks = projectData.tasks || [];
	const oldMembers = projectData.members || [];

	const t = await db.sequelize.transaction();

	try {
		const newProject = await Project.create({
			name: `Imported - ${projectData.name}`,
			description: projectData.description,
			leaderId: projectData.leaderId || currentUserId,
			startDate: projectData.startDate,
			endDate: projectData.endDate,
			workloadFactor: projectData.workloadFactor || 1,
			progress: 0,
		}, { transaction: t });

		const newProjectId = newProject.id;

		const statusesToCreate = oldStatuses.map(s => ({
			name: s.name,
			color: s.color,
			position: s.position,
			projectId: newProjectId
		}));

		const newStatuses = await Status.bulkCreate(statusesToCreate, { transaction: t, returning: true });

		const statusMap = new Map();
		oldStatuses.forEach(oldS => {
			const newS = newStatuses.find(s => s.name === oldS.name);
			if (newS) statusMap.set(oldS.id, newS.id);
		});

		const memberEmails = oldMembers.map(m => m.email);
		const existingUsers = await User.findAll({
			where: { email: { [Op.in]: memberEmails } },
			attributes: ['id', 'email', 'name'],
			transaction: t
		});

		const userMap = new Map();
		oldMembers.forEach(oldM => {
			const existingUser = existingUsers.find(u => u.email === oldM.email);
			if (existingUser) userMap.set(oldM.id, existingUser.id);
		});

		const newTeam = await Team.create({
			name: `${newProject.name} Core Team`,
			projectId: newProjectId,
			leaderId: newProject.leaderId
		}, { transaction: t });

		const teamMembersToCreate = [];
		const uniqueMemberIds = new Set();

		if (!userMap.has(newProject.leaderId)) {
			userMap.set(newProject.leaderId, newProject.leaderId);
		}

		userMap.forEach((newUserId, oldUserId) => {
			if (uniqueMemberIds.has(newUserId)) return;

			const oldMember = oldMembers.find(m => m.id === oldUserId);
			const role = (newUserId === newProject.leaderId)
				? 'subleader'
				: (oldMember?.team_members?.role || 'member');

			teamMembersToCreate.push({
				teamId: newTeam.id,
				userId: newUserId,
				role: role
			});

			uniqueMemberIds.add(newUserId);
		});

		if (teamMembersToCreate.length > 0) {
			await TeamMember.bulkCreate(teamMembersToCreate, { transaction: t });
		}

		const tasksToCreate = [];

		const issueTypes = await IssueType.findAll({ attributes: ['id'], transaction: t });
		const validIssueTypeIds = new Set(issueTypes.map(it => it.id));

		oldTasks.forEach(oldT => {
			const newAssigneeId = userMap.get(oldT.assigneeId);
			const newReporterId = userMap.get(oldT.reporterId) || currentUserId;
			const newStatusId = statusMap.get(oldT.statusId);
			const newTypeId = validIssueTypeIds.has(oldT.typeId) ? oldT.typeId : 1;

			if (newStatusId) {
				tasksToCreate.push({
					title: oldT.title,
					description: oldT.description,
					priority: oldT.priority,
					workloadWeight: oldT.workloadWeight || 1,
					requiredSkills: oldT.requiredSkills,
					startDate: oldT.startDate,
					dueDate: oldT.dueDate,
					progress: 0,

					projectId: newProjectId,
					reporterId: newReporterId,
					assigneeId: newAssigneeId || null,
					statusId: newStatusId,
					typeId: newTypeId,

					dependencies: oldT.dependencies || null,
				});
			}
		});

		let createdTasksCount = 0;
		if (tasksToCreate.length > 0) {
			const createdTasks = await Task.bulkCreate(tasksToCreate, { transaction: t });
			createdTasksCount = createdTasks.length;
		}

		await t.commit();

		res.status(201).send({
			message: `Project imported successfully: Imported - ${projectData.name}. ${createdTasksCount} tasks and ${newStatuses.length} statuses created.`,
			newProjectId: newProject.id
		});

	} catch (error) {
		await t.rollback();
		console.error("Error importing full project:", error);
		res.status(500).send({ message: `Server error while importing project: ${error.message}` });
	}
};

// 👇 HÀM MỚI: Lấy thống kê chi tiết của 1 dự án để xuất báo cáo
exports.getProjectStats = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    // 1. Lấy thông tin dự án
    const project = await Project.findByPk(id);
    if (!project) return res.status(404).send({ message: "Project not found" });

    // 🛡️ SECURITY CHECK
    if (project.leaderId !== Number(userId)) {
      return res.status(403).send({ message: "Access denied. Only project leader can view stats." });
    }

    // 2. Thống kê Task & TÌM NGÀY KẾT THÚC (FIX LỖI N/A)
    const tasks = await Task.findAll({ where: { projectId: id } });

    // --- LOGIC TÍNH NGÀY KẾT THÚC DỰ KIẾN ---
    let finalEndDate = project.endDate; // Mặc định lấy từ Project

    // Nếu Project chưa set ngày kết thúc, ta tự tìm trong đám Task
    if (!finalEndDate && tasks.length > 0) {
         const allDueDates = tasks
             .filter(t => t.dueDate) // Lấy các task có set deadline
             .map(t => new Date(t.dueDate).getTime());

         if (allDueDates.length > 0) {
             // Lấy ngày xa nhất làm ngày kết thúc dự án
             finalEndDate = new Date(Math.max(...allDueDates));
         }
    }
    // ----------------------------------------

    const stats = {
        total: tasks.length,
        todo: tasks.filter(t => t.statusId && t.progress === 0).length,
        inProgress: tasks.filter(t => t.progress > 0 && t.progress < 100).length,
        done: tasks.filter(t => t.progress === 100).length,
        late: tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.progress < 100).length
    };

    // 3. Thống kê Workload (Giữ nguyên logic cũ)
    const teams = await Team.findAll({
        where: { projectId: id },
        attributes: ['id']
    });
    const teamIds = teams.map(t => t.id);

    let workload = [];
    if (teamIds.length > 0) {
        const memberStats = await TeamMember.findAll({
            where: { teamId: { [Op.in]: teamIds } },
            include: [{ model: User, attributes: ['id', 'name', 'email'] }]
        });

        const processedUserIds = new Set();
        for (const m of memberStats) {
            if (m.user && !processedUserIds.has(m.user.id)) {
                const userTaskCount = await Task.count({ where: { projectId: id, assigneeId: m.user.id } });
                const userDoneCount = await Task.count({ where: { projectId: id, assigneeId: m.user.id, progress: 100 } });

                // Tính tỉ lệ hoàn thành
                const rate = userTaskCount > 0 ? Math.round((userDoneCount / userTaskCount) * 100) : 0;

                processedUserIds.add(m.user.id);
                workload.push({
                    name: m.user.name,
                    email: m.user.email,
                    totalTasks: userTaskCount,
                    completedTasks: userDoneCount,
                    rate: `${rate}%`, // Thêm % để hiển thị đẹp
                    role: m.role
                });
            }
        }
    }

    // 4. TRẢ VỀ KẾT QUẢ (Cập nhật cấu trúc để Frontend nhận được ngày tháng)
    res.status(200).send({
        project: {
            name: project.name,
            startDate: project.startDate, // Trả về Start Date
            endDate: finalEndDate         // Trả về End Date (đã tính toán)
        },
        stats,
        workload
    });

  } catch (error) {
    console.error("STATS ERROR:", error);
    res.status(500).send({ message: error.message });
  }
};