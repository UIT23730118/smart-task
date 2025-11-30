// /src/components/Project/TaskListView.jsx
import React from "react";
// Cần cài: npm install react-icons
import { FaBug, FaCheckSquare, FaBookmark, FaBolt } from "react-icons/fa";

const TaskListView = ({ tasks, onTaskClick }) => {
  // Helper chọn icon theo Type
  const getTypeIcon = (typeId) => {
    // Giả sử: 1=Task, 2=Bug, 3=Story
    switch (typeId) {
      case 2:
        return <FaBug color="#dc3545" title="Bug" />;
      case 3:
        return <FaBookmark color="#28a745" title="Story" />;
      case 4:
        return <FaBolt color="#ffc107" title="Epic" />;
      default:
        return <FaCheckSquare color="#4bade8" title="Task" />;
    }
  };

  // Helper màu Priority
  const getPriorityColor = (p) => {
    switch (p) {
      case "Critical":
        return "#dc3545";
      case "High":
        return "#fd7e14";
      case "Medium":
        return "#ffc107";
      default:
        return "#8993a4"; // Low
    }
  };

  // Helper màu Status badge
  const getStatusBadgeColor = (statusName) => {
    const name = statusName.toLowerCase();
    if (
      name.includes("done") ||
      name.includes("closed") ||
      name.includes("resolved")
    )
      return "#e3fcef"; // Xanh lá
    if (name.includes("progress")) return "#deebff"; // Xanh dương
    return "#dfe1e6"; // Xám (Open/Todo)
  };

  const getStatusTextColor = (statusName) => {
    const name = statusName.toLowerCase();
    if (
      name.includes("done") ||
      name.includes("closed") ||
      name.includes("resolved")
    )
      return "#006644";
    if (name.includes("progress")) return "#0052cc";
    return "#42526e";
  };

  return (
    <div
      style={{
        overflowX: "auto",
        background: "white",
        border: "1px solid #ddd",
        borderRadius: "4px",
      }}
    >
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}
      >
        <thead>
          <tr
            style={{
              borderBottom: "2px solid #ddd",
              backgroundColor: "#fafbfc",
              color: "#6b778c",
            }}
          >
            <th style={{ padding: "10px", textAlign: "center", width: "40px" }}>
              T
            </th>
            <th style={{ padding: "10px", textAlign: "left" }}>Key</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Summary</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Status</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Priority</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Assignee</th>
            <th style={{ padding: "10px", textAlign: "left" }}>Due Date</th>
          </tr>
        </thead>
        <tbody>
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <tr
                key={task.id}
                onClick={() => onTaskClick(task)}
                style={{ borderBottom: "1px solid #eee", cursor: "pointer" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "#f4f5f7")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "white")
                }
              >
                {/* Type Icon */}
                <td style={{ padding: "10px", textAlign: "center" }}>
                  {getTypeIcon(task.typeId)}
                </td>

                {/* Key */}
                <td
                  style={{ padding: "10px", color: "#007bff", fontWeight: 500 }}
                >
                  TSK-{task.id}
                </td>

                {/* Summary */}
                <td
                  style={{ padding: "10px", fontWeight: 500, color: "#172b4d" }}
                >
                  {task.title}
                </td>

                {/* Status */}
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      padding: "2px 8px",
                      borderRadius: "3px",
                      fontSize: "11px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      backgroundColor: getStatusBadgeColor(
                        task.status?.name || ""
                      ),
                      color: getStatusTextColor(task.status?.name || ""),
                    }}
                  >
                    {task.status?.name || "Unknown"}
                  </span>
                </td>

                {/* Priority */}
                <td style={{ padding: "10px" }}>
                  <span
                    style={{
                      color: getPriorityColor(task.priority),
                      fontWeight: 600,
                      fontSize: "12px",
                    }}
                  >
                    {task.priority}
                  </span>
                </td>

                {/* Assignee */}
                <td style={{ padding: "10px" }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                    }}
                  >
                    {task.assignee ? (
                      <>
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: "#dfe1e6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "10px",
                            fontWeight: "bold",
                            color: "#172b4d",
                          }}
                        >
                          {task.assignee.name.charAt(0).toUpperCase()}
                        </div>
                        <span>{task.assignee.name}</span>
                      </>
                    ) : (
                      <span style={{ color: "#999", fontStyle: "italic" }}>
                        Unassigned
                      </span>
                    )}
                  </div>
                </td>

                {/* Due Date */}
                <td style={{ padding: "10px", color: "#666" }}>
                  {task.dueDate
                    ? new Date(task.dueDate).toLocaleDateString("en-US")
                    : ""}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="7"
                style={{ padding: "30px", textAlign: "center", color: "#999" }}
              >
                No tasks found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default TaskListView;
