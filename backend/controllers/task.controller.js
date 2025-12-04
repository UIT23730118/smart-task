const db = require("../models");
const { Op } = require("sequelize");
const Task = db.tasks;
const User = db.users;
const Status = db.statuses;
const Comment = db.comments;
const Attachment = db.attachments;
const IssueType = db.issueTypes;
const Project = db.projects;
const Team = db.teams;
const Resolution = db.resolutions;
const Notification = db.notifications;
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

    // 1. Kiểm tra quyền (User là Member trong Team hoặc là Leader của Project)
    let isAuthorized = false;

    // A. Check nếu user là thành viên trong Team của Project
    const team = await Team.findOne({
      where: { projectId: projectId },
      include: [
        {
          model: User,
          as: "members",
          where: { id: reporterId },
          required: true,
        },
      ],
    });
    if (team) {
      isAuthorized = true;
    }

    // B. Check nếu user là Leader của Project
    if (!isAuthorized) {
      const project = await Project.findByPk(projectId);
      if (project && project.leaderId === reporterId) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res
        .status(403)
        .send({ message: "Error: You are not a member or leader of this project." });
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
      typeId: typeId || 1, // Default Task Type (Giả sử 1 là ID của default type)
      priority: priority || "Minor",
      startDate: startDate || new Date(),
      dueDate: dueDate || null,
      progress: progress || 0,
      requiredSkills: requiredSkills || null,
    });

    // 4. Gửi Email thông báo phân công
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

    // 5. Tạo Thông báo (Notifications)
    const project = await Project.findByPk(projectId);
    const leaderId = project ? project.leaderId : null;

    // A. Báo cho Leader (Nếu người tạo không phải là Leader)
    if (leaderId && reporterId !== leaderId) {
      await Notification.create({
        userId: leaderId,
        taskId: task.id,
        message: `Member just created new task: ${title}`,
        type: 'CREATE_TASK',
        isRead: false
      });
    }

    // B. Báo cho người được phân công (Nếu có và không phải là người tạo)
    if (assigneeId && assigneeId !== reporterId) {
      await Notification.create({
        userId: assigneeId,
        taskId: task.id,
        message: `You have been assigned a new task: ${title}`,
        type: 'ASSIGNMENT',
        isRead: false
      });
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
          as: "comments",
          include: [
            { model: User, as: "author", attributes: ["id", "name"] }
          ],
          separate: true,
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
    console.error("Error getTaskDetails:", error);
    res.status(500).send({ message: `Error fetching task: ${error.message}` });
  }
};

