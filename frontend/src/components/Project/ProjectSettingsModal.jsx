import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, InputNumber, message } from 'antd';
import ProjectService from '../../api/project.service';
import { useAuth } from '../../context/AuthContext';
import { FaCog } from 'react-icons/fa';

const ProjectSettingsModal = ({ visible, onCancel, project, onUpdated }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();
    
    // Current leader
    const isProjectLeader = user.id === project?.leaderId;

    useEffect(() => {
        if (project) {
            form.setFieldsValue({
                name: project.name,
                description: project.description,
                // Load the current workloadFactor (default = 1.0)
                workloadFactor: project.workloadFactor || 1.0,
            });
        }
    }, [project, form]);

    const handleSave = async (values) => {
        if (!isProjectLeader) {
            message.error("You are not the Project Leader.");
            return;
        }
        setLoading(true);
        try {
            await ProjectService.updateProject(project.id, values);
            message.success('Project settings and Workload Factor updated successfully!');
            onUpdated(); // Callback for parent component (e.g., ProjectDetail) to refresh data
            onCancel();
        } catch (error) {
            message.error(error.response?.data?.message || 'Error updating project.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            title={
                <>
                    <FaCog style={{ marginRight: 8 }} /> 
                    Project Settings: {project?.name}
                </>
            }
            open={visible}
            onCancel={onCancel}
            footer={[
                <Button key="back" onClick={onCancel}>Cancel</Button>,
                isProjectLeader && (
                    <Button
                        key="submit"
                        type="primary"
                        loading={loading}
                        onClick={() => form.submit()}
                    >
                        Save Changes
                    </Button>
                ),
            ]}
        >
            <Form
                form={form}
                layout="vertical"
                onFinish={handleSave}
                disabled={!isProjectLeader}
            >
                <Form.Item
                    name="name"
                    label="Project Name"
                    rules={[{ required: true }]}
                >
                    <Input />
                </Form.Item>

                <Form.Item name="description" label="Description">
                    <Input.TextArea rows={3} />
                </Form.Item>

                <hr style={{ margin: '20px 0' }} />

                {/* 💡 PROJECT WORKLOAD NORMALIZATION FACTOR */}
                <h4 style={{ marginBottom: 10 }}>
                    Workload Normalization Factor
                </h4>

                <Form.Item
                    name="workloadFactor"
                    tooltip="Adjust the relative difficulty of tasks in this project (1.0 = normal, >1.0 = harder)"
                    rules={[{ required: true, message: 'Please enter a factor.' }]}
                >
                    <InputNumber
                        min={0.1}
                        max={2.0}
                        step={0.1}
                        style={{ width: '100%' }}
                        formatter={(value) => `${value}x (Factor)`}
                        parser={(value) => value.replace('x (Factor)', '')}
                    />
                </Form.Item>

                {!isProjectLeader && (
                    <p style={{ color: 'red' }}>
                        * Only the Project Leader can modify these settings.
                    </p>
                )}
            </Form>
        </Modal>
    );
};

export default ProjectSettingsModal;
