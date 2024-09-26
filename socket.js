const { v4: uuid } = require('uuid');
const random = require('lib0/random');

const studentModel = require('./models/students.model');
const professorModel = require('./models/professors.model');
const assignedRoomModel = require('./models/assigned_rooms.model');
const soloRoomModel = require('./models/solo_rooms.model');
const fileModel = require('./models/files.model');
const { tokenizeStudent, tokenizeProfessor } = require('./utils/tokenizer');
const { setContributionInfo, setMessageInfo, setFeedbackInfo } = require('./utils/setInfo');

const colors = [  
    { color: 'red',       light: '#ff000033' },
    { color: 'orange',    light: '#ffa50033' },
    { color: 'yellow',    light: '#ffff0033' },
    { color: 'green',     light: '#00800033' },
    { color: 'blue',      light: '#0000ff33' },
    { color: 'purple',    light: '#80008033' },
    { color: 'hotpink',   light: '#ff69b433' },
    { color: 'brown',     light: '#a52a2a33' },
    { color: 'teal',      light: '#00808033' },
    { color: 'aqua',      light: '#00ffff33' },
    { color: 'lime',      light: '#00ff0033' },
    { color: 'maroon',    light: '#80000033' },
    { color: 'coral',     light: '#ff7f5033' },
    { color: 'chocolate', light: '#d2691e33' },
];

