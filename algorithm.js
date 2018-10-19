const imagestart = require('./lib/start');
const lightness = require('./lib/lightness');
const middlecheck = require('./lib/middlecheck');
const hough = require('./lib/hough');
const { exec } = require('child_process');
const fs = require('fs');

const algStart = (err, name, buffer, config) => {
    if (err) {
        throw err;
    }

    const process = imagestart(buffer, config);
    process.name = name;
    return alg(process, buffer, config, 0);
};

const alg = (process, buffer, config, pitteration) => {
    const {
        maxiterations,
        leeway
    } = config

    const itteration = pitteration || 0;
    if (itteration >= maxiterations) {
        return 'Too many itterations done, buffer unreadable';
    }

    const increaseLightness = () => {
        process.lightnesscutoff -= 2;
        if (process.lightnesscutoff < 0) {
            process.lightnesscutoff = 255;
        }
        return alg(process, buffer, config, itteration + 1);
    };

    process.screen = Buffer.from(buffer.slice(process.slice[0], process.slice[1]));

    lightness(process);

    middlecheck(process);

    const houghPoints = hough(process, config);

    if (houghPoints.length != 2) {
        //console.error('more or less than 2 lines detected (' + houghPoints.length + ')');
        return increaseLightness();
    }

    const velocity1 = houghPoints[0][0];
    const velocity2 = houghPoints[1][0];
    if (Math.abs(velocity1 - velocity2) < 2) {
        return increaseLightness();
    }
    console.log('got 2 lines', houghPoints);


    if (config.analyse && false) {
        const pngjs = require('pngjs').PNG;
        const im = new pngjs({
            width: process.width,
            height: process.height
        });

        for (let i = 0; i < houghPoints.length; i++) {
            for (let x = 0; x < process.width; x++) {
                const y = Math.round(houghPoints[i][0] * x + houghPoints[i][1]);
                const idx = (im.width * y + x) << 2;
                if (idx < 0 || idx >= im.data.length) continue;
                im.data[idx    ] = 0xff;
                im.data[idx + 1] = 0xff;
                im.data[idx + 2] = 0xff;
                im.data[idx + 3] = 0xff;
            }
        }
        im.pack().pipe(fs.createWriteStream('./analyse/' + process.name + '_m.png'));
    }

    const functionize = p => y => (y - p[1]) / p[0];
    const line1 = functionize(houghPoints[0]);
    const line2 = functionize(houghPoints[1]);

    const x = [line1(process.user.y), line2(process.user.y)];
    const xl = Math.min(x[0], x[1]);
    const xr = Math.max(x[0], x[1]);

    const laneWidth = xr - xl;
    if (laneWidth < 5) {
        return increaseLightness();
    }
    const userPos = process.user.x - xl;
    const scaled = -1 + 2 * (userPos / laneWidth);

    if (config.useRasPi) {
        const left = scaled < -1 * leeway;
        const right = scaled > leeway;
        const inverted = config.invertedOutput;
        if (scaled >= -1 && scaled <= 1) {
            if ((left && !inverted) || (right && inverted)) {
                // goto right
                exec(`aplay ./beep/beep_R.wav`);
            }
            if ((right && !inverted) || (left && inverted)) {
                // goto left
                exec(`aplay ./beep/beep_L.wav`);
            }
        }
    }

    if (process.lightnesscutoff < 255-32) {
        process.lightnesscutoff += 32;
    }

    const r = {
        laneWidth,
        userPos,
        scaled,
        xl,
        xr,
        process,
        toJSON: () => {
            return {
                laneWidth,
                userPos,
                scaled,
                xl,
                xr,
                vd: velocity1 - velocity2
            };
        }
    };

    if (config.analyse && (r.scaled > 1 || r.scaled < -1)) {
        const pngjs = require('pngjs').PNG;
        const im = new pngjs({
            width: 160,
            height: 90
        });
        for (let i = 0; i < process.screen.length; i++) {
            if (process.screen[i] == 1) continue;
            const index = (process.slice[0] + i) * 4;
            im.data[index] = 0xff;
            im.data[index +1] = 0xff;
            im.data[index +2] = 0xff;
            im.data[index +3] = 0xff;
        }
        im.pack().pipe(fs.createWriteStream('./analyse/' + process.name + '_k.png'));
    }

    console.log('Done!', scaled);
    return r;
};

module.exports = algStart;