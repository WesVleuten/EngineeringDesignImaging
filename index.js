const inputfile = 'test.png';
const percentile = 0.95; // percentile threshold for determining lines
const CUTOFFDYNAMIC = true;
const CREATEPROCESSINGIMAGES = true;


const LANELINE = 2;
const LIGHTPIXEL = 1;


const fs = require('fs');
const PngImg = require('png-img');
const onerror = (a, b) => { if (b) console.log(b); };

try {
    fs.mkdirSync('./result');
} catch(e) {}

console.time('full');
console.time('getimage')

fs.readFile(inputfile, function(err, buf) {
    if (err) throw err;

    const image = new PngImg(buf);
    const size = image.size();

    console.timeEnd('getimage');
    console.time('constants');

    const width = size.width;
    const height = size.height;
    const channels = 4;

    console.timeEnd('constants');
    console.time('imagegrid');

    if (channels < 3 || channels > 4) {
        console.log('unsupported amount of channels');
        return;
    }

    let screenY = [];
    let screenX = [];
    let lightness = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const p = image.get(x, y);
            const l = (Math.max(p.r, p.g, p.b) + Math.min(p.r, p.g, p.b)) / 2;
            lightness.push(l);
        }
    }

    console.timeEnd('imagegrid');

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(buf);
        for (let i = 0; i < lightness.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            pi.set(x, y, {
                r: lightness[i],
                g: lightness[i],
                b: lightness[i],
                a: 255
            });
        }
        pi.save('./result/process1_lightness.png', onerror);
    }

    console.time('lightcutoff');
    let lightnesscutoff;
    if (CUTOFFDYNAMIC) {
        lightnesscutoff = lightness.slice().sort((a, b) => a - b)[Math.round(lightness.length * percentile)];
    } else {
        lightnesscutoff = Math.max(...lightness) - 60;
    }

    console.timeEnd('lightcutoff');
    console.time('lightgrid');

    for (let i = 0; i < lightness.length; i++) {
        screenX.push(lightness[i] < lightnesscutoff? 0: LIGHTPIXEL);
        if ((i+1) % width == 0) {
            screenY.push(screenX);
            screenX = [];
        }
    }
    console.timeEnd('lightgrid');

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(buf);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                pi.set(x, y, screenY[y][x] == 1? '#000000': '#ffffff');
            }
        }
        pi.save('./result/process2_lines.png', onerror);
    }

    console.time('middlecheck');

    const startX = screenY[0].length/2;
    for (let y = 0; y < screenY.length; y++) {
        let r = startX;
        let l = startX;
        while(screenY[y][r++] == 0) {
            if (r > width) {
                break;
            }
        }
        while(screenY[y][l--] == 0) {
            if (l < 0) {
                break;
            }
        }
        screenY[y][r] = LANELINE;
        screenY[y][l] = LANELINE;
    }
    console.timeEnd('middlecheck');
    console.time('currentlanedetect');

    const set2 = (x, y) => {
        if (!screenY[y]) return 0;
        if (!screenY[y][x]) return 0;
        if (screenY[y][x] != LIGHTPIXEL) return 0;
        screenY[y][x] = LANELINE;
        return 1;
    };

    for (let y = 0; y < screenY.length; y++) {
        let changes = 1;
        while(changes != 0) {
            //grow LANELINEs horizontally
            changes = 0;
            for (let x = 0; x < screenY[y].length; x++) {
                if (screenY[y][x] != LANELINE) continue;
                changes += set2(x+1, y) + set2(x-1, y);
                changes += set2(x, y+1) + set2(x, y-1);
            }
        }
    }
    console.timeEnd('currentlanedetect');
    console.time('otherlaneclear');
    screenY = screenY.map(y => y.map(x => x == LIGHTPIXEL? 0 : x));
    console.timeEnd('otherlaneclear');

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(buf);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                pi.set(x, y, screenY[y][x] == LANELINE? '#000000': '#ffffff');
            }
        }
        pi.save('./result/process3_lane.png', onerror);
    }

    console.time('houghcalc');
    const points = [];
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (screenY[y][x] != LANELINE) continue;
            points.push([x, y]);
        }
    }
    const houghY = [];
    for (let y = 0; y < height; y++) {
        const houghX = [];
        for (let x = 0; x < width; x++) {
            houghX.push(0);
        }
        houghY.push(houghX);
    }
    console.log(points.length);
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const r = omega => (p[0] * Math.cos(omega)) + (p[1] * Math.sin(omega));
        for (let x = 0; x < width; x++) {
            const y = Math.round( r((x * Math.PI / 180) - 160) * 0.2 ) + 90;

            if (y < 0 || y >= height) continue;
            houghY[y][x] += 1;
        }
    }

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(buf);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const g = houghY[y][x];
                pi.set(x, y, {
                    r: g,
                    g: g,
                    b: g,
                    a: 255
                });
            }
        }
        pi.save('./result/process5_lines.png', onerror);
    }


    console.timeEnd('full');
});