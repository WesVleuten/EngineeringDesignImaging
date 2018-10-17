const imagestart = require('./lib/start');
const lightness = require('./lib/lightness');
const middlecheck = require('./lib/middlecheck');
const hough = require('./lib/hough');

const algStart = (err, buffer, config) => {
    if (err) {
        throw err;
    }

    const process = imagestart(buffer, config);
    alg(process, buffer, config, 0);
};

const alg = (process, buffer, config, pitteration) => {

    const {
        maxiterations,
        leeway
    } = config

    const itteration = pitteration || 0;
    if (itteration >= maxiterations) {
        console.error('Too many itterations done, buffer unreadable');
        return;
    }

    process.screen = Buffer.from(buffer.slice(process.slice[0], process.slice[1]));


    lightness(process);

    middlecheck(process);

    const houghPoints = hough(process, config);
    if (houghPoints.length != 2) {
        console.error('more or less than 2 lines detected (' + houghPoints.length + ')');
        process.lightnesscutoff -= 4;
        if (process.lightnesscutoff < 0) {
            process.lightnesscutoff = 255;
        }
        alg(process, buffer, config, itteration + 1);
        return;
    }
    console.log('got 2 lines');
    if (process.lightnesscutoff < 239) {
        process.lightnesscutoff += 16;
    }

    const functionize = p => y => (y - p[1]) / p[0];
    const line1 = functionize(houghPoints[0]);
    const line2 = functionize(houghPoints[1]);

    const x = [line1(process.user.y), line2(process.user.y)];
    const xl = Math.min(x[0], x[1]);
    const xr = Math.max(x[0], x[1]);

    const laneWidth = xr - xl;
    const userPos = process.user.x - xl;
    const scaled = -1 + 2 * (userPos / laneWidth);

    if (config.useRasPi) {
        if (scaled < -1 * leeway) {
            // goto right
            exec(`aplay ./beep_R.wav`);
        }
        if (scaled > leeway) {
            // goto left
            exec(`aplay ./beep_L.wav`);
        }
    }
    const r = {
        laneWidth,
        userPos,
        scaled,
        xl,
        xr
    };
    console.log('Done!', r);
    return r;
};

module.exports = algStart;