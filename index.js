//*Express module imports
const express = require('express');
const app = express();
const http = require('http');

//*Socket.io module imports
const { Server } = require('socket.io');
let server = http.createServer(app);
const io = new Server(server);

//*MongoDB module imports
const mongoose = require('mongoose');
const cors = require('cors');
const { uri }  = require('./database');

//*Utilities
const { v4: uuid } = require('uuid');
const jwt = require('jsonwebtoken');
//const multer = require('multer');
//const records = require('./routes/record');

//*Models
const studentModel = require('./models/students.model');
const { soloRoomModel, roomModel } = require('./models/rooms.model');

//*PORT the server will use
const PORT = process.env.PORT || 5000;

//*Connects to the database
mongoose.connect(uri).then(() => {
    console.log('Connected to database.');

    //*Starts the app and listens to the PORT  
    app.listen = server.listen(PORT, () => {
        console.log(`Server is running on port:${PORT}`);    
    });

}).catch(() => {
    console.log('Error. Connection failed.')
});

app.use(cors());
app.use(express.json());

function tokenize (user) {
    return jwt.sign({
                student_id: user.student_id,
                first_name: user.first_name,
                last_name: user.last_name,
                section: user.section,
                position: user.position,
                solo_rooms: user.solo_rooms,
                assigned_rooms: user.assigned_rooms,
                teams: user.teams

    }, 'secret123capstoneprojectdonothackimportant0987654321');
};

//*POST function when user registers
app.post('/api/register', async (req, res) => {
    if (req.body.password.length < 8) {
        return res.json({ status: 'error', message: 'Password must have more than 8 characters'});

    } else if (req.body.password !== req.body.conf_password) {
        return res.json({ status: 'error', message: 'Password and Re-typed Password doesn\'t match.'});

    } else {
        if (await studentModel.findOne({student_id: req.body.student_id})) {
            return res.json({status: 'error', message: 'The Student ID you entered is already registered. ' 
                                                       + 'If you think this is a mistake, please contact the MISD.'});

        } else {
            await studentModel.create({
                student_id: req.body.student_id,
                first_name: req.body.first_name,
                last_name: req.body.last_name,
                password: req.body.password,
                section: req.body.section,
                position: 'Student',
                solo_rooms: [],
                assigned_rooms: [],
                teams: []
            });
            
            return res.json({ status: 'ok' });   
        }
    }
});

//*POST function when user logs in
app.post('/api/login', async (req, res) => {
    const user = await studentModel.findOne({
        student_id: req.body.student_id,
        password: req.body.password,
    });
    
    if (user) {
        const token = tokenize(user);
        return res.json({ user: token });
        
    } else {
        return res.json({ message: 'Incorrect student ID or password.' });
    }
});

//*POST function when user creates a solo room
app.post('/api/create-room-solo', async (req, res) => {
    try {
        let already_exists = true;
        let new_id = 0;
        let user, owner;

        while (already_exists) {
            new_id = uuid().toString();
            already_exists = await soloRoomModel.findOne({
                room_id: new_id
            });
        }

        if (req.body.position === 'Student') {
            owner = req.body.student_id;

            await studentModel.updateOne({ student_id: req.body.student_id }, {
                $push: {solo_rooms: new_id}
            });

            user = await studentModel.findOne({ student_id: req.body.student_id });    
        } 
        // else if (req.body.position === 'Professor') {
        //  owner = req.body.email;
        // }

        await soloRoomModel.create({
            room_id: new_id,
            room_name: 'New room',
            room_type: 'solo',
            files: [],
            notes: '',
            owner_id: owner,
        });
        
        const token = tokenize(user);
        
        return res.json({ status: 'ok', room_id: new_id, token: token, message: 'Room Success' });
    } catch (e) {
        res.status(500).json({ status: false, error: e });
        console.log(e);
    }
});

