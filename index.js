//*Express module imports
const express = require('express');
const app = express();
const http = require('http');

//*MongoDB module imports
const mongoose = require('mongoose');
const cors = require('cors');
const { uri }  = require('./database');

//*Socket.io module imports
const { Server } = require('socket.io');
const server = http.createServer(app);

//*Websocket module imports
const WebSocket = require('ws');

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
const activityModel = require('./models/activities.model');

//*Routes
const accountRouter = require('./routes/account.routes');
const roomRouter = require('./routes/room.routes');
const teamRouter = require('./routes/team.routes');
const activityRouter = require('./routes/activity.routes');

//*Firebase connection
const firebaseApp = require('./firebase');
const { getAuth, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');
const db = getFirestore(firebaseApp);


//*PORT the server will use
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use(accountRouter);
app.use(roomRouter);
app.use(teamRouter);
app.use(activityRouter);

const io = new Server(server, {
    cors: {
        origin: "https://codlin-client.onrender.com",
        methods: ["GET", "POST"]
    }
});

const wss = new WebSocket.Server({ server });

//*Connects to the database
mongoose.connect(uri)
.then(() => {
    console.log('Connected to database.');
    
    server.listen(PORT, () => {
        console.log(`Server is running on port:${PORT}`);
    });
    
    wss.on('connection', (ws) => {
        console.log('New WebSocket connection');
    
        ws.on('message', (message) => {
            // Forward the message to all clients without parsing
            wss.clients.forEach((client) => {
                if (client !== ws && client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        });
    
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
    
        ws.on('close', () => {
            console.log('WebSocket connection closed');
        });
    });
                
    io.on('connection', (socket) => {
        console.log('Socket.io connected.');

        socket.on('join', (room_id) => {
            socket.join(room_id);
            console.log('User joined room: ' + room_id);
        });
        
        socket.on('code_change', async (data) => {
            socket.to(data.room_id).emit('code_change', data.code);
            try {
                await soloRoomModel.updateOne({room_id: data.room_id}, {
                    code: data.code
                });
                console.log(data.code);                    
            } catch (err) {
                console.log(err);
            }
        });

        socket.on('save_notepad', async (data) => {
            try {
                await assignedRoomModel.updateOne({room_id: data.room_id}, {
                    notes: data.content
                });
                
                console.log(data.content);
            } catch {
                console.error('Error saving notepad: ', err);
            }
        })

        socket.on('disconnect', () => {
            console.log('Socket.io disconnected.');
        });
    });
})
.catch((err) => {
    console.log('Error. Connection failed.', err);
});

app.get('/api/get-course-professor' , async (req, res) => {
    try {
        const professor = await professorModel.findOne({
            assigned_courses : {
                $elemMatch: {
                    course_code: req.query.course_code,
                    sections: req.query.section
                }
            }
        });

        res.status(200).json({  status: 'ok',
                                name: professor ? `${professor.first_name} ${professor.last_name}` : 'TBA',
                                message: 'Successfully retrieved professor name.' });
    } catch (e) {
        console.log(e);
        res.status(500).json({  status: false, 
                                message: 'Internal Server Error' });
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

// //! Socket.IO code, do not change anything beyond here unless necessary
// //! Socket.IO code, do not change anything beyond here unless necessary


// // * map of users active in different rooms identified using socket 
// const userSocketMap = {};

// //* array of users connected per socket
// const getAllConnectedUsers = (room_id) => {
//     return Array.from(io.sockets.adapter.rooms.get(room_id) || []).map(
//         (socketId) => {
//             return {
//                 socketId,
//                 username: userSocketMap[socketId]
//             };
//         }
//     );
// };


// //* starts socket.io, every real-time connection happens here
// io.on('connection', (socket) =>  {
//     console.log(`User connected: ${socket.id}`);

//     //*onJoin function, triggers when user/s join the room
//     socket.on('join', ({ room_id, username }) => {
//          userSocketMap[socket.id] = username;
//          socket.join(room_id);
//          const users = getAllConnectedUsers(room_id);

//          users.forEach(({ socketId }) => {
//             io.to(socketId).emit('joined', {
//                 users,
//                 username,
//                 socketId: socket.id,
//             });
//         }); 
//     });


//     //*onUpdate function, triggers when code in the editor is being changed
//     socket.on('update', ({ room_id, code, socketId }) => {        
//         async function updateRoom () {
//             await roomModel.updateOne({room_id: room_id}, {
//                 code: code
//             });
//         }
//         updateRoom();
//         console.log('get');

//         io.to(socketId).emit('sync', { code });
//     });

//     // //*onSync function, triggers to sync the changing code with other users in the room
//     // socket.on('sync', ({ socketId, code }) => {
//     // });

//     //*onDisconnecting function, triggers when the user leaves a room
//     socket.on('disconnecting', () => {
//         const rooms = [...socket.rooms];
//         rooms.forEach ((room_id) => {
//             socket.in(room_id).emit('disconnected', {
//                 socketId: socket.id,
//                 username: userSocketMap[socket.id],
//             });
//         });
//         delete userSocketMap[socket.id];
//         socket.leave;
//     });

// });
