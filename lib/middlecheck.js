const middlecheck = function(process) {
    const startX = process.user.x;
    process.middlepoints = [];
    for (let y = 0; y < process.height; y++,y++,y++) {
        let idx = y * process.width;
        let r = startX;
        let l = startX;
        while(process.screen[idx + r++] == 0) {
            if (r > process.width) {
                r = null;
                break;
            }
        }
        while(process.screen[idx + l--] == 0) {
            if (l < 0) {
                l = null;
                break;
            }
        }
        if (l !== null ) {
            process.middlepoints.push(idx + l);
        }
        if (r !== null) {
            process.middlepoints.push(idx + r);
        }
    }
};

module.exports = middlecheck;