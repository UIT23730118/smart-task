// /src/components/Project/MemberManager.jsx
import React, { useState } from "react";
import ProjectService from "../../api/project.service";
import { FaTrash, FaUserPlus } from "react-icons/fa";

const MemberManager = ({ members, projectId, onMemberChanged, userRole }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handleAddMember = async () => {
    setError("");
    setMessage("");
    try {
      await ProjectService.addMember(projectId, email);
      setMessage("Thêm thành viên thành công!");
      setEmail("");
      onMemberChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Lỗi khi thêm thành viên.");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm("Bạn có chắc muốn xóa thành viên này?")) {
      try {
        await ProjectService.removeMember(projectId, userId);
        onMemberChanged();
      } catch (err) {
        alert(err.response?.data?.message || "Lỗi khi xóa thành viên.");
      }
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: "15px" }}>Team Members ({members.length})</h3>

      <div className="member-list">
        {members.map((member) => {
          // --- FIX LỖI Ở ĐÂY ---
          // Cấu trúc cũ: member.project_members.role
          // Cấu trúc mới: member.team_members.role (Do Sequelize trả về từ bảng nối)
          const roleName = member.team_members
            ? member.team_members.role
            : "Member";

          return (
            <div key={member.id} className="member-item">
              <div className="member-avatar" title={member.name}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <span style={{ fontWeight: "bold" }}>{member.name}</span>
                <span
                  style={{ fontSize: "12px", color: "#666", marginLeft: "5px" }}
                >
                  ({roleName})
                </span>
              </div>

              {/* Chỉ Leader mới thấy nút xóa */}
              {userRole === "leader" && (
                <button
                  className="member-remove-btn"
                  onClick={() => handleRemoveMember(member.id)}
                  title="Xóa khỏi project"
                >
                  <FaTrash size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Chỉ Leader mới thấy form thêm */}
      {userRole === "leader" && (
        <div className="member-add-form">
          <input
            type="email"
            className="form-control"
            placeholder="Email thành viên..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "300px" }}
          />
          <button className="btn btn-primary" onClick={handleAddMember}>
            <FaUserPlus /> Thêm
          </button>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: "5px" }}>{error}</p>}
      {message && <p style={{ color: "green", marginTop: "5px" }}>{message}</p>}
    </div>
  );
};

export default MemberManager;
