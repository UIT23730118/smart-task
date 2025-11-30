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
const emailService = require('../services/email.service');

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

    if (task.assigneeId) {
      const assignee = await User.findByPk(task.assigneeId, { attributes: ['name', 'email'] });
      if (assignee && assignee.email) {
        emailService.sendAssignmentEmail(
          assignee.email,
          assignee.name,
          task.title,
          task.id
        );
      }
    }

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
          as: "comments",                     // DÙNG ALIAS
          include: [
            { model: User, as: "author", attributes: ["id", "name"] }
          ],
          separate: true,                     // Giúp order hoạt động
          order: [["createdAt", "ASC"]],
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
    const oldAssigneeId = task.assigneeId;

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
    const newAssigneeId = updatedData.assigneeId;

    // 3. GỬI EMAIL: Chỉ gửi khi ID thay đổi và không phải là null
    if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
      // Fetch thông tin người dùng mới được phân công
      const assignee = await User.findByPk(newAssigneeId, { attributes: ['name', 'email'] });

      if (assignee && assignee.email) {
        // Gửi email thông báo
        emailService.sendAssignmentEmail(
          assignee.email,
          assignee.name,
          task.title, // Sử dụng task.title vì đã được cập nhật
          taskId
        );
      }
    }
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

exports.deleteTask = async (req, res) => {
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).send({ message: "Task not found." });
    }

    await task.destroy();
    return res.status(200).send({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Error delete task:", error);
    res.status(500).send({ message: `Error deleting task: ${error.message}` });
  }
};

exports.suggestTaskAssignment = async (req, res) => {
  const { taskId } = req.params;

  try {
    // SỬA: SỬA LỖI CÚ PHÁP 'iinclude' thành 'include'
    const task = await Task.findByPk(taskId, {
      include: [
        {
          model: Project,
          include: [
            {
              model: Team,
              include: [{
                model: User,
                as: 'members',
                attributes: ['id', 'name', 'skills', 'availability', 'assignmentRules', 'currentTasks'],
              }]
            }
          ]
        }
      ]
    });

    if (!task) return res.status(404).send({ message: "Task không tồn tại." });

    // 1. Lấy tất cả thành viên của Project (Tối ưu truy vấn)
    // Lấy membersInProject từ kết quả task.Project (nếu Task có association)
    // Nếu bạn muốn lấy trực tiếp qua Task.projectId, thì cách dùng User.findAll... cũng OK,
    // Nhưng cần đảm bảo `task.projectId` không null.
    // LƯU Ý: Cách truy vấn qua Task.findByPk ở trên không phải là cách lấy member hiệu quả.

    // Tối ưu hóa truy vấn thành viên:
    const membersInProject = await User.findAll({
      attributes: ['id', 'name', 'assignmentRules', 'availability', 'currentTasks'],
      include: [{
        model: db.teams,
        as: 'teams',
        attributes: [],
        through: { attributes: [] },
        where: { projectId: task.projectId } // SỬ DỤNG task.projectId
      }],
    });

    if (membersInProject.length === 0) {
      return res.status(200).send({ message: "Dự án không có thành viên để phân công." });
    }

    let bestMatch = null;
    let maxScore = -999;

    // Chuẩn bị thuộc tính Task cần so sánh
    // Tối ưu hóa việc xử lý requiredSkills để không bị lỗi nếu nó null/undefined
    const taskSkills = (task.requiredSkills || '')
      .toLowerCase()
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);
    const taskTypeId = task.typeId;

    // 2. CHẠY THUẬT TOÁN ĐÁNH GIÁ ĐIỂM
    for (const member of membersInProject) {
      const rules = member.assignmentRules;
      let currentScore = 0;

      // Xử lý JSON string nếu cần thiết (An toàn hơn)
      const memberRules = Array.isArray(rules)
        ? rules
        : (typeof rules === 'string' && rules ? JSON.parse(rules) : []); // Đảm bảo luôn là mảng []

      for (const rule of memberRules) {
        // A. So sánh theo Skill 
        if (rule.skill) { // Kiểm tra rule.skill có tồn tại không
          const ruleSkillLower = rule.skill.toLowerCase();
          if (taskSkills.some(ts => ts.includes(ruleSkillLower))) {
            currentScore += 10;
          }
        }

        // B. So sánh theo Loại Task
        if (rule.typeId && Number(rule.typeId) === taskTypeId) { // Ép kiểu an toàn
          currentScore += 15;
        }

        // C. CỘNG ĐIỂM ƯU TIÊN
        currentScore += (Number(rule.priority) || 0); // Ép kiểu an toàn
      }

      // D. ĐIỀU CHỈNH ĐIỂM THEO TÌNH TRẠNG HIỆN TẠI 
      const memberAvailability = Number(member.availability) || 0.1; // Tránh nhân với 0
      const memberCurrentTasks = Number(member.currentTasks) || 0;

      currentScore *= memberAvailability;
      currentScore -= memberCurrentTasks * 0.5;

      // 3. TÌM NGƯỜỜI PHÙ HỢP NHẤT
      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestMatch = member;
      }
    }

    if (bestMatch && maxScore > -999) {
      // 4. Cập nhật suggestedAssigneeId vào Task
      await Task.update(
        { suggestedAssigneeId: bestMatch.id },
        { where: { id: taskId } }
      );

      res.status(200).send({
        suggestedAssignee: { id: bestMatch.id, name: bestMatch.name, score: maxScore.toFixed(2) },
        message: `Hệ thống gợi ý: ${bestMatch.name} (${maxScore.toFixed(2)} điểm).`
      });
    } else {
      res.status(200).send({ message: "Không tìm thấy thành viên nào phù hợp với quy tắc đã thiết lập." });
    }

  } catch (error) {
    console.error("Error suggesting assignment:", error);
    res.status(500).send({ message: "Lỗi Server khi gợi ý phân công: " + error.message });
  }
};
