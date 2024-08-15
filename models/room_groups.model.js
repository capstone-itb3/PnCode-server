const mongoose = require('mongoose');

const roomGroupSchema = new mongoose.Schema({
    group_id: {
        type: String,
        required: true,
        unique: true
    },
    group_name: {
        type: String,
        required: true
    },
    course_code: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
    rooms: {
        type: [String],
        required: false,
        default: []
    },
    instructions: {
        type: String,
        required: false
    },
    open_time: {
        type: Date,
        required: false,
        default: null
    },
    close_time: {
        type: Date,
        required: false,
        default: null
    },
}, { timestamps: true, collection: 'room-groups' });

const roomGroupModel = mongoose.model('room-groups', roomGroupSchema);

module.exports = roomGroupModel;