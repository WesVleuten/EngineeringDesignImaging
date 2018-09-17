const fs = require('fs');
const percentile = 0.95; // percentile threshold for determining lines
const CUTOFFDYNAMIC = false;
const PNG = require('pngjs').PNG;

const onerror = (a, b) => { if (b) console.log(b); };

console.time('full');
console.time('pixels')

fs.createReadStream('testsmall.png').pipe(new PNG()).on('parsed', function() {
    const pixels = this;

    console.timeEnd('pixels');
    console.time('constants');

    const width = pixels.width;
    const height = pixels.height;
    const pixelCount = width * height;
    const channels = 4;
    const data = pixels.data;
    const datalength = data.length;

    console.timeEnd('constants');
    console.time('imagegrid');

    if (channels < 3 || channels > 4) {
        console.log('unsupported amount of channels');
        return;
    }
    if (pixels.data.length != pixelCount * channels) {
        console.log('corrupted image data');
        return;
    }
    let screenY = [];
    let screenX = [];
    let lightness = [];
    let currentPixelChannelIndex = 0;
    while (currentPixelChannelIndex < datalength) {
        const r = data[currentPixelChannelIndex];
        const g = data[currentPixelChannelIndex+1];
        const b = data[currentPixelChannelIndex+2];

        const l = (Math.max(r,g,b) + Math.min(r,g,b)) / 2;
        lightness.push(l);

        currentPixelChannelIndex += channels;

    }
    console.timeEnd('imagegrid');
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
        screenX.push(lightness[i] < lightnesscutoff? 0: 1);
        if ((i+1) % width == 0) {
            screenY.push(screenX);
            screenX = [];
        }
    }
    console.timeEnd('lightgrid');
    console.time('middlecheck');

    const startX = screenY[0].length/2;
    const first1ForEveryY_L = [];
    const first1ForEveryY_R = [];
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
        screenY[y][r] = 2;
        screenY[y][l] = 2;
    }
    console.timeEnd('middlecheck');
    console.time('currentlanedetect');

    let changes = -1;
    while(changes != 0) {
        changes = 0;
        for (let y = 0; y < screenY.length; y++) {
            //grow twos horizontally
            for (let x = 0; x < screenY[y].length; x++) {
                if (screenY[y][x] != 2) continue;
                if (x+1 < width && screenY[y][x+1] == 1) {
                    changes++;
                    screenY[y][x+1] = 2;
                }
                if (x-1 > 0 && screenY[y][x-1] == 1) {
                    changes++;
                    screenY[y][x-1] = 2;
                }
            }
        }
    }
    console.timeEnd('currentlanedetect');
    console.time('otherlaneclear');
    screenY = screenY.map(y => y.map(x => x == 1? 0 : x));
    console.timeEnd('otherlaneclear');

    console.timeEnd('full');
    try {
        fs.mkdirSync('./result');
    } catch(e) {}
    fs.writeFile('./result/3.txt', screenY.map(x => x.join('')).join('\n'), onerror);

    //detect lines
    
});