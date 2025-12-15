import React, { useState } from 'react';
import { Upload, Button, message, Card, Typography } from 'antd';
import { UploadOutlined, FileTextOutlined } from '@ant-design/icons';
import ProjectService from '../../api/project.service';

const { Text } = Typography;

const ProjectImporter = ({ onImportSuccess }) => {
    const [loading, setLoading] = useState(false);

    const handleImport = async (projectData) => {
        setLoading(true);
        try {
            const response = await ProjectService.importFullProject(projectData);
            message.success(response.data.message);

            // Trigger callback (e.g., redirect to the imported project)
            if (onImportSuccess) {
                onImportSuccess(response.data.newProjectId);
            }

        } catch (error) {
            const errorMessage =
                error.response?.data?.message || "Unknown error occurred during project import.";
            message.error(`Import failed: ${errorMessage}`);
        } finally {
            setLoading(false);
        }
    };

    const beforeUpload = (file) => {
        // Validate file type
        if (file.type !== 'application/json') {
            message.error(`${file.name} is not a JSON file. Please upload a valid Project JSON file.`);
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const projectData = JSON.parse(e.target.result);

                // Validate minimal structure
                if (projectData && projectData.name && Array.isArray(projectData.tasks)) {
                    handleImport(projectData);
                } else {
                    message.error('Invalid JSON structure. File must include "name" and a "tasks" array.');
                }
            } catch (error) {
                message.error('Failed to parse JSON. Make sure the file is valid JSON format.');
            }
        };

        reader.readAsText(file);
        return false; // Prevent Ant Design auto-upload
    };

    return (
        <Card
            title={
                <>
                    <FileTextOutlined /> Import New Project
                </>
            }
            style={{ maxWidth: 600, margin: '20px auto' }}
            actions={[
                <Upload
                    key="upload"
                    beforeUpload={beforeUpload}
                    showUploadList={false}
                    maxCount={1}
                >
                    <Button
                        icon={<UploadOutlined />}
                        loading={loading}
                        disabled={loading}
                        type="primary"
                    >
                        Upload Project JSON File
                    </Button>
                </Upload>
            ]}
        >
            <Text type="secondary">
                This feature allows you to create a completely new Project (including Statuses, Tasks, and Members) from an exported JSON file.
            </Text>

            <ul style={{ marginTop: 8 }}>
                <li>
                    <Text strong>New Project Name:</Text> will be prefixed with "Imported - ".
                </li>
                <li>
                    <Text strong>Members:</Text> will be reassigned if their email exists in the system.
                </li>
                <li>
                    <Text strong>Tasks/Statuses:</Text> old IDs will be ignored and new IDs will be generated.
                </li>
            </ul>
        </Card>
    );
};

export default ProjectImporter;
