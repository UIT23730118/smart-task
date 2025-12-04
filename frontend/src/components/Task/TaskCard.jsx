import React from "react";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";
import { Tag } from "antd"; // Import Tag từ Ant Design

const TaskCard = ({ task, onCardClick }) => {
  const assigneeName = task.assignee ? task.assignee.name : "Unassigned";
  const assigneeInitial = assigneeName.charAt(0).toUpperCase();
  const progress = task.progress || 0;

  // Kiểm tra ngày tháng an toàn
  const isOverdue =
    task.dueDate && new Date(task.dueDate) < new Date() && progress < 100;
  const dueDateStr = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("vi-VN")
    : "";

  // Màu priority
  const priorityColors = {
    Minor: "#e3fcef",
    Major: "#ffecb5",
    Critical: "#ffbdad",
    Blocker: "#ffebe6",
  };
  const priorityColor = priorityColors[task.priority] || "#eee";

  // ==========================================================
  // 💡 LOGIC: XỬ LÝ REQUIRED SKILLS
  // ==========================================================
  let requiredSkillsTags = [];
  if (task.requiredSkills) {
    // Tách chuỗi skills thành mảng, loại bỏ khoảng trắng và filter rỗng
    requiredSkillsTags = String(task.requiredSkills)
      .split(/[\s,]+/) 
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }
  // ==========================================================

  return (
    <div
      className="task-card"
      onClick={() => onCardClick(task.id)}
      style={{ borderLeftColor: isOverdue ? "#dc3545" : "transparent" }}
    >
      
      {/* Required Skills Tags (Sử dụng Ant Design Tag) */}
      {requiredSkillsTags.length > 0 && (
          <div style={{ marginBottom: "6px", display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {requiredSkillsTags.slice(0, 3).map((skill, index) => ( // Chỉ hiển thị tối đa 3 skills
                  <Tag 
                    key={index} 
                    color="blue" // Màu xanh dương Ant Design
                    style={{ margin: 0, fontSize: '11px' }}
                  >
                      {skill}
                  </Tag>
              ))}
              {requiredSkillsTags.length > 3 && (
                  <Tag 
                    style={{ margin: 0, fontSize: '11px' }}
                  >
                      +{requiredSkillsTags.length - 3} more
                  </Tag>
              )}
          </div>
      )}

      {/* Priority Tag (Giữ nguyên style cũ của bạn nếu bạn có CSS riêng) */}
      <div style={{ marginBottom: "6px" }}>
        <span className="task-tag" style={{ backgroundColor: priorityColor }}>
          {task.priority}
        </span>
      </div>

      <div className="task-card-title">{task.title}</div>

      {/* Progress Bar */}
      <div className="task-progress-wrapper">
        <div
          className={`task-progress-bar ${
            isOverdue ? "overdue" : progress === 100 ? "completed" : ""
          }`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="task-card-footer">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            color: isOverdue ? "#dc3545" : "inherit",
          }}
        >
          {isOverdue ? (
            <FaExclamationTriangle size={12} />
          ) : (
            <FaClock size={12} />
          )}
          <span>{dueDateStr || "No date"}</span>
        </div>

        <div className="task-assignee-avatar" title={assigneeName}>
          {assigneeInitial}
        </div>
      </div>
    </div>
  );
};

export default TaskCard;