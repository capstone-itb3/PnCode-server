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
    files: {
        type: [Object],
        required: false,
        default: []
    },
    notes: {
        type: String,
        required: false,
        default: ''
    },
    owner_id: {
        type: String,
        required: true
    },
}, { timestamps : true, collection : 'solo-rooms' });

const roomSchema = new mongoose.Schema({
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
    files: {
        type: [Object],
        required: false,
        default: []
    },
    notes: {
        type: String,
        required: false,
        default: ''
    },
    group_id: {
        type: Object,
        required: true
    },
    assigned: {
        type: Object,
        required: false,
        default: {}
    },
    feedback: {
        type: [Object],
        required: false,
        default: []
    },
    chat: {
        type: [Object],
        required: false,
        default: []
    },
}, { timestamps : true, collection : 'rooms' });

const soloRoomModel = mongoose.model('solo-rooms', soloRoomSchema);
const roomModel = mongoose.model('rooms', roomSchema);

module.exports = { soloRoomModel, roomModel };