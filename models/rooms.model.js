const mongoose = require('mongoose');

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
    owner: {
        type: String,
        required: true
    },
    joined: {
        type: [String],
        required: false,
        default: []
    },
    team: {
        type: String,
        required: false
    },
    code: {
        type: Object,
        required: false,
        default: ''
    }

}, { timestamps : true, collection : 'rooms' });

const roomModel = mongoose.model('rooms', roomSchema);

module.exports = roomModel;