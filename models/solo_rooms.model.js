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
    code: {
        type: String,
        required: false,
        default: ''
    }
}, { timestamps : true, collection : 'solo-rooms' });

const soloRoomModel = mongoose.model('solo-rooms', soloRoomSchema);

module.exports = soloRoomModel;