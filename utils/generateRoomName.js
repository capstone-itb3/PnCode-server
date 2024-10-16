function generateRoomName(created_solos, first_name) {
        const baseRoomName = `${first_name}'s Room ${new Date().toISOString().slice(5, 10)}`;
        let suffix = '', counter = 1;
    
        while (created_solos.some(room => room.room_name === `${baseRoomName}${suffix}`)) {
            suffix = `-${counter}`;
            counter++;
        } 
        return `${baseRoomName}${suffix}`;
}

module.exports = generateRoomName;