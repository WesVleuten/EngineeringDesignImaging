console.log('Ready');

const inputfile = 'test';
const width = 160;
const height = 90;

const houghMaxCutoff = 0.85; // percentile threshold for determining where lines are in hough space
const lightnesspercentile = 0.95; // percentile threshold for determining lines
const userYPos = height;
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

    const userXPos = Math.round(width/2);

    let screen = Buffer.alloc(width * height);
    let i = 0;
    let idx = 0;
    let iMax = width * height * 3;
    // calculate lightness for every pixel
    while (i < iMax) {
        const r = buffer[i++];
        const g = buffer[i++];
        const b = buffer[i++];
        screen[idx++] = (Math.max(r, g, b) + Math.min(r, g, b)) / 2;
    }

    console.timeEnd('getimage');

    if (CREATEPROCESSINGIMAGES) {
        //create progress image
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

    //calculate lightness cutoff point
    let lightnesscutoff = lightnessc({ lightness: screen, lightnesspercentile, CUTOFFDYNAMIC });
    console.time('lightgrid');

    //apply lightness cutoff
    for (let i = 0; i < screen.length; i++) {
        if (screen[i] < lightnesscutoff) {
            screen[i] = 0;
        } else {
            screen[i] = LIGHTPIXEL;
        }
    }
    console.timeEnd('lightgrid');

    if (CREATEPROCESSINGIMAGES) {
        //create progress image
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

    const startX = userXPos;
    const points = [];
    for (let y = Math.floor(height/3); y < height; y++,y++,y++) {
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
        points.push(idx + r, idx + l);
    }

    console.time('houghcalc');
    console.time('houghcalc_grid');

    const houghheight = 720;
    const houghwidth = 180;

    console.time('houghcalc_grid');

    // allocate buffer according to hough height and width
    const hough = Buffer.alloc(houghheight * houghwidth);

    console.timeEnd('houghcalc_grid');
    console.time('houghcalc_c');

    let houghMax = 0;
    const hhwidth = houghwidth /2;
    const hhheight = houghheight /2;
    const degreetorad = Math.PI / 180;
    const houghIndexes = [];
    for (let i = 0; i < points.length; i++) {
        const idx = points[i];
        const p = [ idx % width, Math.floor(idx / width) ];

        // r(o) = x * cos(o) + y * sin(o)
        const r = omega => (p[0] * Math.cos(omega)) + (p[1] * Math.sin(omega));
        for (let x = 0; x < houghwidth; x++) {

            // calculate all y values for all x-es
            const y = Math.round( r((x * degreetorad) - hhwidth) + hhheight );
            if (y < 0 || y >= houghheight) continue;

            let idx = y * houghwidth + x;

            hough[idx] += 8;
            //calculate maximum hough value
            if (hough[idx] > houghMax) {
                houghMax = hough[idx];
                if (houghIndexes.indexOf(idx) == -1) {
                    houghIndexes.push(idx);
                }
            }
        }
    }
    houghMax *= houghMaxCutoff;

    console.timeEnd('houghcalc_c');
    console.timeEnd('houghcalc');

    if (CREATEPROCESSINGIMAGES) {
        // create progress image
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
    // get index from cords
    const getindex = (x, y) => y * houghwidth + x;
    const houghPoints = [];
    for (let j = 0; j < hough.length; j++) {
        let i = houghIndexes[j];
        if (hough[i] > houghMax) {
            // easy function to get cords from index
            const c = {
                x: (i % houghwidth),
                y: Math.floor(i / houghwidth)
            };

            console.time('houghconvert_nieghboursuppression');
            // neighbour suppression
            // this suppresses any lines that look much like the one we have detected at c
            hough[getindex(c.x   , c.y +1)] = 0;
            hough[getindex(c.x   , c.y -1)] = 0;
            hough[getindex(c.x +1, c.y +1)] = 0;
            hough[getindex(c.x +1, c.y   )] = 0;
            hough[getindex(c.x +1, c.y -1)] = 0;
            hough[getindex(c.x -1, c.y +1)] = 0;
            hough[getindex(c.x -1, c.y   )] = 0;
            hough[getindex(c.x -1, c.y -1)] = 0;
            console.timeEnd('houghconvert_nieghboursuppression');
            console.time('houghconvert_forcalc');

            // get omega from x cord
            const omegaRad = (c.x * degreetorad) - hhwidth;
            // get r from y cord
            const r = c.y - hhheight;

            // sin and cos for ease of calculation
            const cosOmega = Math.cos(omegaRad);
            const sinOmega = Math.sin(omegaRad);

            // get a and b from y = a * x + b
            const velocity = -1 * cosOmega / sinOmega;
            const constant = r / sinOmega;

            // push values to array
            houghPoints.push([velocity, constant]);
            console.timeEnd('houghconvert_forcalc');
        }
    }
    console.timeEnd('houghconvert');

    if (CREATEPROCESSINGIMAGES) {
        // create progress image
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

    console.time('userpos')
    if (houghPoints.length > 2) {
        console.error('more than 2 lines detected');
    }

    const functionize = p => y => (y - p[1]) / p[0];
    const line1 = functionize(houghPoints[0]);
    const line2 = functionize(houghPoints[1]);

    const x = [line1(userYPos), line2(userYPos)];
    const xl = Math.min(...x);
    const xr = Math.max(...x);

    const laneWidth = xr - xl;
    const userPos = userXPos - xl;
    const scaled = -1 + 2* (userPos/laneWidth);
    console.log('returner', scaled, laneWidth, userPos);

    console.timeEnd('userpos');

    console.timeEnd('full');
});