import React, { useState } from "react";
import ProjectService from "../../api/project.service";
import { FaTrash, FaUserPlus } from "react-icons/fa";
// 💡 Import các components từ Ant Design
import { List, Avatar, Button, Tag, Popconfirm, message } from "antd";
import { TrophyOutlined, UserOutlined } from "@ant-design/icons";

// 💡 Import Modal Chuyên môn
import ExpertiseFormModal from "../User/ExpertiseFormModal"; // Vui lòng kiểm tra lại đường dẫn

const MemberManager = ({ members, projectId, onMemberChanged, userRole }) => {
  const [email, setEmail] = useState("");
  const [addError, setAddError] = useState("");
  const [addMessage, setAddMessage] = useState("");

  // 1. State quản lý Modal Expertise
  const [isExpertiseModalVisible, setIsExpertiseModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  // Vai trò của người dùng hiện tại (Làm sạch chuỗi so sánh)
  const isLeader = userRole?.toLowerCase() === 'leader' || userRole?.toLowerCase() === 'admin';

  // --- HANDLERS ---

  const handleAddMember = async () => {
    setAddError("");
    setAddMessage("");
    try {
      await ProjectService.addMember(projectId, email);
      setAddMessage("Member added successfully!");
      setEmail("");
      onMemberChanged();
    } catch (err) {
      // Sử dụng setAddError để tránh nhầm lẫn với message của antd
      setAddError(err.response?.data?.message || "Error adding member.");
    }
  };

  const handleRemoveMember = async (userId, userName) => {
    try {
      await ProjectService.removeMember(projectId, userId);
      message.success(`Removed member ${userName} successfully.`);
      onMemberChanged();
    } catch (err) {
      message.error(err.response?.data?.message || "Error removing member.");
    }
  };

  // --- HANDLER MODAL EXPERTISE ---
  const handleOpenExpertiseModal = (member) => {
    setSelectedMember(member);
    setIsExpertiseModalVisible(true);
  };

  const handleCloseExpertiseModal = () => {
    setIsExpertiseModalVisible(false);
    setSelectedMember(null);
    // Khi đóng modal, không cần tải lại members của project
  };

  const handleExpertiseUpdated = () => {
    // Chỉ cần hiển thị thông báo. Việc refresh data expertise nằm trong modal.
    // Nếu bạn muốn thấy thay đổi ngay trong danh sách MemberManager, bạn cần gọi onMemberChanged()
  };
  // ----------------------------------------

  return (
    <div>
      <h3 style={{ marginBottom: "15px" }}>Team Members ({members.length})</h3>

      <List
        itemLayout="horizontal"
        dataSource={members}
        locale={{ emptyText: "Dự án chưa có thành viên nào." }}
        renderItem={(member) => {
          const roleName = member.team_members?.role || "Member";

          return (
            <List.Item
              // Actions (Các nút thao tác)
              actions={[
                // Nút Chỉnh sửa Expertise (Chỉ hiển thị cho Leader/Admin)
                isLeader && (
                  <Button
                    key="expertise"
                    icon={<TrophyOutlined />}
                    onClick={() => handleOpenExpertiseModal(member)}
                    title="Chỉnh sửa Chuyên môn (Expertise)"
                    type="link"
                  >
                    Expertise
                  </Button>
                ),

                // Nút Xóa Thành viên (Chỉ hiển thị cho Leader/Admin)
                isLeader && (
                  <Popconfirm
                    key="remove"
                    title={`Are you sure you want to remove ${member.name} from the project?`}
                    onConfirm={() => handleRemoveMember(member.id, member.name)}
                    okText="Yes, Remove"
                    cancelText="No"
                  >
                    <Button danger type="link" icon={<FaTrash size={12} />}>
                      Remove
                    </Button>
                  </Popconfirm>
                ),
              ].filter(Boolean)}
            >
              <List.Item.Meta
                avatar={<Avatar icon={<UserOutlined />} style={{ backgroundColor: '#87d068' }}>
                  {member.name.charAt(0).toUpperCase()}
                </Avatar>}
                title={<b>{member.name}</b>}
                description={
                  <Tag color={roleName === 'Leader' ? 'volcano' : 'blue'}>
                    {roleName}
                  </Tag>
                }
              />
            </List.Item>
          );
        }}
      />

      <div style={{ marginTop: '20px' }}>
        {/* Chỉ Leader mới có thể thêm thành viên */}
        {isLeader && (
          <div className="member-add-form" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="email"
              className="form-control"
              placeholder="Member email..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ flexGrow: 1, maxWidth: "300px", padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}
            />
            <Button type="primary" onClick={handleAddMember} icon={<FaUserPlus />}>
              Add Member
            </Button>
          </div>
        )}

        {addError && <p style={{ color: "red", marginTop: "5px" }}>{addError}</p>}
        {addMessage && <p style={{ color: "green", marginTop: "5px" }}>{addMessage}</p>}
      </div>

      {/* 2. Modal Chỉnh sửa Expertise (Được render có điều kiện) */}
      {selectedMember && (
        <ExpertiseFormModal
          visible={isExpertiseModalVisible}
          onCancel={handleCloseExpertiseModal}
          memberId={selectedMember.id}
          memberName={selectedMember.name}
          onExpertiseUpdated={handleExpertiseUpdated}
        />
      )}
    </div>
  );
};

export default MemberManager;