function socketConnect(io) {
    let arrayRooms = [];
    let arrayEditors = [];

    function findRoom(room_id) {
        return arrayRooms.find(room => room.id === room_id);
    }

    function findEditor(editor_id) {
        return arrayEditors.find(editor => editor.id === editor_id);
    }

    function emitRoomUsers(room) {
        io.to(room.id).emit('room_users_updated', { users: room.users });

    }

    function emitEditorUsers(editor) {
        io.to(editor.id).emit('editor_users_updated', { users: editor.users });
    }

    io.on('connection', (socket) => {
        console.log('Socket.io connected.');

        socket.on('join_room', async ({ room_id, user_id, position }) => {
            try {
                let room = findRoom(room_id);
                if (!room) {
                    room = { id: room_id, users: [] };
                    arrayRooms.push(room);
                }
        
                socket.user_id = user_id;
                
                if (!room.users.find(user => user.user_id === user_id)) {
                    let cursor;

                    if (position === 'Student') {
                        do {
                            cursor = colors[random.uint32() % colors.length];
                        } while (room.users.find(user => user.cursor.color === cursor.color) && 
                                 room.users.length < colors.length);

                    } else if (position === 'Professor') {
                        cursor = { color: 'gray', light: '#80808033' };
                    }
        
                    room.users.push({ user_id, cursor });
                }
                
                socket.join(room_id);
                emitRoomUsers(room);
            } catch (e) {
                console.log('join_room Error: ' + e);
            }
        });
        
        socket.on('join_editor', async ({ file_id, user_id }) => {
            try {
                const editor_id = file_id;
        
                arrayEditors.forEach(editor => {
                    if (editor.id !== editor_id) {
                        socket.leave(editor.id);
                    }
                });
        
                arrayEditors = arrayEditors.map((editor) => ({
                    ...editor,
                    users: editor.users.filter(user => user.user_id !== user_id)
                }));
                
                if (!findEditor(editor_id)) {
                    arrayEditors.push({ id: editor_id, users: [] });
                }
        
                arrayEditors = arrayEditors.map(editor => {
                    if (editor.id === editor_id) {
                        editor.users.push({ user_id, line: 0 });
                    }
                    return editor;
                });
        
                socket.join(editor_id);
                emitEditorUsers(findEditor(editor_id));
        
            } catch (e) {
                console.log('join_editor Error' + e);
            }
        });
        
        socket.on('disconnecting', () => {
            try {
                const rooms = Array.from(socket.rooms);
        
                for (let id of rooms) {

                    if (findRoom(id)) {
                        const room = findRoom(id);
                        room.users = room.users.filter(user => user.user_id !== socket.user_id);

                        emitRoomUsers(room);
                        socket.leave(id);
                    }

                    const editor = findEditor(id);
                    if (editor) {
                        editor.users = editor.users.filter(user => user.user_id !== socket.user_id);

                        emitEditorUsers(editor);
                        socket.leave(id);
                    }
                }

                arrayRooms = arrayRooms.filter(room => room.users.length > 0);
                arrayEditors = arrayEditors.filter(editor => editor.users.length > 0);

            } catch (e) {
                console.log('disconnecting Error' + e);
            }
        });
                
        socket.on('find_file', async ({ room_id, file_id }) => {
            try {
                const file = await fileModel.findOne({ file_id, room_id }).lean();

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
                }, { new: true }).lean();


                if (file.content === code) {
                    socket.emit('update_result', {
                        status: 'ok',
                        message: 'Code updated successfully',
                    });
                    
                    if (store_history) {
                        const no_record = file.history.length === 0 && file.contributions.length !== 0;
                        
                        const same_record = !no_record ? 
                                            file.history[file.history.length - 1]?.content === code 
                                            : false;
                        const closer_timestamp = !no_record ? 
                                                 Date.now() - new Date(file.history[file.history.length - 1]?.createdAt) <= 300000 
                                                 : false;

                         if (no_record || (same_record || closer_timestamp) !== true) {

                            file = await fileModel.findOneAndUpdate({ file_id }, {
                                        $push: {
                                            history: { 
                                                content: code, 
                                                contributions: file.contributions
                                            }
                                        }
                                    }, { new: true }).lean();

                            io.in(file_id).emit('reupdate_history', {
                                status: 'ok'
                            });
                        }
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
                const file = await fileModel.findOne({ file_id }).lean();

                file.contributions = await Promise.all(file.contributions.map(setContributionInfo));                
                file.contributions.sort((a, b) => b.edit_count - a.edit_count);

                for (let his of file.history) {
                    his.contributions = await Promise.all(his.contributions.map(setContributionInfo));
                    his.contributions.sort((a, b) => b.edit_count - a.edit_count);
                }

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
                console.log(user_id)
                const file = await fileModel.findOne({ file_id }).lean();
                let updated_file = file;

                if (!file.contributions.find(contri => contri.uid === user_id)) {
                    updated_file = await fileModel.findOneAndUpdate({ file_id }, {
                        $push: {
                            contributions: { 
                                uid: user_id,
                                edit_count: 1
                            }
                        }
                    }, { new: true }).lean();
                    
                } else {
                    updated_file = await fileModel.findOneAndUpdate({ file_id, contributions: { 
                                                                        $elemMatch: { uid: user_id } 
                                                                    }}, { 
                        $inc: { "contributions.$[elem].edit_count": 1 } 

                    }, { arrayFilters: [{ "elem.uid": user_id }], new: true }
                    ).lean();       
                }

                updated_file.contributions = await Promise.all(updated_file.contributions.map(setContributionInfo));
                updated_file.contributions.sort((a, b) => b.edit_count - a.edit_count);
    
                io.to(file_id).emit('add_edit_count_result', {
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
                }
                
                const already_exists = await fileModel.findOne({ 
                    name: new_file.name,
                    room_id
                }).lean();

                if (already_exists) {
                    socket.emit('file_added', {
                        status: false,
                        file: null,
                        message: 'File already exists.'
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
                    message: 'Error adding file.'
                });
                console.log('Socket.io error:' + e);
            }            
        });

        socket.on('delete_file', async ({ file_id, room_id, user_id }) => {
            try {
                const editor = findEditor(file_id);
                console.log('editor', editor);

                if (editor && editor.users.length > 0) {
                    const hasUsersEditing = editor.users.length >= 2;
                    const onlyUserIsEditing = editor.users.length === 1 && editor.users.every(user => user.user_id === user_id);

                    console.log('hasUsersEditing', hasUsersEditing);
                    console.log('onlyUserIsEditing', onlyUserIsEditing);

                    if (hasUsersEditing || !onlyUserIsEditing) {
                        return socket.emit('file_deleted', {
                            status: false,
                            message: 'Removal denied. Another user is currently on the file.'
                        });
                    }
                }

                await fileModel.deleteOne({ file_id });
                        
                io.to(room_id).emit('file_deleted', {
                    status: 'ok',
                    file_id: file_id,
                    message: 'File deleted'
                });

            } catch (e) {
                socket.emit('file_deleted', {
                    status: false,
                    message: 'Error deleting file.'
                });

                console.log('delete_file Error:' + e);
            }
        });

        socket.on('save_notepad', async ({ room_id, content }) => {
            try {
                await assignedRoomModel.updateOne({room_id: room_id}, {
                    notes: content
                });
            } catch {
                console.error('Error saving notepad: ', err);
            }
        });
    
        socket.on('load_notepad', async ({ room_id }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id }).lean();

                socket.emit('notepad_loaded', {
                    notes: room.notes,
                });
                
            } catch (e) {
                console.log('load_notepad Error' + e);
            }
        });
        socket.on('load_messages', async ({ room_id }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id }).lean();

                room.chat = await Promise.all(room.chat.map(setMessageInfo));

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

        socket.on('load_feedback', async ({ room_id }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id }).lean();
                
                room.feedback = await Promise.all(room.feedback.map(setFeedbackInfo));
                room.feedback.sort((a, b) => b.createdAt - a.createdAt);

                socket.emit('feedback_loaded', {
                    feedback: room.feedback,
                });
            } catch (e) {
                console.log('load_feedback Error:' + e);
            }
        });

        socket.on('submit_feedback', async ({ room_id, user_id, new_feedback }) => {
            try {
                const user = await professorModel.findOne({ uid: user_id }).lean();
                if (!user) {
                    return socket.emit('submit_feedback_result', {
                        status: false,
                        action: null,
                        message: 'User not found.'
                    });
                }

                let feed = {
                    feedback_body: new_feedback,
                    professor_uid: user_id,
                    createdAt: Date.now(),
                };

                await assignedRoomModel.updateOne({ room_id }, {
                    $push: { 
                        feedback: feed
                    }
                });

                feed = await setFeedbackInfo(feed);

                io.to(room_id).emit('submit_feedback_result', {
                    status: 'ok',
                    action: 'add'
                });

            } catch (e) {
                console.log('submit_feedback Error:' + e);
            }
        });

        socket.on('delete_feedback', async ({ room_id, createdAt }) => {
            try {
                const res = await assignedRoomModel.findOneAndUpdate(
                    { room_id: room_id },
                    { $pull: { feedback: { createdAt: new Date(createdAt) } } }
                , { new: true }).lean();

                io.to(room_id).emit('submit_feedback_result', {
                    status: 'ok',
                    action: 'delete'
                });
            } catch (e) {
                console.log('delete_feedback Error:', e);
            }
        });

        socket.on('update_code_solo', async ({ room_id, file_id, content }) => {
            try {
                const result = await soloRoomModel.findOneAndUpdate(
                    { room_id: room_id, "files.file_id": file_id },
                    { $set: { "files.$.content": content } },
                    { new: true }
                );

                if (result) {
                    const updatedFile = result.files.find(file => file.file_id === file_id);
                    if (updatedFile && updatedFile.content === content) {
                        socket.emit('update_result_solo', {
                            status: 'ok',
                            message: 'Code updated successfully',
                        });
                    } else {
                        socket.emit('update_result_solo', {
                            status: false,
                            message: 'Code change not reflected in the database.',
                        });
                    }
                } else {
                    socket.emit('update_result_solo', {
                        status: false,
                        message: 'Room or file not found.',
                    });
                }
            } catch (e) {
                socket.emit('update_result_solo', {
                    status: false,
                    message: 'Error updating code: ' + e.message,
                });
                console.log('update_code_solo Error:', e);
            }
        });
    });
}

module.exports = socketConnect;