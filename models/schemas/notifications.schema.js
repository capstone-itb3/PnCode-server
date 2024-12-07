const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    notif_id: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        required: false
    },
    for: {
        type: String,
        required: false
    },
    type: {
        type: String,
        required: true
    },
    subject_name: {
        type: String,
        required: false
    },
    subject_id: {
        type: Object,
        required: false
    },
}, { timestamps: true });

module.exports = notificationSchema;