// /controllers/user.controller.js

const db = require('../models');
const User = db.users;

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

// --- Bạn có thể thêm các hàm khác như getProfile, updateProfile ở đây ---
// exports.getUserProfile = ...
// exports.updateUserProfile = ...