//*POST function to display rooms in 'Last Updated' order
app.post('/api/get-rooms', async (req, res) => {
    try {
        let sorted_solo = [];
        let sorted_assigned = [];
        const convertOffset = req.body.timezone_diff * 60 * 1000;

        for (let i = 0; i < req.body.solo_rooms.length; i++) {
            sorted_solo[i] = await soloRoomModel.findOne({ room_id: req.body.solo_rooms[i] });
            sorted_solo[i].updatedAt = new Date(sorted_solo[i].updatedAt.getTime() + convertOffset);
        }
        sorted_solo.sort((a, b) => b.updatedAt - a.updatedAt);
        
        for (let i = 0; i < req.body.assigned_rooms.length; i++) {
            sorted_assigned[i] = await roomModel.findOne({ room_id: req.body.assigned_rooms[i] });
            sorted_assigned[i].updatedAt = new Date(sorted_assigned[i].updatedAt.getTime() + convertOffset);
        }

        return res.json({ status: 'ok', solo_rooms: sorted_solo, assigned_rooms: sorted_assigned });
    } catch (e) {
        res.status(500).json({ status: false, error: e });
        console.log(e);
    }
});

//*POST function to verify if joined room exists
app.post('/api/verify-room', async (req, res) => {
    try {
        let room = null;

        if (req.body.room_type === 'solo') {
            room = await soloRoomModel.findOne({ room_id: req.body.room_id });

        } else if (req.body.room_type === 'assigned') {
            room = await roomModel.findOne({ room_id: req.body.room_id });

        } else {
            return res.json({ status: 'invalid', room: false });
        }
        
        if (room) {
            return res.json({ status : 'ok', room: room});
        } else {
            return res.json({ status: 'invalid', room: false });
        }
    } catch (e) {
        res.status(500).json({ status: false, error: e });
        console.log(e);
    }
});

//*POST function to add user in room's joined members 
app.post('/api/add-joined', async (req, res) => {
    const room = await roomModel.findOne({ room_id: req.body.room_id });
    const joined =  { 
        student_id: req.body.auth.student_id,
        shortened_name: req.body.auth.last_name + ', ' + req.body.auth.first_name[0] + '.'
    }
    const alreadyJoined = room.joined.forEach(() => {
        let bool = false;

        return false;
    })
    if (room.joined.includes(joined)) {
        
    } else if (room.owner.student_id != req.body.auth.student_id) {
        try {
            await studentModel.updateOne({student_id: req.body.auth.student_id}, {
                $push: { rooms: req.body.room_id }
            });


            await roomModel.updateOne({ room_id: req.body.room_id }, {
                $push: { joined: joined }
            });
            
            const user = await studentModel.findOne({
                student_id: req.body.auth.student_id,
            });
        
            const token = tokenize(user);            
    
            return res.json({ status: 'ok', user: token });
        } catch (e) {
            return res.json({ status: false, error: e })
        }
    }
});

//*POST function when user logs in
app.post('/api/rename-room', async (req, res) => {
    await roomModel.updateOne({ room_id: req.body.room_id }, {
        room_name: req.body.room_name,
    });
});

// //! WebSocket code, do not change anything beyond here unless necessary
// //! WebSocket code, do not change anything beyond here unless necessary

// const { WebSocketServer } = require('ws'); 

// const wsPORT = 8080;
// const wss = new WebSocketServer({ port: wsPORT });

// wss.on('connection', function connection(ws) {
//     console.log('Websocket Port:' + wsPORT)
//     ws.on('message', function message(data) {
//         console.log('received: %s', data);
//     });

// });

//! Socket.IO code, do not change anything beyond here unless necessary
//! Socket.IO code, do not change anything beyond here unless necessary


// * map of users active in different rooms identified using socket 
const userSocketMap = {};

//* array of users connected per socket
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

//* starts socket.io, every real-time connection happens here
io.on('connection', (socket) =>  {
    console.log(`User connected: ${socket.id}`);

    //*onJoin function, triggers when user/s join the room
    socket.on('join', ({ room_id, username }) => {
         userSocketMap[socket.id] = username;
         socket.join(room_id);
         const users = getAllConnectedUsers(room_id);

         users.forEach(({ socketId }) => {
            io.to(socketId).emit('joined', {
                users,
                username,
                socketId: socket.id,
            });
        }); 
    });


    //*onUpdate function, triggers when code in the editor is being changed
    socket.on('update', ({ room_id, code, socketId }) => {        
        async function updateRoom () {
            await roomModel.updateOne({room_id: room_id}, {
                code: code
            });
        }
        updateRoom();
        console.log('get');

        io.to(socketId).emit('sync', { code });
    });

    // //*onSync function, triggers to sync the changing code with other users in the room
    // socket.on('sync', ({ socketId, code }) => {
    // });

    //*onDisconnecting function, triggers when the user leaves a room
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
