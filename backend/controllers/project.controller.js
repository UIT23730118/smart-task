// /controllers/project.controller.js
const db = require('../models');
const { Op } = require('sequelize');
const Project = db.projects;
const User = db.users;
const Team = db.teams;
const TeamMember = db.teamMembers;
const Status = db.statuses;
const Task = db.tasks;
const IssueType = db.issueTypes;

// =========================================================
// HELPER FUNCTIONS
// =========================================================

// Calculate task duration in days
const getDurationInDays = (startDate, dueDate) => {
	if (!startDate || !dueDate) return 1;
	const start = new Date(startDate);
	const end = new Date(dueDate);
	const diffTime = end - start;
	const diffDays = diffTime / (1000 * 60 * 60 * 24);

	return diffDays > 0 ? Math.ceil(diffDays) : 1;
};

// Calculate and update project progress
const updateProjectProgress = async (projectId) => {
	console.log(`\n========== CALCULATING FINAL PROGRESS (WEIGHT x DURATION) (Project ID: ${projectId}) ==========`);

	if (!projectId) return 0;

	try {
		const tasks = await Task.findAll({
			where: { projectId: projectId },
			attributes: ['id', 'progress', 'workloadWeight', 'startDate', 'dueDate', 'title'],
			raw: true
		});

		if (tasks.length === 0) {
			await Project.update({ progress: 0 }, { where: { id: projectId } });
			return 0;
		}

		let totalWeightedProgress = 0;
		let totalRealWeight = 0;

		tasks.forEach(task => {
			const progress = parseFloat(task.progress) || 0;
			const weight = parseFloat(task.workloadWeight) || 1;
			const duration = getDurationInDays(task.startDate, task.dueDate);
			const realWeight = weight * duration;

			totalWeightedProgress += (progress * realWeight);
			totalRealWeight += realWeight;

			console.log(`  > Task [${task.title}]: Weight(${weight}) x Duration(${duration}d) = RealWeight ${realWeight.toFixed(1)} | Done: ${progress}%`);
		});

		const finalProgress = totalRealWeight === 0 ? 0 : (totalWeightedProgress / totalRealWeight);
		const roundedProgress = Math.round(finalProgress * 100) / 100;

		console.log(`📊 Total Achieved Points: ${totalWeightedProgress.toFixed(1)} / Total Project Weight: ${totalRealWeight.toFixed(1)}`);
		console.log(`✅ Project Progress: ${roundedProgress}%`);

		await Project.update({ progress: roundedProgress }, { where: { id: projectId } });

		return roundedProgress;

	} catch (err) {
		console.error("❌ ERROR CALCULATING PROGRESS:", err);
		return 0;
	}
};

// --- HÀM TÍNH CPM (ĐỂ NGUYÊN BÊN NGOÀI hoac TRÊN CÙNG) ---
const calculateCPM = (tasks) => {
	const taskMap = {};

	// 1. Map dữ liệu
	tasks.forEach(t => {
		const start = new Date(t.startDate);
		const end = new Date(t.dueDate);
		// Tính Duration (làm tròn lên ít nhất 1 ngày)
		let duration = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
		if (duration < 1) duration = 1;

		taskMap[t.id] = {
			...t.toJSON(), // Convert Sequelize obj sang JSON thường
			duration: duration,
			es: 0, ef: 0, ls: 0, lf: 0, slack: 0, isCritical: false,
			// Lấy list ID của task cha từ dữ liệu DB
			predecessors: t.Predecessors ? t.Predecessors.map(p => p.id) : [],
			successors: []
		};
	});

	const ids = Object.keys(taskMap);

	// 2. Xây dựng list Successors (Con) từ Predecessors (Cha)
	ids.forEach(id => {
		const task = taskMap[id];
		task.predecessors.forEach(pId => {
			if (taskMap[pId]) taskMap[pId].successors.push(Number(id));
		});
	});

	// 3. FORWARD PASS (Tính ES, EF)
	let changed = true;
	while (changed) {
		changed = false;
		ids.forEach(id => {
			const task = taskMap[id];
			let maxPrevEF = 0;
			task.predecessors.forEach(pId => {
				if (taskMap[pId] && taskMap[pId].ef > maxPrevEF) maxPrevEF = taskMap[pId].ef;
			});

			// Nếu ngày bắt đầu dự kiến ES thay đổi -> Cập nhật lại
			if (task.es < maxPrevEF) {
				task.es = maxPrevEF;
				task.ef = task.es + task.duration;
				changed = true;
			} else if (task.ef === 0) { // Trường hợp khởi tạo
				task.ef = task.es + task.duration;
			}
		});
	}

	// 4. BACKWARD PASS (Tính LS, LF)
	const projectDuration = Math.max(...ids.map(id => taskMap[id].ef));

	// Khởi tạo LF = Project End
	ids.forEach(id => taskMap[id].lf = projectDuration);

	changed = true;
	while (changed) {
		changed = false;
		ids.forEach(id => {
			const task = taskMap[id];
			let minNextLS = projectDuration;

			if (task.successors.length > 0) {
				const nextLSValues = task.successors.map(sId => taskMap[sId] ? taskMap[sId].ls : projectDuration);
				minNextLS = Math.min(...nextLSValues);
			}

			if (task.lf > minNextLS) {
				task.lf = minNextLS;
				const newLS = task.lf - task.duration;
				if (task.ls !== newLS) {
					task.ls = newLS;
					changed = true;
				}
			} else if (task.ls === 0 && task.lf === projectDuration) { // Init logic
				task.ls = task.lf - task.duration;
			}
		});
	}

	// 5. TÍNH SLACK & CRITICAL PATH
	ids.forEach(id => {
		const task = taskMap[id];
		task.ls = task.lf - task.duration;
		task.slack = task.ls - task.es;
		if (task.slack <= 0) { // Cho phép sai số nhỏ = 0
			task.slack = 0;
			task.isCritical = true;
		}
	});

	return {
		tasks: Object.values(taskMap),
		duration: projectDuration
	};
};

