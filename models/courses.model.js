const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    course_code: {
        type: String
    },
    course_title: {
        type: String
    }
}, { collection: 'courses', timestamps: true });

const courseModel = mongoose.model('courses', courseSchema);

module.exports = courseModel;