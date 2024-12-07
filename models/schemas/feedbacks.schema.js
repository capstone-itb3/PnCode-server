const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    feedback_id: {
        type: String,
        required: true,
        default: parseInt(Date.now())
    },
    feedback_body: {
        type: String,
        required: true,
        default: ''
    },
    professor_uid: {
        type: String,
        required: true
    },
    reacts: {
        type: [String],
        required: false,
        default: []
    }
}, { timestamps: true });

module.exports = feedbackSchema;