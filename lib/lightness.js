const lightness = function(process) {
    for (let i = 0; i < process.screen.length; i++) {
        if (process.screen[i] < process.lightnesscutoff) {
            process.screen[i] = 0;
        } else {
            process.screen[i] = 1;
        }
    }
};

module.exports = lightness;