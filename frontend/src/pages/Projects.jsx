import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import ProjectService from '../api/project.service';

// Ant Design
import { Typography, Button, Row, Col, Spin, Result, Empty, message } from 'antd';
import { PlusOutlined, FolderOpenOutlined } from '@ant-design/icons';

import ProjectCard from '../components/Project/ProjectCard';
import CreateProjectModal from '../components/Project/CreateProjectModal';

const { Title, Text } = Typography;

const Projects = () => {
    const { user } = useAuth();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const response = await ProjectService.getMyProjects();
            setProjects(response.data);
        } catch (err) {
            setError('Failed to fetch projects.');
            message.error('Failed to load projects.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProjects();
    }, []);

    const handleProjectCreated = () => {
        fetchProjects(); // Reload project list
    };

    return (
        <div style={{ padding: '24px'}}>
            {/* Header */}
            <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Projects</Title>
                    <Text type="secondary">Manage and track all your projects</Text>
                </Col>

                <Col>
                    {user.role === 'leader' && (
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalOpen(true)}
                        >
                            New Project
                        </Button>
                    )}
                </Col>
            </Row>

            {/* Content */}
            {loading ? (
                <Spin size="large" style={{ display: 'block', marginTop: 50 }} />
            ) : error ? (
                <Result
                    status="error"
                    title="Error loading projects"
                    subTitle={error}
                />
            ) : projects.length > 0 ? (
                <Row gutter={[24, 24]}>
                    {projects.map((project) => (
                        <Col xs={24} sm={12} md={8} lg={6} key={project.id}>
                            <ProjectCard project={project} />
                        </Col>
                    ))}
                </Row>
            ) : (
                <div style={{ padding: 40 }}>
                    <Empty
                        description={
                            <span style={{ fontSize: 16 }}>
                                No projects yet
                            </span>
                        }
                        image={<FolderOpenOutlined style={{ fontSize: 48, color: '#ccc' }} />}
                    />
                    <Text type="secondary">Create your first project to get started</Text>
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <CreateProjectModal
                    onClose={() => setIsModalOpen(false)}
                    onProjectCreated={handleProjectCreated}
                />
            )}
        </div>
    );
};

export default Projects;
