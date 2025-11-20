module.exports = (sequelize, Sequelize) => {
    const TeamMember = sequelize.define('team_members', {
        id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        role: { type: Sequelize.ENUM('member', 'subleader'), defaultValue: 'member' },
        joinedAt: { type: Sequelize.DATE, defaultValue: Sequelize.NOW }
    }, { timestamps: false });
    return TeamMember;
};