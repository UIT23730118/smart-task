import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Button, Slider, Space, message } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import UserService from '../../api/user.service'; // Đảm bảo đường dẫn đúng

const { Option } = Select;

const ExpertiseFormModal = ({ visible, onCancel, memberId, memberName, onExpertiseUpdated }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    // 1. Tải dữ liệu Expertise hiện tại khi Modal mở
    useEffect(() => {
        if (visible && memberId) {
            setLoading(true);
            UserService.getUserExpertise(memberId)
                .then(res => {
                    // res.data.expertise có thể là null, cần đảm bảo là mảng rỗng
                    form.setFieldsValue({ expertiseList: res.data.expertise || [] });
                })
                .catch(err => {
                    console.error("Lỗi tải expertise:", err);
                    message.error("Không thể tải dữ liệu chuyên môn.");
                })
                .finally(() => setLoading(false));
        } else {
            // Reset form khi đóng/mở
            form.resetFields();
        }
    }, [visible, memberId, form]);

    // 2. Xử lý Submit
    const handleSubmit = async (values) => {
        setLoading(true);
        try {
            // Lọc các item rỗng trước khi gửi lên
            const cleanExpertise = values.expertiseList.filter(item => 
                item && item.name && String(item.name).trim() !== ''
            );

            await UserService.updateUserExpertise(memberId, cleanExpertise);
            message.success(`Cập nhật chuyên môn cho ${memberName} thành công!`);
            onExpertiseUpdated(); // Gọi callback để refresh danh sách (nếu cần)
            onCancel();

        } catch (error) {
            message.error(error.response?.data?.message || "Lỗi cập nhật chuyên môn.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={`Chỉnh sửa Chuyên môn cho: ${memberName}`}
            open={visible}
            onCancel={onCancel}
            width={650}
            footer={[
                <Button key="back" onClick={onCancel}>
                    Hủy
                </Button>,
                <Button 
                    key="submit" 
                    type="primary" 
                    loading={loading} 
                    onClick={() => form.submit()}
                >
                    Lưu Chuyên môn
                </Button>,
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                initialValues={{ expertiseList: [] }}
            >
                <Form.List name="expertiseList">
                    {(fields, { add, remove }) => (
                        <>
                            {fields.map(({ key, name, fieldKey, ...restField }) => (
                                <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                    {/* Tên Kỹ năng */}
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'name']}
                                        fieldKey={[fieldKey, 'name']}
                                        rules={[{ required: true, message: 'Nhập tên kỹ năng' }]}
                                        style={{ width: 250 }}
                                    >
                                        <Input placeholder="Tên kỹ năng (ví dụ: React, SQL, Testing)" />
                                    </Form.Item>

                                    {/* Điểm Đánh giá (Thang 10) */}
                                    <Form.Item
                                        {...restField}
                                        name={[name, 'score']}
                                        fieldKey={[fieldKey, 'score']}
                                        label={`Điểm (Thang 10): ${form.getFieldValue(['expertiseList', name, 'score']) || 1}`}
                                        initialValue={1}
                                        style={{ flexGrow: 1 }}
                                    >
                                        <Slider min={1} max={10} style={{ width: 150 }} />
                                    </Form.Item>

                                    {/* Nút Xóa */}
                                    <MinusCircleOutlined onClick={() => remove(name)} style={{ fontSize: '18px', color: '#f5222d' }} />
                                </Space>
                            ))}

                            <Form.Item>
                                <Button type="dashed" onClick={() => add({ score: 1 })} block icon={<PlusOutlined />}>
                                    Thêm Kỹ năng/Chuyên môn
                                </Button>
                            </Form.Item>
                        </>
                    )}
                </Form.List>
            </Form>
        </Modal>
    );
};

export default ExpertiseFormModal;