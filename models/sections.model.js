const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    year: {
        type: String,
        required: true,
    },
    program: {
        type: String,
        required: true
    },
    sections: {
        type: [String],
        required: true
    },
    courses_1stsem: {
        type: [Object],
        required: false,
        default: []
    },
    courses_2ndsem: {
        type: [Object],
        required: false,
        default: []
    }
});

const sectionModel = mongoose.model('sections', sectionSchema);

module.exports = sectionModel;