const express = require('express');
const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server);

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

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port:${PORT}`));