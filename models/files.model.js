const mongoose = require('mongoose');
const contributionSchema = require('./schemas/contributions.schema');

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
        type: [String],
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