const mongoose = require('mongoose');

const contributionSchema = new mongoose.Schema({
    uid: {
        type: String,
        required: true,
    },
    edit_count: {
        type: Number,
        required: true,
    },
}, { timestamps: true });

const historySchema = new mongoose.Schema({
    content: {
        type: String,
        required: true
    },
    contributions: {
        type: [contributionSchema],
        required: false
    }
}, { timestamps: true });

const fileSchema = new mongoose.Schema({
    file_id: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    room_id: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: false
    },
    history: {
        type: [historySchema],
        required: false,
        default: []
    },
    contributions: {
        type: [contributionSchema],
        required: false,
        default: []
    }
}, { timestamps: true, collection: 'files' });

const fileModel = mongoose.model('files', fileSchema);

module.exports = fileModel;