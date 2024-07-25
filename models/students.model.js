const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    student_id: {
        type: String,
        required: true,
        unique: true,
        length: 7
    },
    first_name: {
        type: String,
        required: true,
    },
    last_name: {
        type: String,
        required: true,
    },
    password: {
        type: String,
        required: true, 
        minlength: 8
    },
    position: {
        type: String,
        required: true, 
    },
    section: {
        type: Array,
        required: true, 
    },
    solo_rooms: {
        type: [String],
        required: false,
        default: [],
    },
    assigned_rooms: {
        type: [String],
        required: false,
        default: [],
    },
    teams: {
        type: [String],
        required: false,
        default: [],
    },
    preferences: {
        type: Object,
        required: false,
        default: {}
    },
}, { timestamps: true, collection: 'students' });

const studentModel = mongoose.model('students', studentSchema);

module.exports = studentModel;