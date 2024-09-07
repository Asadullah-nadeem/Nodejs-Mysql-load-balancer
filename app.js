require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cookieParser = require('cookie-parser');
const { masterConnection, getSlaveConnection } = require('./db');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static('public'));
app.use(cookieParser('your_secret_key'));

let currentSlave = 0;
const onlineUsers = {};

io.on('connection', (socket) => {
    console.log('A user connected');
    onlineUsers[socket.id] = { online: true, id: socket.id };
    io.emit('update-users', onlineUsers);

    socket.on('disconnect', () => {
        console.log('User disconnected');
        if (onlineUsers[socket.id]) {
            onlineUsers[socket.id].online = false;
            io.emit('update-users', onlineUsers);
        }
    });
});

app.post('/add-user', (req, res) => {
    const { name, email } = req.body;
    const sql = `INSERT INTO users (name, email) VALUES (?, ?)`;

    masterConnection.query(sql, [name, email], (err, result) => {
        if (err) {
            console.error('Error inserting user:', err);
            res.status(500).send('Error adding user');
            return;
        }

        res.cookie('user-added', 'true', { signed: true, maxAge: 24 * 60 * 60 * 1000 }); // 1 day
        io.emit('user-added', {
            name,
            email,
            database: 'Master'
        });
        res.send('User added successfully');
    });
});

app.get('/users', (req, res) => {
    const sql = `SELECT * FROM users`;
    const slaveConnection = getSlaveConnection();
    currentSlave = (currentSlave + 1) % 2; // Assuming 2 slave connections

    slaveConnection.query(sql, (err, results) => {
        if (err) throw err;
        res.json({
            results,
            database: `Slave ${currentSlave + 1}`
        });
    });
});

const PORT = process.env.PORT;
const URL = process.env.URL;
server.listen(PORT, (err) => {
    if (err) {
        console.error('❌ Error starting server:', err);
        return;
    }
    console.log(`✅ Server running at ${URL}:${PORT}`);
});
