// /server.js
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Cấu hình CORS
app.use(cors({ origin: 'http://localhost:3000' })); // Chỉ cho phép frontend
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Kết nối database
const db = require('./models');
db.sequelize.sync()
    .then(() => {
        console.log("Database connected and synced.");
    })
    .catch((err) => {
        console.error("Failed to sync db: " + err.message);
    });

// Route cơ bản
app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Smart Task API.' });
});

// Import các routes
require('./routes/auth.routes')(app);
require('./routes/project.routes')(app);
require('./routes/task.routes.js')(app);
require('./routes/dashboard.routes.js')(app)
require('./routes/report.routes')(app);
require('./routes/user.routes')(app);
// Chúng ta sẽ thêm các route khác (task, project) ở đây sau

// Cài đặt PORT
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}.`);
});