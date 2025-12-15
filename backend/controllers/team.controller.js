const db = require("../models");
const Team = db.teams;
const TeamMember = db.teamMembers;
const User = db.users;

// 1. Lấy danh sách các Tổ trong 1 Dự án (kèm thành viên)
exports.getTeamsByProject = async (req, res) => {
    try {
        const { projectId } = req.params;
        const teams = await Team.findAll({
            where: { projectId: projectId },
            include: [
                {
                    model: User,
                    as: 'leader', // Leader của tổ
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: db.teamMembers, // Lấy danh sách thành viên
                    include: [{
                        model: User,
                        attributes: ['id', 'name', 'email', 'role'] // Role ở đây là role hệ thống
                    }]
                }
            ]
        });
        res.status(200).send(teams);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// 2. Tạo Tổ mới (Ví dụ: "Đội Dev", "Đội Marketing")
exports.createTeam = async (req, res) => {
    try {
        const { name, projectId, leaderId } = req.body;

        const newTeam = await Team.create({
            name,
            projectId,
            leaderId: leaderId || req.userId // Nếu không chọn leader thì lấy người tạo
        });
        if (newTeam && leaderId) {
            await TeamMember.create({
                teamId: newTeam.id,
                userId: leaderId,
                role: 'subleader' // Gán role đặc biệt
            });
        }

        res.status(201).send({ message: "Tạo tổ thành công!", team: newTeam });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// 3. Thêm thành viên vào Tổ
exports.addMemberToTeam = async (req, res) => {
    try {
        const { teamId, userId, role } = req.body; // role: 'member' hoặc 'subleader'

        // Kiểm tra xem đã có trong tổ chưa
        const existing = await TeamMember.findOne({ where: { teamId, userId } });
        if (existing) {
            return res.status(400).send({ message: "Thành viên này đã ở trong tổ rồi!" });
        }

        await TeamMember.create({
            teamId,
            userId,
            role: role || 'member'
        });

        res.status(200).send({ message: "Đã thêm thành viên vào tổ." });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// 4. Xóa thành viên khỏi tổ
exports.removeMember = async (req, res) => {
    try {
        const { id } = req.params; // ID của dòng trong bảng team_members
        await TeamMember.destroy({ where: { id } });
        res.status(200).send({ message: "Đã xóa thành viên khỏi tổ." });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

// 5. Xóa tổ
exports.deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;
        await Team.destroy({ where: { id } });
        res.status(200).send({ message: "Đã giải tán tổ." });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};