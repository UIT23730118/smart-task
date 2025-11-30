// backend/services/email.service.js
const nodemailer = require("nodemailer");
const db = require('../models'); // Import models để tìm Leader
const User = db.users;
const Project = db.projects;


// SMTP Transport Configuration
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // Use environment variables for production security
        user: process.env.EMAIL_USER || 'nhannguyen24032004@gmail.com',
        pass: process.env.EMAIL_PASS || '29893301'
    },
});

/**
 * Sends an assignment notification email to the Assignee and the Project Leader.
 *
 * @param {string} assigneeEmail - The email of the person assigned to the task.
 * @param {number} projectId - The ID of the project the task belongs to.
 * @param {string} assigneeName - The name of the assignee.
 * @param {string} taskTitle - The title of the assigned task.
 * @param {number} taskId - The ID of the task.
 */
exports.sendAssignmentEmail = async (assigneeEmail, projectId, assigneeName, taskTitle, taskId) => {
    // 1. FIND PROJECT LEADER'S EMAIL
    let leaderEmail = null;
    let recipients = [assigneeEmail]; // Start with the assignee's email

    try {
        const project = await Project.findByPk(projectId, {
            attributes: ['leaderId'],
            // Assuming you have 'leader' alias set up in Project model association
            include: [{
                model: User,
                as: 'leader', 
                attributes: ['email'],
            }],
        });

        if (project && project.leader && project.leader.email) {
            leaderEmail = project.leader.email;
            // Add leader's email if it's different from the assignee's
            if (leaderEmail !== assigneeEmail) {
                recipients.push(leaderEmail);
            }
        }
    } catch (err) {
        console.error("Error fetching project leader for email notification:", err);
        // Continue attempting to send email to Assignee
    }
    
    // Basic validation
    if (recipients.length === 0) {
        console.warn("Skipping email notification: No recipient emails found.");
        return;
    }

    // Determine the Project URL root from environment variables
    const projectUrl = process.env.PROJECT_BASE_URL || 'http://localhost:3000'; 
    const taskLink = `${projectUrl}/tasks/${taskId}`;

    try {
        const mailOptions = {
            from: process.env.EMAIL_USER || 'your_email@gmail.com', 
            to: recipients.join(','), 
            subject: `[TaskFlow] New Task Assigned: ${taskTitle}`,
            html: `
                <p>Hello ${assigneeName},</p>
                <p>A new task has been assigned to you.</p>
                <h3>${taskTitle} (#${taskId})</h3>
                <p>Please review the details and start working on the task as soon as possible.</p>
                <p style="margin-top: 20px;">
                    <a href="${taskLink}" style="display: inline-block; padding: 10px 20px; background-color: #1890ff; color: #ffffff; text-decoration: none; border-radius: 4px;">
                        View Task Details
                    </a>
                </p>
                <p>Regards,</p>
                <p>The TaskFlow Team</p>
            `,
        };

        const info = await transporter.sendMail(mailOptions);
        console.log("Assignment email sent successfully. Message ID: %s, Recipients: %s", info.messageId, recipients.join(', '));
    } catch (error) {
        console.error("Error sending assignment email:", error);
    }
};