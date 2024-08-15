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

//*Models
const studentModel = require('./models/students.model');
const professorModel = require('./models/professors.model');
const sectionModel = require('./models/sections.model');
const soloRoomModel = require('./models/solo_rooms.model');
const assignedRoomModel = require('./models/assigned_rooms.model');
const teamModel = require('./models/teams.model');
const roomGroupModel = require('./models/room_groups.model');

//*Routes
const accountRouter = require('./routes/account.routes');
const roomRouter = require('./routes/room.routes');
const teamRouter = require('./routes/team.routes');

//*Firebase connection
const firebaseApp = require('./firebase');
const { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = require('firebase/auth');

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
    console.log('Error. Connection failed.');
});

app.use(cors());
app.use(express.json());

app.use(accountRouter);
app.use(roomRouter);
app.use(teamRouter);


//*GET function to get section details
app.get('/api/section', async (req, res) => {
    const section = await studentModel.find({ section: req.query.section });
});


//*POST function to add user in room's joined members 
app.post('/api/add-joined', async (req, res) => {
    const room = await roomModel.findOne({ room_id: req.body.room_id });
    const joined =  { 
        email: req.body.auth.email,
        shortened_name: req.body.auth.last_name + ', ' + req.body.auth.first_name[0] + '.'
    }
    const alreadyJoined = room.joined.forEach(() => {
        let bool = false;

        return false;
    })
    if (room.joined.includes(joined)) {
        
    } else if (room.owner.email != req.body.auth.email) {
        try {
            await studentModel.updateOne({email: req.body.auth.email}, {
                $push: { rooms: req.body.room_id }
            });


            await roomModel.updateOne({ room_id: req.body.room_id }, {
                $push: { joined: joined }
            });
            
    
            return res.json({ status: 'ok', user: token });
        } catch (e) {
            return res.json({ status: false, error: e })
        }
    }
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
