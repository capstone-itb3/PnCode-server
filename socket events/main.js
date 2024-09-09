const { v4: uuid } = require('uuid');
const random = require('lib0/random');

const studentModel = require('../models/students.model');
const assignedRoomModel = require('../models/assigned_rooms.model');
const fileModel = require('../models/files.model');

const colors = [  
    { color: 'red',       light: '#ff000033' },
    { color: 'orange',    light: '#ffa50033' },
    { color: 'yellow',    light: '#ffff0033' },
    { color: 'green',     light: '#00800033' },
    { color: 'blue',      light: '#0000ff33' },
    { color: 'purple',    light: '#80008033' },
    { color: 'pink',      light: '#ffc0cb33' },
    { color: 'brown',     light: '#a52a2a33' },
    { color: 'gray',      light: '#80808033' },
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

        socket.on('join_room', async ({ room_id, user_id }) => {
            try {
                let room = findRoom(room_id);
                if (!room) {
                    room = { id: room_id, users: [] };
                    arrayRooms.push(room);
                }
                socket.user_id = user_id;
                
                if (!room.users.find(user => user.user_id === user_id)) {
                    socket.join(room_id);

                    let cursor;
                    do {
                        cursor = colors[random.uint32() % colors.length];
                    } while (room.users.find(user => user.cursor.color === cursor.color) 
                             && room.users.length <= colors.length);

                    room.users.push({ user_id, cursor });
                }
                emitRoomUsers(room);
            } catch (e) {
                console.log('join_room Error' + e);
            }
        });

        let currentEditor = null;

        socket.on('join_editor', async ({ file_id, user_id }) => {
            try {
                const editor_id = file_id;

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

        socket.on('find_file', async ({ room_id, file_id }) => {
            try {
                const file = await fileModel.findOne({ file_id, room_id });

                socket.emit('found_file', {
                    file
                });
            } catch (e) {
                console.log('Socket.io error:' + e);
            }
        })

        socket.on('update_code', async ({file_id, user_id, code, line, store_history}) => {
            try {
                let file = await fileModel.findOneAndUpdate({ file_id },{ 
                    $set: { content: code  } 
                }, { new: true });

                if (file.content === code) {
                    socket.emit('update_result', {
                        status: 'ok',
                        message: 'Code updated successfully',
                    });
                    
                    if (store_history) {
                        const no_record = file.history.length === 0;
                        
                        const same_record = !no_record ? 
                                            file.history[file.history.length - 1]?.content === code 
                                            : false;
                        const closer_timestamp = !no_record ? 
                                                 Date.now() - new Date(file.history[file.history.length - 1]?.createdAt) <= 360000 
                                                 : false;

                         if (no_record || (same_record || closer_timestamp) !== true) {
                            file = await fileModel.findOneAndUpdate({ file_id }, {
                                $push: {
                                    history: { content: code, contributions: file.contributions }
                                }
                            }, { new: true });
                        }
                        console.log(no_record);
                        console.log(same_record);
                        console.log(closer_timestamp);

                        io.in(file_id).emit('reupdate_history', {
                            history: file.history,
                            contributions: file.contributions
                        });
                    }
                } else {
                    socket.emit('update_result', {
                        status: false,
                        message: 'Error updating code',
                    });
                }
                
            } catch (e) {
                socket.emit('update_result', {
                    status: false,
                    message: 'Error updating code: ' + e
                });
                console.log('update_code Error:' + e);
            }
        });

        socket.on('get_history', async ({ file_id }) => {
            try {
                const file = await fileModel.findOne({ file_id });

                socket.emit('get_history_result', {
                    status: 'ok',
                    history: file.history,
                    contributions: file.contributions,
                    message: 'History retrieved successfully'
                });
            } catch (e) {
                socket.emit('get_history_result', {
                    status: false,
                    message: 'Error getting history: ' + e
                });
            }
        })

        socket.on('add_edit_count', async ({ file_id, user_id }) => {
            try {
                const file = await fileModel.findOne({ file_id });
                let updated_file = '';

                if (!file.contributions.find(contri => contri.uid === user_id)) {
                    updated_file = await fileModel.findOneAndUpdate({ file_id }, {
                        $push: {
                            contributions: { 
                                uid: user_id,
                                edit_count: 1
                            }
                        }
                    });
                } else {
                    updated_file = await fileModel.findOneAndUpdate({ file_id, 'contributions.uid': user_id }, {
                        $inc: {
                            'contributions.$.edit_count': 1
                        }
                    });
                }

                socket.emit('add_edit_count_result', {
                    contributions: updated_file.contributions,
                });
                
            } catch (e) {
                console.log('add_edit_count Error' + e);
            }
        });

        socket.on('send_line_number', async ({ room_id, file_name, user_id, line }) => {
            try {
                // const editor_id = `${room_id}-${file_name}`;
                // const editor = findEditor(editor_id);

                // if (editor) {
                //     editor.users = editor.users.map(user => 
                //         user.user_id === user_id ? { ...user, line } : user
                //     );
                //     socket.to(editor_id).emit('toggle_line_access', {
                //         users: editor.users
                //     });
                // }
            } catch (e) {
                console.log('send_line_number Error' + e);
            }
        });
        
        socket.on('add_file', async ({ room_id, file_name, file_type }) => {
            try {
                let content = ''
                if (file_type === 'html') {
                    content = '<!DOCTYPE html>'
                            + '\n<html lang="en">'
                            + '\n<head>'
                            + '\n<meta charset="UTF-8" />'
                            + '\n<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
                            + '\n<title></title>'
                            + '\n</head>'
                            + '\n<body>'
                            + '\n</body>'
                            + '\n</html>';
                }
                
                const new_file = {
                    file_id: uuid().toString(),
                    name: `${file_name}.${file_type}`,
                    type: file_type,
                    room_id: room_id,
                    content: content,
                    history: []
                }
                
                const already_exists = await fileModel.findOne({ 
                    name: new_file.name,
                    room_id
                });

                if (already_exists) {
                    socket.emit('file_added', {
                        status: false,
                        file: null,
                        message: 'Duplicate'
                    });

                } else {
                    await fileModel.create(new_file);

                    io.to(room_id).emit('file_added', {
                        status: 'ok',
                        file: new_file,
                        message: 'File added'

                    }); 
                }
            } catch (e) {
                socket.emit('file_added', {
                    status: false,
                    file: null,
                    message: 'Error'
                });
                console.log('Socket.io error:' + e);
            }            
        })

        socket.on('save_notepad', async (data) => {
            try {
                await assignedRoomModel.updateOne({room_id: data.room_id}, {
                    notes: data.content
                });
                
            } catch {
                console.error('Error saving notepad: ', err);
            }
        })

        socket.on('load_messages', async ({ room_id }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id }).lean();

                room.chat = await Promise.all(room.chat.map(setInfo));
                async function setInfo(msg) {
                    const user = await studentModel.findOne({ uid: msg.sender_uid });

                    return {
                        sender_uid: user.uid,
                        first_name: user.first_name,
                        last_name: user.last_name,
                        chat_body: msg.chat_body,
                        createdAt: msg.createdAt
                    };
                }

                socket.emit('messages_loaded', { 
                    chat_data: room.chat 
                });

            } catch (e) {
                console.log('load_messages Error:' + e);
            }
        });

        socket.on('send_message', async ({ user_id, first_name, last_name, room_id, message }) => {
            try {

                const new_message = {
                    sender_uid: user_id,
                    chat_body: message,
                    createdAt: new Date()
                }

                await assignedRoomModel.updateOne({room_id: room_id}, {
                    $push: { chat: new_message }
                });

                new_message.first_name = first_name;
                new_message.last_name = last_name;

                io.in(room_id).emit('update_messages', { new_message });
            
            } catch (e) {
                console.log('send_message Error:' + e);
            }
        });
    });
}

module.exports = socketConnect;