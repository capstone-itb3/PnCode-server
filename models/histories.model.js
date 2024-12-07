const mongoose = require('mongoose');
const contributionSchema = require('./schemas/contributions.schema');

const historySchema = new mongoose.Schema({
    history_id: {
        type: String,
        required: true,
        unique: true,
    },
    file_id: {
        type: String,
        required: true
    },
    content: {
        type: String,
        required: true
    },
    contributions: {
        type: [contributionSchema],
        required: false
    }
}, { timestamps: true, collection: 'histories' });

const historyModel = mongoose.model('histories', historySchema);

module.exports = historyModel;