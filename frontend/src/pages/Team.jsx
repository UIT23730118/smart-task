import React, { useState, useEffect } from "react";
import ProjectService from "../api/project.service";
import MemberManager from "../components/Project/MemberManager";
import { useAuth } from "../context/AuthContext";
import { FaUsers, FaExchangeAlt } from "react-icons/fa";

const Team = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currentProjectMembers, setCurrentProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Tải danh sách project của user
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await ProjectService.getMyProjects();
        setProjects(res.data);

        // Mặc định chọn project đầu tiên nếu có
        if (res.data.length > 0) {
          setSelectedProjectId(res.data[0].id);
        }
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProjects();
  }, []);

  // 2. Tải thành viên khi Project được chọn thay đổi
  const fetchMembers = async () => {
    if (!selectedProjectId) return;
    try {
      const res = await ProjectService.getProjectDetails(selectedProjectId);
      setCurrentProjectMembers(res.data.members);
    } catch (error) {
      console.error("Error fetching members:", error);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [selectedProjectId]);

  const handleProjectChange = (e) => {
    setSelectedProjectId(e.target.value);
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div style={{ padding: "20px" }}>
      <div className="page-header">
        <div>
          <h1>Team Management</h1>
          <p>Quản lý thành viên của các dự án</p>
        </div>
      </div>

      {/* Project Selector */}
      <div className="card" style={{ marginBottom: "20px", padding: "20px" }}>
        <label
          style={{ fontWeight: "bold", display: "block", marginBottom: "10px" }}
        >
          <FaExchangeAlt /> Chọn Dự Án:
        </label>
        <select
          className="form-control"
          value={selectedProjectId}
          onChange={handleProjectChange}
          style={{ maxWidth: "400px" }}
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Member Manager Component */}
      {selectedProjectId ? (
        <div className="card" style={{ padding: "20px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <FaUsers size={24} color="#007bff" />
            <h3 style={{ margin: 0 }}>Danh sách thành viên</h3>
          </div>

          <MemberManager
            members={currentProjectMembers}
            projectId={selectedProjectId}
            onMemberChanged={fetchMembers}
            userRole={user.role}
          />
        </div>
      ) : (
        <div className="empty-state">
          <p>Bạn chưa tham gia dự án nào.</p>
        </div>
      )}
    </div>
  );
};

export default Team;
