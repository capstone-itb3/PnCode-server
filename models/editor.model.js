const mongoose = require('mongoose');

const editorSchema = new mongoose.Schema({
    editor_id: {
        type: String,
        required: true,
        unique: true
    },
    editor_name: {
        type: String,
        required: true,
        default: 'New-room'
    },
    room_id: {
        type: String,
        required: true,
    },
    code: {
        type: String,
        required: false,
        default: ''
    },
    history: {
        type: [Object],
        required: false,
        default: []
    },
}, { timestamps: true, collection: 'editors' });

const editorModel = mongoose.model('editors', editorSchema);

module.exports = editorModel;