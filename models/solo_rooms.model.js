const mongoose = require('mongoose');

const soloRoomSchema = new mongoose.Schema({
    room_id: {
        type: String,
        required: true,
        unique: true
    },
    room_name: {
        type: String,
        required: true
    },
    room_type: {
        type: String,
        required: true
    },
    owner_id: {
        type: String,
        required: true
    },
    files: {
        type: [Object],
        required: false,
        default: [
            { file_id: 'html_file_solo',    name: 'index.html',   type: 'html',   content: '' },
            { file_id: 'css_file_solo',     name: 'style.css',    type: 'css',    content: '' },
            { file_id: 'js_file_solo',      name: 'script.js',    type: 'js',     content: '' },
        ]
    }
}, { timestamps : true, collection : 'solo-rooms' });

const soloRoomModel = mongoose.model('solo-rooms', soloRoomSchema);

module.exports = soloRoomModel;