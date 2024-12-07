const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
    chat_id: {
        type: String,
        required: true,
        default: parseInt(Date.now())
    },
    chat_body: {
        type: String,
        required: true
    },
    sender_uid: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        required: true
    }
});

module.exports = chatSchema;