// Cập nhật Task
exports.updateTask = async (req, res) => {
  const updaterId = req.userId;
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId);

    if (!task) return res.status(404).send({ message: "Task not found." });
    const oldAssigneeId = task.assigneeId;

    let skillsToSave = req.body.requiredSkills;

    if (typeof skillsToSave === 'string') {
        // 💡 FIX CỐT LÕI: Kiểm tra và loại bỏ dấu nháy kép ở hai đầu (Lỗi stringify kép)
        if (skillsToSave.startsWith('"') && skillsToSave.endsWith('"')) {
            skillsToSave = skillsToSave.substring(1, skillsToSave.length - 1);
        }
    } else {
        // Nếu không phải chuỗi (null/undefined), giữ nguyên
        skillsToSave = skillsToSave || null;
    }

    const updatedData = {
      title: req.body.title,
      description: req.body.description,
      assigneeId: req.body.assigneeId,
      statusId: req.body.statusId,
      priority: req.body.priority,
      startDate: req.body.startDate,
      dueDate: req.body.dueDate,
      progress: req.body.progress,
      requiredSkills: skillsToSave
    };

    // Xóa các field undefined/null (Không gửi lên body)
    Object.keys(updatedData).forEach((key) => {
      // Chỉ xóa nếu giá trị là UNDEFINED. Giữ lại NULL hoặc chuỗi rỗng ("") nếu Frontend gửi.
      if (updatedData[key] === undefined) { 
          delete updatedData[key];
      }
    });

    await task.update(updatedData);
    const newAssigneeId = task.assigneeId;

    // 1. GỬI EMAIL: Chỉ gửi khi ID thay đổi và người mới được gán không phải là null
    if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
      const assignee = await User.findByPk(newAssigneeId, { attributes: ['name', 'email'] });

      if (assignee && assignee.email) {
        emailService.sendAssignmentEmail(
          assignee.email,
          assignee.name,
          task.title,
          taskId
        );
      }
    }

    // 2. LOGIC THÔNG BÁO UPDATE
    const project = await Project.findByPk(task.projectId);
    const leaderId = project ? project.leaderId : null;
    const taskTitle = task.title;

    // A. Báo cho Leader (Nếu người sửa không phải là Leader)
    if (leaderId && updaterId !== leaderId) {
      await Notification.create({
        userId: leaderId,
        taskId: taskId,
        message: `Task "${taskTitle}" is just updated by member.`,
        type: 'UPDATE_TASK',
        isRead: false
      });
    }

    // B. Báo cho Assignee CŨ (nếu bị đổi người khác và họ không phải là người sửa)
    if (oldAssigneeId && newAssigneeId !== oldAssigneeId && oldAssigneeId !== updaterId) {
      await Notification.create({
        userId: oldAssigneeId,
        taskId: taskId,
        message: `You have been deassigned from the task: ${taskTitle}`,
        type: 'UNASSIGN',
        isRead: false
      });
    }

    // C. Báo cho Assignee MỚI/HIỆN TẠI (nếu họ không phải người sửa)
    if (newAssigneeId && newAssigneeId !== updaterId) {
      if (newAssigneeId !== oldAssigneeId) {
        // Trường hợp vừa được gán mới
        await Notification.create({
          userId: newAssigneeId,
          taskId: taskId,
          message: `You have just been assigned a task: ${taskTitle}`,
          type: 'ASSIGNMENT',
          isRead: false
        });
      } else {
        // Trường hợp cập nhật thông tin task mà Assignee không thay đổi
        await Notification.create({
          userId: newAssigneeId,
          taskId: taskId,
          message: `Your task "${taskTitle}" has new updates.`,
          type: 'UPDATE_TASK',
          isRead: false
        });
      }
    }

    res.status(200).send(task);
  } catch (error) {
    res.status(500).send({ message: `Error updating task: ${error.message}` });
  }
};

// Update Status (Kanban Drag & Drop)
exports.updateTaskStatus = async (req, res) => {
  const updaterId = req.userId;
  try {
    const taskId = req.params.id;
    const newStatusId = req.body.statusId;
    const task = await Task.findByPk(taskId);

    if (!task) return res.status(404).send({ message: "Task not found." });

    // Ghi lại Status cũ
    const oldStatusId = task.statusId;

    task.statusId = newStatusId;
    await task.save();

    // 1. Logic Notification khi status thay đổi
    if (newStatusId !== oldStatusId && task.assigneeId && task.assigneeId !== updaterId) {
      await Notification.create({
        userId: task.assigneeId,
        taskId: taskId,
        message: `The status of your task "${task.title}" has been updated.`,
        type: 'STATUS_CHANGE',
        isRead: false
      });
    }

    res.status(200).send(task);
  } catch (error) {
    res
      .status(500)
      .send({ message: `Error updating status: ${error.message}` });
  }
};

exports.deleteTask = async (req, res) => {
  const deleterId = req.userId;
  try {
    const taskId = req.params.id;
    const task = await Task.findByPk(taskId);

    if (!task) {
      return res.status(404).send({ message: "Task not found." });
    }

    const taskTitle = task.title;
    const assigneeId = task.assigneeId;
    const project = await Project.findByPk(task.projectId);
    const leaderId = project ? project.leaderId : null;

    await task.destroy();

    // --- LOGIC THÔNG BÁO XÓA ---

    // A. Báo cho Leader (Nếu người xóa không phải Leader)
    if (leaderId && deleterId !== leaderId) {
      await Notification.create({
        userId: leaderId,
        taskId: null,
        message: `Task "${taskTitle}" has been deleted by member.`,
        type: 'DELETE_TASK',
        isRead: false
      });
    }

    // B. Báo cho Assignee (Nếu người xóa không phải là Assignee đang làm task đó)
    if (assigneeId && assigneeId !== deleterId) {
      await Notification.create({
        userId: assigneeId,
        taskId: null,
        message: `The task "${taskTitle}" you were working on has been deleted.`,
        type: 'DELETE_TASK',
        isRead: false
      });
    }
    // -----------------------------

    return res.status(200).send({ message: "Task deleted successfully." });
  } catch (error) {
    console.error("Error delete task:", error);
    res.status(500).send({ message: `Error deleting task: ${error.message}` });
  }
};

