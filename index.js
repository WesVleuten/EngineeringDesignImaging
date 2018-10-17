console.log('Ready');

const inputfile = 'test';

const lightnessc = require('./lib/lightnesscutoff');

const LANELINE = 2;
const LIGHTPIXEL = 1;

const fs = require('fs');
const PngImg = require('png-img');
const { exec } = require('child_process');
const onerror = (a, b) => { if (b) console.log(b); };
const {
    startinglightnesscutoff,
    houghMaxCutoff,
    inputwidth,
    inputheight,
    startY,
    useRasPi,
    maxiterations,
    leeway,
    CREATEPROCESSINGIMAGES
} = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
let lightnesscutoff = startinglightnesscutoff;
const width = inputwidth;

try {
    fs.mkdirSync('./result');
} catch(e) {}
try {
    fs.mkdirSync('./frames');
} catch(e) {}

const imagestart = function(process, buffer) {
    const heightskipped = Math.floor(inputheight * startY);
    process.width = inputwidth;
    process.height = inputheight - heightskipped;
    process.screen = Buffer.from(buffer.slice(heightskipped * inputwidth, inputheight * inputwidth));
    process.user.y = process.height;
    process.user.x = Math.round(width/2);
};

const lightness = function(process) {
    if (CREATEPROCESSINGIMAGES) {
        const pi = new PngImg(fs.readFileSync('./pixel.png'));
        for (let y = 0; y < process.height; y++) {
            const prey = y * process.width;
            for (let x = 0; x < process.width; x++) {
                let pp = process.screen[prey + x];
                let p = pp.toString('16');
                if (p.length < 2) {
                    p = '0' + p;
                }
                pi.set(x, y, '#' + p+p+p);
            }
        }
        pi.save('./result/process1_lines.png', onerror);
    }

    for (let i = 0; i < process.screen.length; i++) {
        if (process.screen[i] < lightnesscutoff) {
            process.screen[i] = 0;
        } else {
            process.screen[i] = LIGHTPIXEL;
        }
    }

    if (CREATEPROCESSINGIMAGES) {
        //create progress image
        const pi = new PngImg(fs.readFileSync('./pixel.png'));
        for (let y = 0; y < process.height; y++) {
            const prey = y * process.width;
            for (let x = 0; x < process.width; x++) {
                pi.set(x, y, process.screen[prey + x] == LIGHTPIXEL? '#000000': '#ffffff');
            }
        }
        pi.save('./result/process2_lines.png', onerror);
    }

};

const middlecheck = function(process) {
    const startX = process.user.x;
    process.middlepoints = [];
    for (let y = 0; y < process.height; y++,y++,y++) {
        let idx = y * process.width;
        let r = startX;
        let l = startX;
        while(process.screen[idx + r++] == 0) {
            if (r > width) {
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

const hough = function(process) {
    const houghheight = 720;
    const houghwidth = 180;

    // allocate buffer according to hough height and width
    const hough = Buffer.alloc(houghheight * houghwidth);

    let houghMax = 0;
    const hhwidth = houghwidth /2;
    const hhheight = houghheight /2;
    const degreetorad = Math.PI / 180;
    const houghIndexes = [];
    const points = process.middlepoints;
    for (let i = 0; i < points.length; i++) {
        const idx = points[i];
        const pointA = idx % width;
        const pointB = Math.floor(idx / width);

        // r(o) = x * cos(o) + y * sin(o)
        const r = omega => (pointA * Math.cos(omega)) + (pointB * Math.sin(omega));
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

    // get index from cords
    const getindex = (x, y) => y * houghwidth + x;
    const houghPoints = [];
    for (let j = 0; j < houghIndexes.length; j++) {
        let i = houghIndexes[j];
        if (hough[i] > houghMax) {
            // easy function to get cords from index
            const c = {
                x: (i % houghwidth),
                y: Math.floor(i / houghwidth)
            };

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
        }
    }
    return houghPoints;
};

const alg = (err, buffer, pitteration) => {
    if (err) {
        throw err;
    }
    const itteration = pitteration || 0;
    if (itteration >= maxiterations) {
        console.error('Too many itterations done, buffer unreadable');
        return;
    }

    const process = {
        height: null,
        width: null,
        screen: null,
        user: {
            y: null,
            x: null
        }
    };

    imagestart(process, buffer);

    lightness(process);

    middlecheck(process);

    const houghPoints = hough(process);


    if (houghPoints.length != 2) {
        console.error('more or less than 2 lines detected');
        lightnesscutoff += 4;
        if (lightnesscutoff > 255) {
            lightnesscutoff = 0;
        }
        alg(null, buffer, itteration + 1);
        return;
    }
    console.log('got 2 lines');
    lightnesscutoff -= 16;

    const functionize = p => y => (y - p[1]) / p[0];
    const line1 = functionize(houghPoints[0]);
    const line2 = functionize(houghPoints[1]);

    const x = [line1(process.user.y), line2(process.user.y)];
    const xl = Math.min(x[0], x[1]);
    const xr = Math.max(x[0], x[1]);

    const laneWidth = xr - xl;
    const userPos = process.user.x - xl;
    const scaled = -1 + 2 * (userPos / laneWidth);

    if (useRasPi) {
        if (scaled < -1 * leeway) {
            // goto right
            exec(`aplay ./beep_R.wav`);
        }
        if (scaled > leeway) {
            // goto left
            exec(`aplay ./beep_L.wav`);
        }
    }

    console.log('Done!', scaled);
};


let testfileQueue = [];
const getfile = () => {
    if (useRasPi) {
        console.log('using raspiyuv');
        const filename = './frames/raspiyuvbuffer_' + Date.now();
        exec(`raspiyuv --luma --timeout 1 --output ${filename} --width ${inputwidth} --height ${inputheight}`, (err, stdout, stderr) => {
            console.log(err, stdout, stderr);
            fs.readFile(filename, function(err, data) {
                alg(err, data);
                getfile();
            });
        });
    } else {
        if (testfileQueue.length == 0) {
            testfileQueue = fs.readdirSync('./frames');
        }
        let f = testfileQueue.shift();
        while (f.length > 1 && f[0] == '.') {
            f = testfileQueue.shift();
        }
        console.log('using testfile', f);
        fs.readFile('./frames/' + f, function(err, data) {
            alg(err, data);
            getfile();
        });
    }
};

getfile();