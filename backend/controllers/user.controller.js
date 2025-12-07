// /controllers/user.controller.js

const db = require('../models');
const User = db.users;
const Task = db.tasks;
const Status = db.statuses;
const Project = db.projects;

// --- HÀM QUẢN LÝ ASSIGNMENT RULES ---

exports.getAssignmentRules = async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'assignmentRules']
        });
        if (!user) return res.status(404).send({ message: "Không tìm thấy User." });
        res.status(200).send(user);
    } catch (error) {
        console.error("Error getting rules:", error);
        res.status(500).send({ message: "Lỗi Server khi lấy Rules." });
    }
};

exports.updateAssignmentRules = async (req, res) => {
    const { userId } = req.params;
    // Đảm bảo rules được gửi là một JSON array (hoặc null nếu xóa)
    const { rules } = req.body;

    if (typeof rules === 'undefined') {
        return res.status(400).send({ message: "Body thiếu trường 'rules'." });
    }

    try {
        const [updated] = await User.update(
            { assignmentRules: rules },
            { where: { id: userId } }
        );

        if (updated) {
            const updatedUser = await User.findByPk(userId, {
                attributes: ['id', 'name', 'assignmentRules']
            });
            return res.status(200).send({
                message: "Cập nhật Assignment Rules thành công.",
                user: updatedUser
            });
        } else {
            return res.status(404).send({ message: "Không tìm thấy User để cập nhật hoặc không có thay đổi." });
        }
    } catch (error) {
        console.error("Error updating rules:", error);
        res.status(500).send({ message: "Lỗi Server khi cập nhật Rules. Đảm bảo dữ liệu Rules là JSON hợp lệ." });
    }
};

exports.getUserExpertise = async (req, res) => {
    const userId = req.params.id;
    try {
        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'expertise']
        });
        if (!user) return res.status(404).send({ message: "User not found." });

        // Đảm bảo expertise trả về là mảng rỗng nếu là null
        const expertiseData = user.expertise || [];

        res.status(200).send({
            id: user.id,
            name: user.name,
            expertise: expertiseData
        });
    } catch (error) {
        console.error("Error getting user expertise:", error);
        res.status(500).send({ message: "Server error fetching expertise." });
    }
};

// Cập nhật chuyên môn (expertise) cho một người dùng
exports.updateUserExpertise = async (req, res) => {
    try {
        const userId = req.params.id; // ID của người dùng cần cập nhật
        const { expertise } = req.body; // Dữ liệu expertise gửi lên (dạng mảng JSON)

        // Kiểm tra quyền (Chỉ Leader hoặc người dùng tự cập nhật)
        // Giả sử chỉ Leader mới có quyền set Expertise cho người khác.
        // Nếu bạn muốn check quyền, cần middleware kiểm tra vai trò Leader.

        const user = await User.findByPk(userId);

        if (!user) {
            return res.status(404).send({ message: "User not found." });
        }

        // Expertise phải là một mảng các đối tượng { name: string, score: number (1-10) }
        if (!Array.isArray(expertise)) {
            return res.status(400).send({ message: "Invalid expertise format. Must be an array." });
        }

        // Tùy chọn: Thêm validation để kiểm tra score nằm trong khoảng 1-10
        const validatedExpertise = expertise.map(exp => ({
            name: String(exp.name).trim(),
            score: Math.min(10, Math.max(1, Number(exp.score) || 1)) // Giới hạn score từ 1 đến 10
        }));

        await user.update({ expertise: validatedExpertise });

        res.status(200).send({ message: "User expertise updated successfully.", expertise: validatedExpertise });
    } catch (error) {
        console.error("Error updating user expertise:", error);
        res.status(500).send({ message: `Error updating user expertise: ${error.message}` });
    }
};

exports.getMemberWorkload = async (userId) => {
    try {
        // 1. Tìm Status hoàn thành
        const finalStatuses = await Status.findAll({
            where: { isFinal: true },
            attributes: ['id']
        });
        const finalStatusIds = finalStatuses.map(s => s.id);

        // 2. Tính tổng Workload hiệu dụng (WorkloadWeight * WorkloadFactor)
        const result = await Task.findAll({
            attributes: [
                // 💡 Sử dụng Sequelize.fn('SUM') và Sequelize.literal cho phép tính toán
                [db.sequelize.fn(
                    'SUM',
                    // Công thức: workloadWeight * workloadFactor
                    db.sequelize.literal('Task.workloadWeight * project.workloadFactor')
                ), 'totalEffectiveWorkload']
            ],
            where: {
                assigneeId: userId,
                statusId: { [db.Sequelize.Op.notIn]: finalStatusIds }
            },
            // 💡 PHẢI THỰC HIỆN JOIN VỚI BẢNG PROJECTS
            include: [{
                model: Project, // Tên model Project đã import
                as: 'project',
                attributes: []
            }],
            raw: true
        });

        return Number(result[0].totalEffectiveWorkload) || 0;

    } catch (error) {
        console.error(`Error calculating workload for User ${userId}:`, error);
        return 0;
    }
};

// --- Bạn có thể thêm các hàm khác như getProfile, updateProfile ở đây ---
// exports.getUserProfile = ...
// exports.updateUserProfile = ...