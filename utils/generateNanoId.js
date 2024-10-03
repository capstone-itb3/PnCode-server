let customAlphabet;
import('nanoid').then(nanoid => {
    customAlphabet = nanoid.customAlphabet;
});

function generateNanoId() {
    const generatedId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', 28);
    return generatedId();
}

module.exports = generateNanoId;
