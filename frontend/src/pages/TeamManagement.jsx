import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Row, Col, Card, Button, List, Avatar, Modal, Form, Input, Select, message, Popconfirm } from "antd";
import { PlusOutlined, DeleteOutlined, UserAddOutlined, TeamOutlined } from "@ant-design/icons";
import TeamService from "../api/team.service";
import UserService from "../api/user.service"; // Giả sử bạn có service lấy list user

const { Option } = Select;

const TeamManagement = () => {
  const { id: projectId } = useParams(); // Lấy ID dự án từ URL
  const [teams, setTeams] = useState([]);
  const [users, setUsers] = useState([]); // List toàn bộ user để chọn thêm vào tổ
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false); // Modal tạo tổ
  const [isAddMemberVisible, setIsAddMemberVisible] = useState(false); // Modal thêm mem
  const [currentTeamId, setCurrentTeamId] = useState(null);
  const [form] = Form.useForm();
  const [memberForm] = Form.useForm();

  // 1. Load dữ liệu
const fetchData = async () => {
  setLoading(true);
  try {
    // A. Lấy danh sách Teams
    const teamRes = await TeamService.getTeamsByProject(projectId);
    setTeams(teamRes.data);

    // B. 👇 Lấy danh sách User thật từ API (Bỏ comment)
    const userRes = await UserService.getAllUsers();
    setUsers(userRes.data); // Gán dữ liệu thật vào state

  } catch (error) {
    message.error("Lỗi tải dữ liệu: " + (error.response?.data?.message || error.message));
  } finally {
    setLoading(false);
  }
};

useEffect(() => {
  fetchData();
  }, [projectId]);

  // 2. Xử lý tạo Tổ
  const handleCreateTeam = async (values) => {
    try {
      await TeamService.createTeam({ ...values, projectId });
      message.success("Team created successfully!");
      setIsModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error) {
      message.error("Error creating team: " + error.response?.data?.message);
    }
  };

  // 3. Xử lý thêm thành viên
  const handleAddMember = async (values) => {
    try {
      await TeamService.addMemberToTeam({ ...values, teamId: currentTeamId });
      message.success("Member added successfully!");
      setIsAddMemberVisible(false);
      memberForm.resetFields();
      fetchData();
    } catch (error) {
      message.error("Error adding member: " + error.response?.data?.message);
    }
  };

  // 4. Xóa thành viên
  const handleRemoveMember = async (memberId) => {
    try {
      await TeamService.removeMember(memberId);
      message.success("Member removed.");
      fetchData();
    } catch (error) {
      message.error("Error removing member: " + error.message);
    }
  };

  // 5. Xóa tổ
  const handleDeleteTeam = async (teamId) => {
    try {
      await TeamService.deleteTeam(teamId);
      message.success("Đã xóa tổ.");
      fetchData();
    } catch (error) {
      message.error("Lỗi xóa tổ: " + error.message);
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
        <h2>Team Management</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setIsModalVisible(true)}>
          Create New Team
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {teams.map((team) => (
          <Col xs={24} sm={12} md={8} lg={6} key={team.id}>
            <Card
                title={<><TeamOutlined /> {team.name}</>}
                extra={
                    <Popconfirm title="Delete this team?" onConfirm={() => handleDeleteTeam(team.id)}>
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                }
                style={{ height: '100%' }}
                bodyStyle={{ padding: '0 10px 10px 10px' }}
            >
              <div style={{ marginTop: 10, marginBottom: 10, textAlign: 'right' }}>
                  <Button size="small" type="dashed" icon={<UserAddOutlined />} onClick={() => {
                      setCurrentTeamId(team.id);
                      setIsAddMemberVisible(true);
                  }}>
                      Add Member
                  </Button>
              </div>

              <List
                itemLayout="horizontal"
                dataSource={team.team_members}
                locale={{ emptyText: "No members yet" }}
                renderItem={(item) => (
                  <List.Item
                    actions={[
                        <Popconfirm title="Remove member?" onConfirm={() => handleRemoveMember(item.id)}>
                             <Button type="text" size="small" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<Avatar style={{ backgroundColor: '#87d068' }}>{item.user?.name?.[0]}</Avatar>}
                      title={item.user?.name}
                      description={<span style={{fontSize: 12}}>{item.role}</span>}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        ))}
      </Row>

      {/* Modal Tạo Tổ */}
      <Modal title="Create New Team" open={isModalVisible} onCancel={() => setIsModalVisible(false)} onOk={() => form.submit()}>
        <Form form={form} layout="vertical" onFinish={handleCreateTeam}>
          <Form.Item name="name" label="Team Name (e.g., Dev Team, Marketing...)" rules={[{ required: true }]}>
            <Input placeholder="Enter team name..." />
          </Form.Item>
            <Form.Item
            name="leaderId"
            label="Select Team Leader"
            rules={[{ required: true, message: 'Please select a leader' }]}
        >
            <Select placeholder="Select a user to lead this team" showSearch optionFilterProp="children">
                {users.map(u => (
                    <Option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                    </Option>
                ))}
            </Select>
        </Form.Item>
          {/* Có thể thêm chọn Leader cho tổ ở đây */}
        </Form>
      </Modal>

      {/* Modal Thêm Thành Viên */}
      <Modal title="Add Member to Team" open={isAddMemberVisible} onCancel={() => setIsAddMemberVisible(false)} onOk={() => memberForm.submit()}>
        <Form form={memberForm} layout="vertical" onFinish={handleAddMember}>
          <Form.Item name="userId" label="Select User" rules={[{ required: true }]}>
            <Select showSearch optionFilterProp="children">
                {users.map(u => (
                    <Option key={u.id} value={u.id}>{u.name} ({u.email})</Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="role" label="Role" initialValue="member">
            <Select>
                <Option value="member">Thành viên (Member)</Option>
                <Option value="subleader">Phó tổ (Sub-leader)</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default TeamManagement;