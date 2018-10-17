const middlecheck = function(process) {
    const startX = process.user.x;
    process.middlepoints = [];
    for (let y = 0; y < process.height; y++,y++,y++) {
        let idx = y * process.width;
        let r = startX;
        let l = startX;
        while(process.screen[idx + r++] == 0) {
            if (r > process.width) {
                break;
            }
        }
        while(process.screen[idx + l--] == 0) {
            if (l < 0) {
                break;
            }
        }
        process.middlepoints.push(idx + r, idx + l);
    }
};

module.exports = middlecheck;