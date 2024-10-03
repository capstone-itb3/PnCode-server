const mongoose = require('mongoose');

const classesSchema = new mongoose.Schema({
    class_id: {
        type: String,
        required: true,
        unique: true
    },
    course_code: {
        type: String,
        required: true,
    },
    section: {
        type: String,
        required: true
    },
    professor: {
        type: String,
        required: false,
        default: ''
    },
    students: {
        type: [String],
        required: false,
        default: []
    },
    requests: {
        type: [String],
        required: false,
        default: []
    }
}, { timestamps: true, collection: 'classes' });

const classModel = mongoose.model('classes', classesSchema);

module.exports = classModel;