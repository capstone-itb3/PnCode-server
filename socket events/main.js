const { v4: uuid } = require('uuid');
const random = require('lib0/random');

const assignedRoomModel = require('../models/assigned_rooms.model');

const colors = [  
    { color: 'red',       light: '#ff000033' },
    { color: 'orange',    light: '#ffa50033' },
    { color: 'yellow',    light: '#ffff0033' },
    { color: 'green',     light: '#00800033' },
    { color: 'blue',      light: '#0000ff33' },
    { color: 'purple',    light: '#80008033' },
    { color: 'pink',      light: '#ffc0cb33' },
    { color: 'brown',     light: '#a52a2a33' },
    { color: 'silver',    light: '#c0c0c033' },
    { color: 'aqua',      light: '#00ffff33' },
    { color: 'lime',      light: '#00ff0033' },
    { color: 'maroon',    light: '#80000033' },
    { color: 'coral',     light: '#ff7f5033' },
    { color: 'chocolate', light: '#d2691e33' },
  ];

  function socketConnect(io) {
    const arrayRooms = [];
    const arrayEditors = [];

    function findRoom(roomId) {
        return arrayRooms.find(room => room.id === roomId);
    }

    function findEditor(editorId) {
        return arrayEditors.find(editor => editor.id === editorId);
    }

    function emitRoomUsers(room) {
        io.to(room.id).emit('room_users_updated', room.users);
    }

    function emitEditorUsers(editor) {
        io.to(editor.id).emit('editor_users_updated', editor.users);
    }

    io.on('connection', (socket) => {
        console.log('Socket.io connected.');

        socket.on('join_room', ({ room_id, user_id }) => {
            try {
                let room = findRoom(room_id);
                if (!room) {
                    room = { id: room_id, users: [] };
                    arrayRooms.push(room);
                }
                socket.user_id = user_id;
                socket.join(room_id);

                if (!room.users.find(user => user.user_id === user_id)) {
                    let cursor;
                    do {
                        cursor = colors[random.uint32() % colors.length];
                    } while (room.users.find(user => user.cursor.color === cursor.color));

                    room.users.push({ user_id, cursor });
                }
                emitRoomUsers(room);
            } catch (e) {
                console.log('join_room Error' + e);
            }
        });

        let currentEditor = null;

        socket.on('join_editor', ({ room_id, file_name, user_id }) => {
            try {
                const editor_id = `${room_id}-${file_name}`;

                if (currentEditor) {
                    const oldEditor = findEditor(currentEditor);
                    if (oldEditor) {
                        oldEditor.users = oldEditor.users.filter(user => user.user_id !== socket.user_id);
                        socket.leave(currentEditor);
                        emitEditorUsers(oldEditor);
                    }
                }

                let editor = findEditor(editor_id);
                if (!editor) {
                    editor = { id: editor_id, users: [] };
                    arrayEditors.push(editor);
                }
                socket.join(editor_id);

                editor.users.push({ user_id, line: 0 });
                currentEditor = editor_id;

                emitEditorUsers(editor);
            } catch (e) {
                console.log('join_editor Error' + e);
            }
        });

        socket.on('disconnecting', () => {
            try {
                const rooms = Array.from(socket.rooms);

                for (let roomId of rooms) {
                    const room = findRoom(roomId);
                    if (room) {
                        room.users = room.users.filter(user => user.user_id !== socket.user_id);
                        emitRoomUsers(room);
                    }
                    const editor = findEditor(roomId);
                    if (editor) {
                        editor.users = editor.users.filter(user => user.user_id !== socket.user_id);
                        emitEditorUsers(editor);
                    }
                }
            } catch (e) {
                console.log('disconnecting Error' + e);
            }
        });

        socket.on('find_content', async ({ room_id, file_name }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id });
                const file = room.files.find(file => file.name === file_name);

                socket.emit('found_content', {
                    file
                });
            } catch (e) {
                console.log('Socket.io error:' + e);
            }
        })

        socket.on('update_code', async ({room_id, file_name, code}) => {
            try {
                const room = await assignedRoomModel.findOneAndUpdate({ room_id: room_id, "files.name": file_name }, { 
                    $set: {
                            "files.$.content": code
                        }
                    }, { new: true });
                
            } catch (e) {
                console.log('Socket.io connection error.');
            }
        })

        socket.on('send_line_number', async ({ room_id, file_name, user_id, line }) => {
            try {
                const editor_id = `${room_id}-${file_name}`;
                const editor = findEditor(editor_id);

                if (editor) {
                    editor.users = editor.users.map(user => 
                        user.user_id === user_id ? { ...user, line } : user
                    );
                    socket.to(editor_id).emit('toggle_line_access', {
                        users: editor.users
                    });
                }
            } catch (e) {
                console.log('send_line_number Error' + e);
            }
        });
        
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

                io.to(room_id).emit('file_added', {
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