exports.suggestTaskAssignment = async (req, res) => {
  const { taskId } = req.params;

  try {
    // 1. Lấy thông tin Task (Chỉ lấy các thuộc tính cần thiết)
    const task = await Task.findByPk(taskId, {
      attributes: ['id', 'projectId', 'requiredSkills', 'typeId'],
    });

    if (!task) return res.status(404).send({ message: "Task không tồn tại." });

    // 2. Lấy tất cả thành viên của Project (Lấy trường expertise mới)
    const membersInProject = await User.findAll({
      // Lấy trường expertise, availability, và currentTasks
      attributes: ['id', 'name', 'expertise', 'availability', 'currentTasks', 'assignmentRules'],
      include: [{
        model: db.teams,
        as: 'teams',
        attributes: [],
        through: { attributes: [] },
        where: { projectId: task.projectId }
      }],
    });

    if (membersInProject.length === 0) {
      return res.status(200).send({ message: "Dự án không có thành viên để phân công." });
    }

    let bestMatch = null;
    let maxScore = -Infinity;

    // Chuẩn bị thuộc tính Task cần so sánh
    // Chuyển chuỗi requiredSkills thành mảng các từ khóa (loại bỏ khoảng trắng, dấu phẩy)
    const taskSkills = (task.requiredSkills || '')
      .toLowerCase()
      .split(/[\s,]+/) // Tách bằng dấu cách hoặc dấu phẩy
      .map(s => s.trim())
      .filter(s => s.length > 0);

    const taskTypeId = task.typeId;

    // 3. CHẠY THUẬT TOÁN ĐÁNH GIÁ ĐIỂM
    for (const member of membersInProject) {
      const expertiseData = member.expertise; // Dữ liệu JSON về chuyên môn
      let currentScore = 0;

      // Xử lý JSON string của expertise
      let memberExpertise;
      try {
        memberExpertise = Array.isArray(expertiseData)
          ? expertiseData
          : (typeof expertiseData === 'string' && expertiseData ? JSON.parse(expertiseData) : []);
      } catch (e) {
        // Nếu parsing lỗi, coi như không có expertise
        memberExpertise = [];
      }

      // A. LOGIC ĐÁNH GIÁ CHUYÊN MÔN DỰA TRÊN `requiredSkills` và `expertise`
      let skillMatchScore = 0; // Tổng điểm chuyên môn cho các skill khớp
      let totalSkillsRequired = taskSkills.length;
      let skillsMatchedCount = 0; // Đếm số lượng skill required khớp

      if (totalSkillsRequired > 0) {

        for (const requiredSkill of taskSkills) {
          let bestSkillScore = 0;
          let isMatched = false;

          // Duyệt qua từng chuyên môn (expertise) mà Leader đã gán cho member
          for (const expertise of memberExpertise) {
            const expertiseNameLower = (expertise.name || '').toLowerCase();
            const expertiseScore = Number(expertise.score) || 0;

            // So sánh linh hoạt: Nếu skill required là một phần của expertise hoặc ngược lại
            if (expertiseNameLower.includes(requiredSkill) || requiredSkill.includes(expertiseNameLower)) {
              // Lấy điểm cao nhất nếu một requiredSkill khớp với nhiều expertise
              bestSkillScore = Math.max(bestSkillScore, expertiseScore);
              isMatched = true;
            }
          }

          if (isMatched) {
            skillMatchScore += bestSkillScore; // Cộng điểm chuyên môn (thang 10)
            skillsMatchedCount++;
          }
        }

        // Tính điểm chuyên môn cuối cùng
        if (skillsMatchedCount > 0) {
          // Điểm cơ sở: Tổng điểm chuyên môn / Số skill khớp
          const baseSkillScore = skillMatchScore / skillsMatchedCount;

          // Thưởng thêm cho tỉ lệ skill khớp (ví dụ: 100% khớp = *1.2)
          const matchRatio = skillsMatchedCount / totalSkillsRequired;

          // Trọng số Skill (Ví dụ: Thang điểm tối đa cho Skill là 40)
          currentScore += baseSkillScore * 4; // Max 10 * 4 = 40 điểm
          currentScore += matchRatio * 5; // Thưởng thêm 5 điểm cho tỉ lệ khớp cao

        } else {
          // Nếu Task yêu cầu Skills (totalSkillsRequired > 0) nhưng member không khớp
          currentScore -= 20; // Trừ điểm nặng nếu không có bất kỳ skill nào
        }
      }


      // B. LOGIC ĐÁNH GIÁ LOẠI TASK (Sử dụng assignmentRules cũ nếu cần)
      const memberRules = Array.isArray(member.assignmentRules)
        ? member.assignmentRules
        : (typeof member.assignmentRules === 'string' && member.assignmentRules ? JSON.parse(member.assignmentRules) : []);

      for (const rule of memberRules) {
        if (rule.typeId && Number(rule.typeId) === taskTypeId) {
          currentScore += 15; // Cộng 15 điểm nếu khớp loại task
          break;
        }
      }


      // C. ĐIỀU CHỈNH ĐIỂM THEO TÌNH TRẠNG HIỆN TẠI (Sẵn có & Tải công việc)
      const memberAvailability = Number(member.availability) || 0.1;
      const memberCurrentTasks = Number(member.currentTasks) || 0;

      currentScore *= memberAvailability;
      currentScore -= memberCurrentTasks * 1.0; // Tăng trọng số trừ điểm bận rộn lên 1.0

      // 4. TÌM NGƯỜỜI PHÙ HỢP NHẤT
      if (currentScore > maxScore) {
        maxScore = currentScore;
        bestMatch = member;
      }
    }

    if (bestMatch && maxScore > -Infinity) {
      // 5. Cập nhật suggestedAssigneeId vào Task
      await Task.update(
        { suggestedAssigneeId: bestMatch.id },
        { where: { id: taskId } }
      );

      res.status(200).send({
        suggestedAssignee: { id: bestMatch.id, name: bestMatch.name, score: maxScore.toFixed(2) },
        message: `Hệ thống gợi ý: ${bestMatch.name} (${maxScore.toFixed(2)} điểm) dựa trên chuyên môn và tình trạng hiện tại.`
      });
    } else {
      res.status(200).send({ message: "Không tìm thấy thành viên nào phù hợp với quy tắc đã thiết lập." });
    }

  } catch (error) {
    console.error("Error suggesting assignment:", error);
    res.status(500).send({ message: "Lỗi Server khi gợi ý phân công: " + error.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { projectId, key, priority, assigneeId, dueDate } = req.query;
    let condition = {};

    // 1. Bắt buộc phải tìm trong Project cụ thể
    if (projectId) {
      condition.projectId = projectId;
    } else {
      return res.status(400).send({ message: "ProjectId is required." });
    }

    // 2. Tìm theo Từ khóa (Title hoặc Description)
    if (key) {
      condition[Op.or] = [
        { title: { [Op.like]: `%${key}%` } },
        { description: { [Op.like]: `%${key}%` } }
      ];
    }

    // 3. Tìm theo Priority
    if (priority) {
      condition.priority = priority;
    }

    // 4. Tìm theo Assignee
    if (assigneeId) {
      // Đảm bảo assigneeId là số hoặc dùng Op.eq nếu cần so sánh nghiêm ngặt
      condition.assigneeId = assigneeId;
    }

    // 5. Tìm theo Hạn chót (Đến cuối ngày đó)
    if (dueDate) {
      const startOfDay = new Date(dueDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(dueDate);
      endOfDay.setHours(23, 59, 59, 999);

      condition.dueDate = {
        [Op.between]: [startOfDay, endOfDay]
      };
    }

    const tasks = await Task.findAll({
      where: condition,
      include: [
        { model: User, as: "assignee", attributes: ["id", "name"] },
        { model: Status, attributes: ["id", "name", "color"] },
        { model: IssueType, as: "type", attributes: ["id", "name"] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.send(tasks);
  } catch (error) {
    console.error("Found error:", error);
    res.status(500).send({ message: "An server error occurred while searching: " + error.message });
  }
};