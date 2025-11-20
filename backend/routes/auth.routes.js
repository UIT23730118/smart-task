// /routes/auth.routes.js
const controller = require('../controllers/auth.controller');
const verifySignUp = require('../middleware/verifySignUp');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            'Access-Control-Allow-Headers',
            'Authorization, Origin, Content-Type, Accept'
        );
        next();
    });

    // POST /api/auth/signup
    app.post(
        '/api/auth/signup',
        [verifySignUp.checkDuplicateEmail], // Kiểm tra email
        controller.signup
    );

    // POST /api/auth/signin
    app.post('/api/auth/signin', controller.signin);
};