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
    { color: 'green',     light: '#00800033' },
    { color: 'blue',      light: '#0000ff33' },
    { color: 'purple',    light: '#80008033' },
    { color: 'hotpink',   light: '#ff69b433' },
    { color: 'brown',     light: '#a52a2a33' },
    { color: 'teal',      light: '#00808033' },
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

    function emitRoomUsers(room, action, first_name) {
        io.to(room.id).emit('room_users_updated', { 
            users: arrayRooms.find(r => r.id === room.id)?.users,
            message: first_name ? `${first_name} has ${action} the room.` : null,
        });
    }

    function emitEditorUsers(editor) {
        if (editor?.parent_room) {
            io.to(editor.parent_room).emit('editor_users_updated', {
                editors: arrayEditors.filter(e => e.parent_room === editor.parent_room)
            });
        }
    }

    io.on('connection', (socket) => {
        console.log(`Socket.io connected: ${socket.id}`);

        socket.emit('get_socket_id', {
            socket_id: socket.id
        });

        socket.on('join_room', async ({ room_id, user_id, first_name, last_name, position, cursorColor }) => {
            try {
                let room = findRoom(room_id);
                if (!room) {
                    arrayRooms.push({ 
                        id: room_id, 
                        users: [] 
                    });
                    room = findRoom(room_id);
                }
        
                const alreadyJoined = cursorColor || room.users.find(user => user.user_id === user_id)?.cursor;
                let new_cursor = {};
                
                if (!alreadyJoined) {
                    if (position === 'Student') {
                        do {
                            new_cursor = colors[random.uint32() % colors.length];
                        } while (room.users.some(user => user.cursor.color === new_cursor.color)
                                 && room.users.length < colors.length);

                    } else {
                        new_cursor = { color: 'gray', light: '#80808033' };
                    }
                }

                room.users.push({
                    socket_id: socket.id,
                    user_id,
                    first_name,
                    last_name,
                    cursor: alreadyJoined || new_cursor,
                    position
                });

                socket.join(room_id);
                emitRoomUsers(room, 'joined', first_name);
            } catch (e) {
                console.error('join_room Error: ' + e);
            }
        });
        
        socket.on('join_editor', async ({ room_id, file_id, user_id }) => {
            try {
                let editor = findEditor(file_id);
                if (!editor) {
                    arrayEditors.push({
                        id: file_id, 
                        parent_room: room_id,
                        users: []
                    });
                    editor = findEditor(file_id);
                }

                if (!editor.users.find(user => user.socket_id === socket.id)) {
                    editor.users.push({
                        socket_id: socket.id,
                        user_id,
                    });
                }

                emitEditorUsers(editor);
            } catch (e) {
                console.error('join_editor Error: ' + e);
            }
        });

        socket.on('leave_editor', async ({ file_id }) => {
            try {
                const editor = findEditor(file_id);
                if (editor) {
                    editor.users = editor.users.filter(user => user.socket_id !== socket.id);
                }

                //array editors cleanup
                arrayEditors = arrayEditors.filter(editor => editor.users.length > 0);

                emitEditorUsers(editor);
            } catch (e) {
                console.error('leave_editor Error: ' + e);
            }
        });

        socket.on('disconnecting', () => {
            try {
                const room = arrayRooms.find(r => r.users.find(user => user.socket_id === socket.id));
                
                if (room) {
                    const disconnector = room.users.find(user => user.socket_id === socket.id);
                    room.users = room.users.filter(user => user.socket_id !== socket.id);

                    socket.leave(room.id);
                    emitRoomUsers(room, 'left', disconnector?.first_name);
                }
                //array rooms cleanup
                arrayRooms = arrayRooms.filter(room => room.users.length > 0);

                const editor = arrayEditors.find(e => e.users.find(user => user.socket_id === socket.id));
                if (editor) {
                    editor.users = editor.users.filter(user => user.socket_id !== socket.id);
                    emitEditorUsers(editor);
                }
                //array editors cleanup
                arrayEditors = arrayEditors.filter(editor => editor.users.length > 0);
            } catch (e) {
                console.error('disconnecting Error' + e);
            }
        });
                
        socket.on('find_file', async ({ room_id, file_id }) => {
            try {
                const file = await fileModel.findOne({ file_id, room_id }).lean();

                socket.emit('found_file', {
                    file
                });
            } catch (e) {
                console.error('find_file Error:' + e);
            }
        })

        socket.on('update_code', async ({file_id, code, store_history}) => {
            try {
                let file = await fileModel.findOneAndUpdate({ file_id },{ 
                    $set: { content: code  } }, { new: true })
                    .select('content room_id history contributions')
                    .lean();

                if (file && file.content === code) {
                    socket.emit('update_result', {
                        status: 'ok',
                        message: 'Code updated successfully',
                    });
                    
                    if (store_history) {
                        const no_history_record = hasNoHistoryRecord(file.history.length);
                        const no_contributions = hasNoContributions(file.contributions.length);
                        const same_record = hasSameRecord(file.history[0]?.content, code);
                        const closer_timestamp = hasCloserTimestamp(file.history[0]?.createdAt);
                        let can_store = false;

                        if (no_history_record && !no_contributions) {
                            if (!same_record && !closer_timestamp) {
                                can_store = true;
                            }

                        } else if (!no_history_record) {
                            if (!same_record && !closer_timestamp) {
                                can_store = true;
                            }                            
                        }
                        
                        if (can_store) {                            
                            const new_history = {
                                content: code,
                                contributions: file.contributions,
                                createdAt: Date.now()
                            }

                            await fileModel.updateOne({ file_id }, {
                                $push: { history: { $each: [new_history], $position: 0 } },
                            });

                            new_history.contributions = await setContributionInfo(new_history.contributions);

                            io.to(file.room_id).emit('reupdate_history', {
                                status: 'ok',
                                file_id,
                                new_history,
                                message: 'History updated successfully'
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
                    message: 'Error updating code: ' + e.message
                });
                console.error('update_code Error:' + e);
            }
        });

        socket.on('update_code_admin', async ({file_id, code}) => {
            try {
                let file = await fileModel.findOneAndUpdate({ file_id },{ 
                    $set: { content: code  } }, { new: true })
                    .select('content')
                    .lean();

                if (file.content === code) {
                    socket.emit('update_result', {
                        status: 'ok',
                        message: 'Code updated successfully',
                    });
                }                
            } catch (e) {
                socket.emit('update_result', {
                    status: false,
                    message: 'Error updating code: ' + e.message
                });
                console.error('update_code Error:' + e);
            }
        });

        socket.on('get_history', async ({ file_id }) => {
            try {
                const file = await fileModel.findOne({ file_id })
                             .select('history contributions')
                             .lean();

                file.history.sort((a, b) => a.createdAt - b.createdAt);
                file.contributions = await setContributionInfo(file.contributions);                
                file.contributions.sort((a, b) => b.edit_count - a.edit_count);

                file.history = await Promise.all(file.history.map(setHistoryInfo));
                async function setHistoryInfo(his) { 
                    his.contributions = await setContributionInfo(his.contributions);
                    his.contributions.sort((a, b) => b.edit_count - a.edit_count);
                    
                    return his;
                }

                for (let i = 1; i < file.history.length; i++) { 
                    file.history[i].contributions = file.history[i].contributions.map(cont => {
                        const last_rec = file.history[i - 1].contributions.find(c => c.uid === cont.uid);
                
                        if (!last_rec) {
                            return cont;
                        }
                
                        const diff = cont.edit_count - last_rec.edit_count;
                
                        return { ...cont, diff };
                    });
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
                    message: 'Error getting history: ' + e.mesage
                });
                console.log('get_history Error:' + e);
            }
        })

        socket.on('add_edit_count', async ({ room_id, file_id, user_id, first_name, last_name }) => {
            try {
                const file = await fileModel.findOne({ file_id })
                             .select('contributions')
                             .lean();
                let updated_file = file;

                if (!file.contributions.find(contri => contri.uid === user_id)) {
                    updated_file = await fileModel.findOneAndUpdate({ file_id }, {
                        $push: {
                            contributions: { 
                                uid: user_id,
                                edit_count: 1
                            }
                        }
                    }, { new: true })
                    .select('contributions')
                    .lean();
                    
                } else {
                    updated_file = await fileModel.findOneAndUpdate({ 
                        file_id, contributions: { 
                        $elemMatch: { uid: user_id } 
                    }}, { 
                        $inc: { "contributions.$[elem].edit_count": 1 } 
                    }, {
                        arrayFilters: [{ "elem.uid": user_id }], new: true 
                    })
                    .select('contributions')
                    .lean();       
                }

                io.to(room_id).emit('add_edit_count_result', {
                    file_id,
                    user_id,
                    first_name,
                    last_name,
                });
                
            } catch (e) {
                console.error('add_edit_count Error' + e);
            }
        });
        
        socket.on('add_file', async ({ room_id, file_name, file_type }) => {
            try {
                const regex = /[\/=\&]/;

                if (regex.test(file_name)) {
                    return socket.emit('file_added', {
                        status: false,
                        file: null,
                        message: 'File name cannot have "/", "=", or "&".'
                    });
                }

                const new_file = {
                    file_id: uuid().toString(),
                    name: `${file_name}.${file_type}`,
                    type: file_type,
                    room_id: room_id,
                    content: '',
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
                console.error('add_file Error:' + e);
            }            
        });

        socket.on('delete_file', async ({ file_id, room_id }) => {
            try {
                const editor = arrayEditors.find(edt => edt.id === file_id);

                if (editor && editor.users.length > 0) {
                    const hasUsersEditing = editor.users.length >= 2;
                    const onlyUserIsEditing = editor.users.length === 1 && editor.users.every(user => user.socket_id === socket.id);

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

                console.error('delete_file Error:' + e);
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
                console.error('load_notepad Error' + e);
            }
        });
        socket.on('load_messages', async ({ room_id }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id }).lean();

                room.chat = await setMessageInfo(room.chat);

                socket.emit('messages_loaded', { 
                    chat_data: room.chat 
                });

            } catch (e) {
                console.error('load_messages Error:' + e);
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
                console.error('send_message Error:' + e);
            }
        });

        socket.on('delete_message', async ({ room_id, createdAt }) => {
            try {
                await assignedRoomModel.updateOne({room_id: room_id}, {
                    $pull: { chat: { createdAt: new Date(createdAt) } }
                });

                io.in(room_id).emit('message_deleted', { 
                    createdAt 
                });
            } catch (e) {
                console.error('delete_message Error:' + e);
            }
        })

        socket.on('load_feedback', async ({ room_id }) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id })
                             .select('feedback')
                             .lean();
                
                room.feedback = await setFeedbackInfo(room.feedback);                
                room.feedback.sort((a, b) => b.createdAt - a.createdAt);
                 
                socket.emit('feedback_loaded', {
                    feedback: room.feedback,
                });

            } catch (e) {
                console.error('load_feedback Error:' + e);
            }
        });

        socket.on('submit_feedback', async ({ room_id, user_id, first_name, last_name, new_feedback }) => {
            try {
                const createdAt = Date.now();
                const feed = {
                    feedback_id: parseInt(createdAt).toString(),
                    feedback_body: new_feedback,
                    professor_uid: user_id,
                    createdAt: createdAt,
                    reacts: []
                };

                await assignedRoomModel.updateOne({ room_id }, {
                    $push: { 
                        feedback: { $each: [feed], $position: 0 }
                    }
                });

                feed.first_name = first_name;
                feed.last_name = last_name;

                io.to(room_id).emit('submit_feedback_result', {
                    new_feedback: feed
                });

            } catch (e) {
                console.error('submit_feedback Error:' + e);
            }
        });

        socket.on('react_to_feedback', async ({ room_id, feedback_id, react, action}) => {
            try {
                const room = await assignedRoomModel.findOne({ room_id: room_id, 'feedback.feedback_id': feedback_id })
                             .select('feedback')
                             .lean();
                const feed = room.feedback.find(feed => feed.feedback_id === feedback_id);

                if (!feed) {
                    return;
                }

                if (!feed.reacts.includes(react.uid) && action === 'heart') {
                    await assignedRoomModel.updateOne({ room_id, 'feedback.feedback_id': feedback_id }, {
                        $push: { 'feedback.$.reacts': react.uid }
                    });
                } else if (feed.reacts.includes(react.uid) && action === 'unheart') {
                    await assignedRoomModel.updateOne({ room_id, 'feedback.feedback_id': feedback_id }, {
                        $pull: { 'feedback.$.reacts': react.uid }
                    });
                }

                io.to(room_id).emit('new_feedback_react', {
                    feedback_id,
                    react,
                    socket_id: socket.id,
                    action,
                });
            } catch (e) {
                console.error('react_to_feedback Error:' + e);
            }
        });

        socket.on('delete_feedback', async ({ room_id, feedback_id }) => {
            try {
                await assignedRoomModel.findOneAndUpdate({ room_id: room_id }, { 
                    $pull: { feedback: { feedback_id } } 
                });

                io.to(room_id).emit('delete_feedback_result', {
                    feedback_id
                });
            } catch (e) {
                console.error('delete_feedback Error:', e);
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
                console.error('update_code_solo Error:', e);
            }
        });

        socket.on('share_log', async ({ room_id, log, name }) => {
            try {
                log.logger = name;
    
                return socket.to(room_id).emit('add_shared_log', {
                    new_log: log,
                    socket_id: socket.id
                });
            } catch (e) {
                console.error('share_log Error:', e);
            }
        })
    });
}

function hasNoHistoryRecord(history_length) {
    return history_length === 0;
}
function hasNoContributions(contributions_length) {
    return contributions_length === 0;
}
function hasSameRecord(prev_code, new_code) {
   return prev_code === new_code;
}
function hasCloserTimestamp(latest_created) {
    return Date.now() - new Date(latest_created) <= 300000;
}



module.exports = socketConnect;