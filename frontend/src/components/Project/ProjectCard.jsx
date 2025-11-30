import React from 'react';
import { Link } from 'react-router-dom';

const ProjectCard = ({ project }) => {
    return (
        <div className="project-item">
            <Link to={`/project/${project.id}`}>
                <h4>{project.name}</h4>
                <p className="text-muted">
                    {project.description
                        ? project.description.substring(0, 100) + (project.description.length > 100 ? '...' : '')
                        : 'No description'
                    }
                </p>
            </Link>
        </div>
    );
};

export default ProjectCard;