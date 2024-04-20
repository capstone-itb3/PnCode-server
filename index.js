const express = require('express');
const app = express();
const http = require('http');

const { Server } = require('socket.io');
let server = http.createServer(app);
const io = new Server(server);

const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');

const { uri }  = require('./database');
const jwt = require('jsonwebtoken');
//const records = require('./routes/record');

const userModel = require('./models/users.model');
const roomModel = require('./models/rooms.model');

app.use(cors());
//app.use('user', records);
app.use(express.json());

const PORT = process.env.PORT || 5000;

mongoose.connect(uri).then(() => {
    console.log('Connected to database.');
    app.listen = server.listen(PORT, () => {
        console.log(`Server is running on port:${PORT}`);    
    });
}).catch(() => {
    console.log('Error. Connection failed.')
});

app.post('/api/register', async (req, res) => {
    try {
        const user = await userModel.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            rooms: [],
            classes: [],
            teams: []
        });

        const token = jwt.sign({
            username: user.username,
            email: user.email,
            password: user.password,

        }, 'secret123capstoneprojectdonothackimportant0987654321');
        
        res.json({ status: 'ok', user: token});    
    } catch (e) {
        res.status(500).json({ status: false });
    }
});

app.post('/api/login', async (req, res) => {
    const user = await userModel.findOne({
        username: req.body.username,
        password: req.body.password,
});
    
    if (user) {
        const token = jwt.sign({
            username: user.username,
            email: user.email,
            password: user.password,
            rooms: user.rooms,
            teams: user.teams,
            classes: user.classes
    
        }, 'secret123capstoneprojectdonothackimportant0987654321');

        return res.json({ status: 'ok', user: token });
    } else {
        return res.json({ status: 'error', user: false });
    }
});

app.post('/api/display-rooms', async (req, res) => {
    const room = await roomModel.findOne({
        room_id: req.body.room_id
    });
    
    if (room) {
        return res.json({ 
            room_id: room.room_id,
            room_name: room.room_name,
            owner: room.owner,
            joined: room.joined,
            team: room.team,
         });
    } else {
        return res.json({ status: 'error', room_id: false });
    }
});



// app.post('/api/get-rooms', async (req, res) => {

//     const token = req.headers['x-access-token'];
//     try {
//         const decoded = jwt.verify(token, 'secret123capstoneprojectdonothackimportant0987654321');
//         const email = decoded.email;

//         return { status: 'ok' }
//     } catch (e) {
//         console.log(e);
//         res.json({ status: 'error', error: 'Invalid token: ' + e })
//     }
// });






//! Socket.IO code, do not change anything beyond here
//! Socket.IO code, do not change anything beyond here
//! Socket.IO code, do not change anything beyond here

const userSocketMap = {};

const getAllConnectedUsers = (room_id) => {
    return Array.from(io.sockets.adapter.rooms.get(room_id) || []).map(
        (socketId) => {
            return {
            socketId,
            username: userSocketMap[socketId]
            };
        }
    );
};

io.on('connection', (socket) =>  {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', ({ room_id, username }) => {
         userSocketMap[socket.id] = username;
         socket.join(room_id);
         const users = getAllConnectedUsers(room_id);
         console.log(users);

         users.forEach(({ socketId }) => {
            io.to(socketId).emit('joined', {
                users,
                username,
                socketId: socket.id,
            });
        }); 
    });

    socket.on('update', ({ room_id, code }) => {
        socket.in(room_id).emit('update', {code});          
    });

    socket.on('sync', ({ socketId, code }) => {
        io.to(socketId).emit('update', {code});
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach ((room_id) => {
            socket.in(room_id).emit('disconnected', {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave;
    });

});