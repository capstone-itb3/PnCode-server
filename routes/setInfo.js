const studentModel = require('../models/students.model');

async function setTeamInfo(member) {
    const user = await studentModel.findOne({ uid: member });
    
    return {
        uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name
    };
}

async function setContributionInfo(contri) {
    const user = await studentModel.findOne({ uid: contri.uid }).lean();

    return {
        uid: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        edit_count: contri.edit_count
    };
}

module.exports = { setTeamInfo, setContributionInfo };