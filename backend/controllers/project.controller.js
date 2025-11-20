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

// 1. TẠO PROJECT (Tự động tạo Team "General" cho Leader)
exports.createProject = async (req, res) => {
	try {
		const leaderId = req.userId;
		const project = await Project.create({
			name: req.body.name,
			description: req.body.description,
			leaderId: leaderId,
			startDate: new Date(),
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
				{ model: Project, as: 'ledProjects' }, // Project mình làm Leader
				{
					model: Team,
					as: 'teams', // Project mình tham gia qua Team
					include: [{ model: Project, required: true }],
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
		const project = await Project.findByPk(projectId, {
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
