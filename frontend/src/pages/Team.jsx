import React, { useState, useEffect } from "react";
import ProjectService from "../api/project.service";
import MemberManager from "../components/Project/MemberManager";
import { useAuth } from "../context/AuthContext";
import { FaUsers, FaExchangeAlt } from "react-icons/fa";
import { Card, Select, Spin, Typography } from "antd";

const { Title, Paragraph } = Typography;

const Team = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currentProjectMembers, setCurrentProjectMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const res = await ProjectService.getMyProjects();
        setProjects(res.data);
        if (res.data.length > 0) setSelectedProjectId(res.data[0].id);
      } catch (err) {
        console.error("Project load error:", err);
      } finally {
        setLoading(false);
      }
    };
    loadProjects();
  }, []);

  const loadMembers = async () => {
    if (!selectedProjectId) return;
    try {
      setMemberLoading(true);
      const res = await ProjectService.getProjectDetails(selectedProjectId);
      setCurrentProjectMembers(res.data.members || []);
    } catch (err) {
      console.error("Load member error:", err);
    } finally {
      setMemberLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, [selectedProjectId]);

  if (loading) return <Spin className="p-4" />;

  return (
    <div style={{ padding: 20 }}>
      <Title level={2}>Team Management</Title>
      <Paragraph>Manage all members in your project using Ant Design UI.</Paragraph>

      <Card style={{ marginBottom: 20 }}>
        <label style={{ fontWeight: "bold" }}>
          <FaExchangeAlt /> Select Project:
        </label>
        <Select
          style={{ width: 300, marginTop: 10 }}
          value={selectedProjectId}
          onChange={(value) => setSelectedProjectId(value)}
        >
          {projects.map((p) => (
            <Select.Option key={p.id} value={p.id}>
              {p.name}
            </Select.Option>
          ))}
        </Select>
      </Card>

      <Card>
        <Title level={4}>
          <FaUsers style={{ marginRight: 10 }} /> Member List
        </Title>

        {memberLoading ? (
          <Spin />
        ) : (
          <MemberManager
            members={currentProjectMembers}
            projectId={selectedProjectId}
            onMemberChanged={loadMembers}
            userRole={user.role}
          />
        )}
      </Card>
    </div>
  );
};

export default Team;