// =========================================================
// ORIGINAL FUNCTIONS
// =========================================================

// 1. CREATE PROJECT (Automatically creating "Core Team" for Leader)
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

		const team = await Team.create({
			name: `${project.name} Core Team`,
			projectId: project.id,
			leaderId: leaderId,
		});

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

// 2. GET MY PROJECTS (By Leader or Team Member)
exports.getMyProjects = async (req, res) => {
	try {
		const userId = req.userId;

		const user = await User.findByPk(userId, {
			include: [
				{
					model: Project,
					as: 'ledProjects',
					attributes: ['id', 'name', 'description', 'startDate', 'endDate', 'progress', 'workloadFactor', 'createdAt', 'updatedAt']
				},
				{
					model: Team,
					as: 'teams',
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

		const projectMap = new Map();
		[...directProjects, ...teamProjects].forEach((p) => projectMap.set(p.id, p));

		res.status(200).send(Array.from(projectMap.values()));
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

// 3. GET PROJECT DETAILS (Including Members from all Teams)
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

		const teams = await Team.findAll({
			where: { projectId },
			include: [{
				model: User,
				as: 'members',
				attributes: ['id', 'name', 'email', 'skills'],
				through: { attributes: ['role'] },
			}],
		});

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

// 4. ADD MEMBER
exports.addMember = async (req, res) => {
	try {
		const projectId = req.params.id;
		const userEmail = req.body.email;

		const user = await User.findOne({ where: { email: userEmail } });
		if (!user) return res.status(404).send({ message: 'User not found' });

		let team = await Team.findOne({ where: { projectId } });
		if (!team) {
			const proj = await Project.findByPk(projectId);
			team = await Team.create({ name: `${proj.name} Team`, projectId, leaderId: req.userId });
		}

		const exists = await TeamMember.findOne({ where: { teamId: team.id, userId: user.id } });
		if (exists) return res.status(400).send({ message: 'User already in team' });

		await TeamMember.create({ teamId: team.id, userId: user.id, role: 'member' });
		res.status(200).send({ message: 'Member added' });
	} catch (error) {
		res.status(500).send({ message: error.message });
	}
};

// 5. REMOVE MEMBER
exports.removeMember = async (req, res) => {
	try {
		const projectId = req.params.id;
		const userIdToRemove = req.params.userId;

		const teams = await Team.findAll({ where: { projectId: projectId } });
		const teamIds = teams.map((t) => t.id);

		if (teamIds.length === 0) {
			return res.status(404).send({ message: 'Project has no teams.' });
		}

		const result = await TeamMember.destroy({
			where: {
				userId: userIdToRemove,
				teamId: { [Op.in]: teamIds },
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

// 6. UPDATE PROJECT
exports.updateProject = async (req, res) => {
	const projectId = req.params.id;
	const { name, description, endDate, workloadFactor } = req.body;

	try {
		const project = await Project.findByPk(projectId);
		if (!project) {
			return res.status(404).send({ message: "Project not found." });
		}

		if (project.leaderId !== req.userId) {
			return res.status(403).send({ message: "Access denied. Only the project leader can update this." });
		}

		const updateData = {
			name,
			description,
			endDate: endDate || null,
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

// 7. EXPORT WORKLOAD REPORT (CSV)
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

		let csvData = 'Task ID,Task Title,Assignee,Progress,Workload Weight,Status\n';

		project.Tasks.forEach(task => {
			const assignee = task.assignee ? task.assignee.name : 'Unassigned';
			csvData += `${task.id},"${task.title}","${assignee}",${task.progress},${task.workloadWeight},${task.statusId}\n`;
		});

		csvData += `\n\nProject Progress,${project.progress}%\n`;
		csvData += `Workload Factor,${project.workloadFactor}x\n`;

		res.setHeader('Content-Type', 'text/csv');
		res.setHeader('Content-Disposition', `attachment; filename="workload_report_${projectId}.csv"`);
		res.status(200).send(csvData);

	} catch (error) {
		console.error('Error exporting report:', error);
		res.status(500).send({ message: 'Error exporting report.' });
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