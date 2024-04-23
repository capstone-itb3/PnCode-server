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
const userModel = require('./models/users.model');
const roomModel = require('./models/rooms.model');

//*PORT the server will use
const PORT = process.env.PORT || 5000;


//*Connects to the database
mongoose.connect(uri).then(() => {
    console.log('Connected to database.');

    //*Starts the server and listens to the PORT  
    app.listen = server.listen(PORT, () => {
        console.log(`Server is running on port:${PORT}`);    
    });

}).catch(() => {
    console.log('Error. Connection failed.')
});

app.use(cors());
app.use(express.json());

//*POST function when user registers
app.post('/api/register', async (req, res) => {
    try {
        if(await userModel.findOne({username: req.body.username})) {
            return res.json({status: 'invalid', error: 'Username is already used by another account.'});

        } else {
            await userModel.create({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                rooms: [],
                classes: [],
                teams: []
            });
            
            return res.json({ status: 'ok' });   
        } 
    } catch (e) {
        res.status(500).json({ status: 'error', error: 'Connection failed. Try again later.' });
    }
});

//*POST function when user logs in
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

//*POST function when user creates a room
app.post('/api/create-room', async (req, res) => {    
    try {
        let roomExists = true;

        let new_id = 123;
        while (roomExists) {
            new_id = uuid().toString();
            roomExists = await roomModel.findOne({
                room_id: new_id
            });
        }
    
        await roomModel.create({
            room_id: new_id,
            room_name: 'New-room',
            owner: req.body.username,
            joined: [],
            team: ''
        });

        await userModel.updateOne({username: req.body.username}, {
                $push: {rooms: new_id}
        })
        
        const user = await userModel.findOne({
            username: req.body.username,
        });
    
        const token = jwt.sign({
            username: user.username,
            email: user.email,
            password: user.password,
            rooms: user.rooms,
            teams: user.teams,
            classes: user.classes
    
        }, 'secret123capstoneprojectdonothackimportant0987654321');            
        
        return res.json({ status: 'ok', room_id: new_id, user: token });
    } catch (e) {
        res.status(500).json({ status: false, error: e});
    }
});

//*POST function to load rooms in dashboard
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

//*POST function to verify if joined room exists
app.post('/api/verify-room', async (req, res) => {
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
            code: room.code
         });
    } else {
        return res.json({ status: 'invalid', room_id: false });
    }
});

//*POST function to add user in room's joined members 
app.post('/api/add-joined', async (req, res) => {
    const room = await roomModel.findOne({ room_id: req.body.room_id });    
    
    if(room.joined.includes(req.body.username)) {
        
    } else if (room.owner != req.body.username) {
        try {
            await userModel.updateOne({username: req.body.username}, {
                $push: { rooms: req.body.room_id }
            });

            await roomModel.updateOne({ room_id: req.body.room_id }, {
                $push: { joined: req.body.username }
            });
            
            const user = await userModel.findOne({
                username: req.body.username,
            });
        
            const token = jwt.sign({
                username: user.username,
                email: user.email,
                password: user.password,
                rooms: user.rooms,
                teams: user.teams,
                classes: user.classes
        
            }, 'secret123capstoneprojectdonothackimportant0987654321');            
    
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






//! Socket.IO code, do not change anything beyond here unless necessary
//! Socket.IO code, do not change anything beyond here unless necessary
//! Socket.IO code, do not change anything beyond here unless necessary


//* map of users active in different rooms identified using socket 
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
         console.log(users);

         users.forEach(({ socketId }) => {
            io.to(socketId).emit('joined', {
                users,
                username,
                socketId: socket.id,
            });
        }); 
    });


    //*onUpdate function, triggers when code in the editor is being changed
    socket.on('update', ({ room_id, code }) => {
        socket.in(room_id).emit('update', {code});
        
        async function updateRoom () {
            await roomModel.updateOne({room_id: room_id}, {
                code: code
            });
        }
        updateRoom();
    });

    //*onSync function, triggers to sync the changing code with other users in the room
    socket.on('sync', ({ socketId, code }) => {
        io.to(socketId).emit('update', {code});
    });

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