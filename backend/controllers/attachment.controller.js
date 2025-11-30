// /controllers/attachment.controller.js (ĐÃ SỬA LỖI VÀ BỔ SUNG DELETE)

const db = require('../models');
const fs = require('fs');
const path = require('path'); // Import path
const Attachment = db.attachments;
const Task = db.tasks;
const Project = db.projects;

// --- HÀM UPLOAD CHUNG CHO CẢ PROJECT VÀ TASK ---
exports.uploadAttachment = async (req, res) => {
    try {
        const { taskId, projectId } = req.params;
        const userId = req.userId;
        const file = req.file;

        if (!file) return res.status(400).send({ message: "Không có tệp nào được tải lên." });

        if (!taskId && !projectId) {
            return res.status(400).send({ message: "Phải cung cấp Task ID hoặc Project ID." });
        }

        // KIỂM TRA PROJECT TỒN TẠI
        if (projectId) {
            const project = await Project.findByPk(projectId);
            if (!project) return res.status(404).send({ message: `Project ID ${projectId} không tồn tại.` });
        }

        // KIỂM TRA TASK TỒN TẠI
        if (taskId) {
            const task = await Task.findByPk(taskId); // ĐÃ SỬA: Dùng Model Task
            if (!task) return res.status(404).send({ message: `Task ID ${taskId} không tồn tại.` });
        }

        const attachment = await Attachment.create({
            taskId: taskId || null,
            projectId: projectId || null,
            userId: userId,
            fileName: file.originalname,
            filePath: file.filename, // ĐÃ SỬA: Lưu tên file đã được Multer đổi tên
            fileType: file.mimetype,
            fileSize: file.size,
        });

        res.status(201).send({ message: "Tệp đã được tải lên thành công.", attachment });

    } catch (error) {
        console.error("Lỗi khi upload tệp đính kèm:", error);
        res.status(500).send({ message: error.message || "Lỗi Server." });
    }
};

// --- HÀM LẤY TỆP ĐÍNH KÈM PROJECT ---
exports.getProjectAttachments = async (req, res) => {
    try {
        const { projectId } = req.params;

        const attachments = await Attachment.findAll({
            where: { projectId: projectId },
            order: [['uploadedAt', 'DESC']],
        });

        res.status(200).send(attachments);
    } catch (error) {
        console.error("Lỗi khi lấy tệp đính kèm theo Project:", error);
        res.status(500).send({ message: error.message || "Lỗi Server." });
    }
};

// --- HÀM LẤY TỆP ĐÍNH KÈM TASK ---
exports.getTaskAttachments = async (req, res) => {
    try {
        const { taskId } = req.params;

        const attachments = await Attachment.findAll({
            where: { taskId: taskId },
            order: [['uploadedAt', 'DESC']],
        });

        res.status(200).send(attachments);
    } catch (error) {
        console.error("Lỗi khi lấy tệp đính kèm:", error);
        res.status(500).send({ message: error.message || "Lỗi Server." });
    }
};

// --- HÀM XÓA TỆP ĐÍNH KÈM (MỚI) ---
exports.deleteAttachment = async (req, res) => {
    const attachmentId = req.params.id;
    const userId = req.userId;

    try {
        const attachment = await Attachment.findByPk(attachmentId);
        if (!attachment) {
            return res.status(404).send({ message: "Tệp đính kèm không tồn tại." });
        }

        const UPLOAD_DIR = path.join(__dirname, '../public/uploads/attachments/');
        const filePathOnServer = path.join(UPLOAD_DIR, attachment.filePath);

        if (fs.existsSync(filePathOnServer)) {
            fs.unlinkSync(filePathOnServer);
        }

        await attachment.destroy();

        return res.status(200).send({ message: "Tệp đính kèm đã được xóa thành công." });
    } catch (error) {
        console.error("Lỗi khi xóa tệp đính kèm:", error);
        return res.status(500).send({ message: "Lỗi Server khi xóa tệp: " + error.message });
    }
};