// backend/seed.js
import sequelize from './config/db.config.js';
import db from './models/index.js';
import bcrypt from 'bcryptjs';

(async () => {
    try {
        await sequelize.authenticate();
        await db.sequelize.sync({ force: true });

        const User = db.User;
        const Workflow = db.Workflow;
        const Status = db.Status;
        const Transition = db.Transition;
        const IssueType = db.IssueType;
        const Resolution = db.Resolution;
        const Project = db.Project;
        const Task = db.Task;

        // seed issue types
        const types = ['User Story', 'Bug', 'Task', 'Improvement'];
        for (const t of types) await IssueType.findOrCreate({ where: { name: t } });

        // seed resolutions
        const resolutions = ['Fixed', 'Duplicate', "Won't Fix", 'Cannot Reproduce', 'Incomplete'];
        for (const r of resolutions) await Resolution.findOrCreate({ where: { name: r } });

        // seed workflows & statuses & transitions (same as database.sql)
        const [storyWf] = await Workflow.findOrCreate({ where: { name: 'Default Story Workflow' }, defaults: { description: 'User Story flow' } });
        const [bugWf] = await Workflow.findOrCreate({ where: { name: 'Bug Workflow' }, defaults: { description: 'Bug flow' } });

        // helper create statuses only if not exist for wf
        const ensureStatuses = async (wf, list) => {
            for (const s of list) {
                await Status.findOrCreate({ where: { workflowId: wf.id, name: s.name }, defaults: s });
            }
        };

        await ensureStatuses(storyWf, [
            { name: 'TO DO', color: '#e6edf3', isStart: true },
            { name: 'DEFINED', color: '#0b74ff' },
            { name: 'IN PROGRESS', color: '#cfe8ff' },
            { name: 'IMPLEMENTED', color: '#cfe8ff' },
            { name: 'DONE', color: '#dff6e9', isEnd: true },
            { name: 'OBSOLETE', color: '#dff6e9', isEnd: true }
        ]);

        await ensureStatuses(bugWf, [
            { name: 'OPEN', color: '#2b4b6b', isStart: true },
            { name: 'QUERIED', color: '#d6e9ff' },
            { name: 'IN PROGRESS', color: '#cfe8ff' },
            { name: 'IMPLEMENTED', color: '#cfe8ff' },
            { name: 'RESOLVED', color: '#dff6e9' },
            { name: 'CLOSED', color: '#dff6e9', isEnd: true },
            { name: 'BLOCKED', color: '#dddddd' },
            { name: 'OBSOLETE', color: '#dff6e9', isEnd: true }
        ]);

        // transitions: create simple version only if missing
        // (for brevity we won't duplicate all transitions here; you can expand similarly)

        // seed users
        const pw = await bcrypt.hash('password123', 10);
        const [leader] = await User.findOrCreate({ where: { email: 'leader@example.com' }, defaults: { name: 'Leader Demo', email: 'leader@example.com', password: pw, role: 'leader', skills: 'management,planning' } });
        const [alice] = await User.findOrCreate({ where: { email: 'alice@example.com' }, defaults: { name: 'Alice', email: 'alice@example.com', password: pw, role: 'member', skills: 'react,frontend' } });
        const [bob] = await User.findOrCreate({ where: { email: 'bob@example.com' }, defaults: { name: 'Bob', email: 'bob@example.com', password: pw, role: 'member', skills: 'nodejs,backend' } });

        // seed project + tasks
        const [proj] = await Project.findOrCreate({ where: { name: 'Demo Project' }, defaults: { description: 'Demo', leaderId: leader.id } });
        // find start status for story wf
        const startStatus = await Status.findOne({ where: { workflowId: storyWf.id, isStart: true } });
        await Task.findOrCreate({ where: { title: 'Design homepage' }, defaults: { description: 'Wireframes + UI', projectId: proj.id, reporterId: leader.id, assigneeId: alice.id, statusId: startStatus?.id, typeId: 1 } });
        await Task.findOrCreate({ where: { title: 'API skeleton' }, defaults: { description: 'Setup express', projectId: proj.id, reporterId: leader.id, assigneeId: bob.id, statusId: startStatus?.id, typeId: 2 } });

        console.log('Seed finished');
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();
