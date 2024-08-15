const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
    course_code: {
        type: String
    },
    section: {
        type: String
    }
});

module.exports = courseSchema;