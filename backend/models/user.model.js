// /models/user.model.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, Sequelize) => {
    const User = sequelize.define('users', {
        // ID, createdAt, updatedAt được tự động thêm
        name: {
            type: Sequelize.STRING(150),
            allowNull: false
        },
        email: {
            type: Sequelize.STRING(150),
            allowNull: false,
            unique: true
        },
        password: {
            type: Sequelize.STRING(255),
            allowNull: false
        },
        role: {
            type: Sequelize.ENUM('leader', 'member'),
            defaultValue: 'member'
        },
        skills: {
            type: Sequelize.TEXT
        },
        availability: {
            type: Sequelize.FLOAT,
            defaultValue: 1.0
        },
        score: {
            type: Sequelize.FLOAT,
            defaultValue: 0
        },
        currentTasks: {
            type: Sequelize.INTEGER,
            defaultValue: 0
        }
    }, {
        hooks: {
            // Hook này tự động hash mật khẩu trước khi tạo user
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            // (Bạn cũng có thể thêm 'beforeUpdate' nếu cho phép đổi mật khẩu)
        }
    });

    // Thêm method để kiểm tra mật khẩu
    User.prototype.isValidPassword = async function (password) {
        return await bcrypt.compare(password, this.password);
    };

    return User;
};