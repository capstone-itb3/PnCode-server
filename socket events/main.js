const { v4: uuid } = require('uuid');
const assignedRoomModel = require('../models/assigned_rooms.model');

function socketConnect (io) {

const mapRooms = new Map();
const mapEditors = new Map();

function emitRoomUsers (room) {
    io.to(room).emit('room_users_updated', 
        Array.from(mapRooms.get(room))
    );
}

function emitEditorUsers (editor) {
    io.to(editor).emit('editor_users_updated', 
        Array.from(mapEditors.get(editor))
    );    
}

io.on('connection', (socket) => {
    console.log('Socket.io connected.');

    socket.on('join_room', ({ room_id, user_id }) => {
        if (!mapRooms.has(room_id)) {
            mapRooms.set(room_id, new Set());
        } 
        socket.user_id = user_id;
        socket.join(room_id);

        mapRooms.get(room_id).add(user_id);
        emitRoomUsers(room_id);
    });

    let currentEditor = null;

    socket.on('join_editor', ({ room_id, file_name, user_id }) => {
        const editor_id = `${room_id}-${file_name}`;

        if (currentEditor) {
            mapEditors.get(currentEditor).delete(user_id);
            socket.leave(currentEditor);
            emitEditorUsers(currentEditor);
        }

        if (!mapEditors.has(editor_id)) {
            mapEditors.set(editor_id, new Set());            
        }
        socket.join(editor_id);

        mapEditors.get(editor_id).add(user_id);
        currentEditor = editor_id;

        emitEditorUsers(editor_id);
    })

    socket.on('disconnecting', () => {
        const rooms = Array.from(socket.rooms);

        for (let room of rooms) {
            if (mapRooms.has(room)) {
                mapRooms.get(room).delete(socket.user_id);
                emitRoomUsers(room);
            }

            if (mapEditors.has(room)) {
                mapEditors.get(room).delete(socket.user_id);
                emitEditorUsers(room);
            }
        }
    })

    socket.on('find_content', async ({ room_id, file_name }) => {
        try {
            const room = await assignedRoomModel.findOne({ room_id: room_id });
            const file = room.files.find(file => file.name === file_name);

            console.log(file);
            socket.emit('found_content', {
                file
            });
        } catch (e) {
            console.log('Socket.io error:' + e);
        }
    })

    socket.on('add_file', async ({ room_id, file_name, file_type }) => {
        try {
            const new_file = {
                name: `${file_name}.${file_type}`,
                type: file_type,
                content: '',
            }

            await assignedRoomModel.updateOne({ room_id: room_id }, {
                $push: {
                    files: new_file
                }
            });

            socket.in(room_id).emit('file_added', {
                file: new_file
            }); 
        } catch (e) {
            console.log('Socket.io error:' + e);
        }            
    })

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

});

}

module.exports = socketConnect;