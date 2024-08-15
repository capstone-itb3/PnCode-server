const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  team_id: {
    type: String,
    required: true,
    unique: true
  },
  team_name: {
    type: String,
    required: true
  },
  course: {
    type: String,
    required: true
  },
  section: {
    type: String,
    required: true
  },
  members: {
    type: Array,
    required: true
  }
}, { timestamps: true, collection: 'teams' });

const teamModel = mongoose.model('teams', teamSchema);

module.exports = teamModel;