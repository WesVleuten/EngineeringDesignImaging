console.log('Ready');

const inputfile = 'test';
const width = 160;
const height = 90;

const lightnesspercentile = 0.95; // percentile threshold for determining lines
const CUTOFFDYNAMIC = false;
const CREATEPROCESSINGIMAGES = false;

const lightnessc = require('./lib/lightnesscutoff');

const LANELINE = 2;
const LIGHTPIXEL = 1;

const fs = require('fs');
const pngjs = require('pngjs').PNG;
const PngImg = require('png-img');
const onerror = (a, b) => { if (b) console.log(b); };

try {
    fs.mkdirSync('./result');
} catch(e) {}

console.time('full');
console.time('getimage')

fs.readFile(inputfile, function(err, buffer) {
    if (err) throw err;

    let screen = Buffer.alloc(width * height);
    let i = 0;
    let idx = 0;
    let iMax = width * height * 3;
    while (i < iMax) {
        const r = buffer[i++];
        const g = buffer[i++];
        const b = buffer[i++];
        screen[idx++] = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    }

    console.timeEnd('getimage');

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(fs.readFileSync('./pixel.png'));
        for (let i = 0; i < screen.length; i++) {
            const x = i % width;
            const y = Math.floor(i / width);
            pi.set(x, y, {
                r: screen[i],
                g: screen[i],
                b: screen[i],
                a: 255
            });
        }
        pi.save('./result/process1_lightness.png', onerror);
    }

    let lightnesscutoff = lightnessc({ lightness: screen, lightnesspercentile, CUTOFFDYNAMIC });
    console.time('lightgrid');

    for (let i = 0; i < screen.length; i++) {
        if (screen[i] < lightnesscutoff) {
            screen[i] = 0;
        } else {
            screen[i] = LIGHTPIXEL;
        }
    }
    console.timeEnd('lightgrid');

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(fs.readFileSync('./pixel.png'));
        for (let y = 0; y < height; y++) {
            const prey = y * width;
            for (let x = 0; x < width; x++) {
                pi.set(x, y, screen[prey + x] == 1? '#000000': '#ffffff');
            }
        }
        pi.save('./result/process2_lines.png', onerror);
    }

    console.time('middlecheck');

    const startX = Math.round(width/2);
    for (let y = Math.floor(height/3); y < height; y++) {
        let idx = y * width;
        let r = startX;
        let l = startX;
        while(screen[idx + r++] == 0) {
            if (r > width) {
                break;
            }
        }
        while(screen[idx + l--] == 0) {
            if (l < 0) {
                break;
            }
        }
        screen[idx + r] = LANELINE;
        screen[idx + l] = LANELINE;
    }
    console.timeEnd('middlecheck');
    console.time('otherlaneclear');
    for (let i = 0; i < screen.length; i++) {
        if (screen[i] == LIGHTPIXEL) {
            screen[i] = 0;
        }
    }
    console.timeEnd('otherlaneclear');

    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(fs.readFileSync('./pixel.png'));
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                pi.set(x, y, screen[y * width + x] == LANELINE? '#000000': '#ffffff');
            }
        }
        pi.save('./result/process3_lane.png', onerror);
    }

    console.time('houghcalc');
    console.time('houghcalc_points');
    const houghheight = 720;
    const houghwidth = 180;
    const points = [];
    for (let y = 0; y < height; y++,y++,y++) {
        for (let x = 0; x < width; x++) {
            if (screen[y * width + x] != LANELINE) continue;
            points.push([x, y]);
        }
    }
    console.timeEnd('houghcalc_points');
    console.time('houghcalc_grid');

    const hough = Buffer.alloc(houghheight * houghwidth);

    console.timeEnd('houghcalc_grid');
    console.time('houghcalc_c');
    console.log(points.length);
    let houghMax = 0;
    const hhwidth = houghwidth /2;
    const hhheight = houghheight /2;
    const degreetorad = Math.PI / 180;
    for (let i = 0; i < points.length; i++) {
        const p = points[i];
        const r = omega => (p[0] * Math.cos(omega)) + (p[1] * Math.sin(omega));
        for (let x = 0; x < houghwidth; x++) {
            const y = Math.round( r((x * degreetorad) - hhwidth) + hhheight );
            if (y < 0 || y >= houghheight) continue;

            let idx = y * houghwidth + x;
            hough[idx] += 8;
            if (hough[idx] > houghMax) {
                houghMax = hough[idx];
            }
        }
    }
    houghMax *= 0.85;

    console.timeEnd('houghcalc_c');
    console.timeEnd('houghcalc');

    if (CREATEPROCESSINGIMAGES || true) {
        const pngjs = require('pngjs').PNG;
        const im = new pngjs({
            width: houghwidth,
            height: houghheight
        });

        for (let y = 0; y < houghheight; y++) {
            for (let x = 0; x < houghwidth; x++) {
                const idx = (im.width * y + x) << 2;
                const g = hough[y * houghwidth + x] || 0;
                if (g > houghMax) {
                    im.data[idx    ] = 255;
                    im.data[idx + 1] = 0;
                    im.data[idx + 2] = 0;
                } else {
                    im.data[idx    ] = g;
                    im.data[idx + 1] = g;
                    im.data[idx + 2] = g;
                }
                im.data[idx + 3] = 0xff;

            }
        }
        im.pack().pipe(fs.createWriteStream('./result/process4_lines.png'))

    }

    console.time('houghconvert');

    const houghPoints = [];
    for (let i = 0; i < hough.length; i++) {
        if (hough[i] > houghMax) {
            const getindex = (x, y) => y * houghwidth + x;

            const getcords = (i) => { return { x: (i % houghwidth), y: Math.floor(i / houghwidth) }};
            const c = getcords(i);

            //neighbour suppression
            hough[getindex(c.x   , c.y +1)] = 0;
            hough[getindex(c.x   , c.y -1)] = 0;
            hough[getindex(c.x +1, c.y +1)] = 0;
            hough[getindex(c.x +1, c.y   )] = 0;
            hough[getindex(c.x +1, c.y -1)] = 0;
            hough[getindex(c.x -1, c.y +1)] = 0;
            hough[getindex(c.x -1, c.y   )] = 0;
            hough[getindex(c.x -1, c.y -1)] = 0;

            const omegaRad = (c.x * degreetorad) - hhwidth;
            const r = c.y - hhheight;

            const cosOmega = Math.cos(omegaRad);
            const sinOmega = Math.sin(omegaRad);

            const velocity = -1 * cosOmega / sinOmega;
            const constant = r / sinOmega;

            houghPoints.push([velocity, constant]);
        }
    }

    if (CREATEPROCESSINGIMAGES || true) {
        const pngjs = require('pngjs').PNG;
        const im = new pngjs({
            width: width,
            height: height
        });

        for (let i = 0; i < houghPoints.length; i++) {
            for (let x = 0; x < width; x++) {
                const y = Math.round(houghPoints[i][0] * x + houghPoints[i][1]);
                const idx = (im.width * y + x) << 2;
                if (idx < 0 || idx >= im.data.length) continue;
                im.data[idx    ] = 0xff;
                im.data[idx + 1] = 0xff;
                im.data[idx + 2] = 0xff;
                im.data[idx + 3] = 0xff;
            }
        }
        im.pack().pipe(fs.createWriteStream('./result/process5_convert.png'));
    }

    console.timeEnd('houghconvert');
    console.timeEnd('full');
});