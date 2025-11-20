// /middleware/verifySignUp.js
const db = require('../models');
const User = db.users;

checkDuplicateEmail = async (req, res, next) => {
    try {
        const user = await User.findOne({
            where: { email: req.body.email }
        });

        if (user) {
            return res.status(400).send({
                message: 'Failed! Email is already in use!'
            });
        }
        next();
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

const verifySignUp = {
    checkDuplicateEmail: checkDuplicateEmail
};

module.exports = verifySignUp;