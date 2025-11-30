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
      setMessage("Member added successfully!");
      setEmail("");
      onMemberChanged();
    } catch (err) {
      setError(err.response?.data?.message || "Error adding member.");
    }
  };

  const handleRemoveMember = async (userId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      try {
        await ProjectService.removeMember(projectId, userId);
        onMemberChanged();
      } catch (err) {
        alert(err.response?.data?.message || "Error removing member.");
      }
    }
  };

  return (
    <div>
      <h3 style={{ marginBottom: "15px" }}>Team Members ({members.length})</h3>

      <div className="member-list">
        {members.map((member) => {
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

              {/* Only leader can remove */}
              {userRole === "leader" && (
                <button
                  className="member-remove-btn"
                  onClick={() => handleRemoveMember(member.id)}
                  title="Remove from project"
                >
                  <FaTrash size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Only leader can add */}
      {userRole === "leader" && (
        <div className="member-add-form">
          <input
            type="email"
            className="form-control"
            placeholder="Member email..."
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ width: "300px" }}
          />
          <button className="btn btn-primary" onClick={handleAddMember}>
            <FaUserPlus /> Add
          </button>
        </div>
      )}

      {error && <p style={{ color: "red", marginTop: "5px" }}>{error}</p>}
      {message && <p style={{ color: "green", marginTop: "5px" }}>{message}</p>}
    </div>
  );
};

export default MemberManager;
