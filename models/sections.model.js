const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
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
        default: []
    },
    id_link: {
        type: String,
        required: true,
        unique: true
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
});

const sectionModel = mongoose.model('sections', sectionSchema);

module.exports = sectionModel;