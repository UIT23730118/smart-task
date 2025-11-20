// /src/components/Task/TaskCard.jsx
import React from "react";
import { FaClock, FaExclamationTriangle } from "react-icons/fa";

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

  return (
    <div
      className="task-card"
      onClick={() => onCardClick(task.id)}
      style={{ borderLeftColor: isOverdue ? "#dc3545" : "transparent" }}
    >
      {/* Priority Tag */}
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
