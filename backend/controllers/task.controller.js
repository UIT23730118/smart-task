const db = require("../models");
const { Op } = require("sequelize");
const Task = db.tasks;
const User = db.users;
const Status = db.statuses;
const Comment = db.comments;
const Attachment = db.attachments; // Sửa tên biến cho đúng model
const IssueType = db.issueTypes;
const Project = db.projects;
const Team = db.teams;
const Resolution = db.resolutions;

// Tạo một Task mới
exports.createTask = async (req, res) => {
  try {
    const reporterId = req.userId;
    const {
      projectId,
      title,
      description,
      assigneeId,
      typeId,
      priority,
      dueDate,
      startDate,
      progress,
      requiredSkills,
    } = req.body;

    // 1. FIX QUAN TRỌNG: Kiểm tra quyền qua bảng Team & TeamMembers
    // Tìm xem có Team nào thuộc Project này mà User đang tham gia không
    const team = await Team.findOne({
      where: { projectId: projectId },
      include: [
        {
          model: User,
          as: "members",
          where: { id: reporterId }, // Check nếu user là member
          required: true,
        },
      ],
    });

    // Nếu không tìm thấy team nào chứa user này trong project này
    if (!team) {
      // Check thêm trường hợp User là Leader của Project (Leader luôn có quyền)
      const project = await Project.findByPk(projectId);
      if (project && project.leaderId !== reporterId) {
        return res
          .status(403)
          .send({ message: "Error: You are not a member of this project." });
      }
    }

    // 2. Tìm status "Open" (hoặc status đầu tiên)
    const defaultStatus = await Status.findOne({
      where: {
        [Op.or]: [{ projectId: projectId }, { projectId: null }],
      },
      order: [["position", "ASC"]],
    });

    if (!defaultStatus) {
      return res
        .status(400)
        .send({
          message: "Error: Cannot find default status for this project.",
        });
    }

    // 3. Tạo task
    const task = await Task.create({
      title,
      description,
      projectId,
      reporterId,
      assigneeId: assigneeId || null,
      statusId: defaultStatus.id,
      typeId: typeId || 1, // Default Task Type
      priority: priority || "Minor",
      startDate: startDate || new Date(),
      dueDate: dueDate || null,
      progress: progress || 0,
      requiredSkills: requiredSkills || null,
    });

    res.status(201).send(task);
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: `Error creating task: ${error.message}` });
  }
};

// Lấy chi tiết một Task
exports.getTaskDetails = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId, {
      include: [
        { model: Project, attributes: ["id", "name"] },
        { model: User, as: "assignee", attributes: ["id", "name", "email"] },
        { model: User, as: "reporter", attributes: ["id", "name", "email"] },
        { model: Status, attributes: ["id", "name", "color"] },
        { model: IssueType, as: "type", attributes: ["id", "name"] },
        { model: Resolution, attributes: ["id", "name"] },
        // Lấy Comments và thông tin người comment
        {
          model: Comment,
          include: [{ model: User, attributes: ["id", "name"] }], // User comment
          order: [["createdAt", "ASC"]], // Xếp theo thời gian
        },
        // Lấy Attachments và người upload
        {
          model: Attachment,
          include: [{ model: User, attributes: ["id", "name"] }],
        },
      ],
    });

    if (!task) {
      return res.status(404).send({ message: "Task not found." });
    }
    res.status(200).send(task);
  } catch (error) {
    console.error("Error getTaskDetails:", error); // Log lỗi ra terminal để debug
    res.status(500).send({ message: `Error fetching task: ${error.message}` });
  }
};

// Cập nhật Task
exports.updateTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId);

    if (!task) return res.status(404).send({ message: "Task not found." });

    const updatedData = {
      title: req.body.title,
      description: req.body.description,
      assigneeId: req.body.assigneeId,
      statusId: req.body.statusId, // Cho phép update status từ form edit
      priority: req.body.priority,
      startDate: req.body.startDate,
      dueDate: req.body.dueDate,
      progress: req.body.progress,
      requiredSkills: req.body.requiredSkills,
    };

    // Xóa các field undefined
    Object.keys(updatedData).forEach((key) => {
      if (updatedData[key] === undefined) delete updatedData[key];
    });

    await task.update(updatedData);
    res.status(200).send(task);
  } catch (error) {
    res.status(500).send({ message: `Error updating task: ${error.message}` });
  }
};

// Update Status (Kanban Drag & Drop)
exports.updateTaskStatus = async (req, res) => {
  try {
    const taskId = req.params.id;
    const newStatusId = req.body.statusId;
    const task = await Task.findByPk(taskId);

    if (!task) return res.status(404).send({ message: "Task not found." });

    task.statusId = newStatusId;
    await task.save();
    res.status(200).send(task);
  } catch (error) {
    res
      .status(500)
      .send({ message: `Error updating status: ${error.message}` });
  }
};
