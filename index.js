const getPixels = require('get-pixels');
const fs = require('fs');
const percentile = 0.95; // percentile threshold for determining lines
const vskiprate = 1; // the amount of vertical pixels it will skip
const hskiprate = 1; // the amount of horizontal pixels it will skip

const onerror = (a, b) => { if (b) console.log(b); };

console.time('full');
console.time('pixels')
getPixels('test.jpg', function(err, pixels) {
    if(err) {
        console.log('Bad image path');
        return;
    }
    console.timeEnd('pixels');
    console.time('imagegrid');

    const width = pixels.shape[0];
    const height = pixels.shape[1];
    const pixelCount = width * height;
    const channels = pixels.shape[2];
    const data = pixels.data;
    const datalength = data.length;
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
        let currentPixel = new Pixel();
        currentPixel.setRed(data[currentPixelChannelIndex]);
        currentPixel.setGreen(data[currentPixelChannelIndex+1]);
        currentPixel.setBlue(data[currentPixelChannelIndex+2]);
        if (channels == 4) {
            currentPixel.setAlpha(data[currentPixelChannelIndex+3]);
        }
        const l = currentPixel.getLightness();
        lightness.push(l);

        //is end of line
        if ((currentPixelChannelIndex+1) % width == 0) {
            //can assume is int and not float because we checked the remainer above
            currentPixelChannelIndex += width * channels * hskiprate;
        }
        currentPixelChannelIndex += channels * (vskiprate + 1);

    }
    console.timeEnd('imagegrid');
    console.time('lightcutoff');
    let lightnesscutoff = lightness.slice().sort((a, b) => a - b)[Math.round(lightness.length * percentile)];
    console.timeEnd('lightcutoff');
    console.time('lightgrid');
    for (let i = 0; i < lightness.length; i++) {
        screenX.push(lightness[i] < lightnesscutoff? 0: 1);
        if ((i+1) % (width / (vskiprate + 1)) == 0) {
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
        first1ForEveryY_R[y] = startX;
        while(screenY[y][first1ForEveryY_R[y]] == 0) {
            first1ForEveryY_R[y]++;
            if (first1ForEveryY_R[y] > width) {
                //infinite loop prevention
                screenY[y][first1ForEveryY_R[y]] = null;
                break;
            }
        }
        first1ForEveryY_L[y] = startX;
        while(screenY[y][first1ForEveryY_L[y]] == 0) {
            first1ForEveryY_L[y]--;
            if (first1ForEveryY_L[y] < 0) {
                //infinite loop prevention
                screenY[y][first1ForEveryY_L[y]] = null;
                break;
            }
        }
        screenY[y][first1ForEveryY_L[y]] = 2;
        screenY[y][first1ForEveryY_R[y]] = 2;
    }
    console.timeEnd('middlecheck');
    console.time('currentlanedetect');

    let changes = -1;
    while(changes != 0) {
        changes = 0;
        for (let y = 0; y < screenY.length; y++) {
            //grow twos
            //console.log(screenY[y].length, width);
            for (let x = 0; x < screenY[y].length; x++) {
                if (screenY[y][x] != 2) continue;
                // if (y-1 > 0 && screenY[y-1][x] == 1) {
                //     if (screenY[y-1][x] != 2) changes++;
                //     screenY[y-1][x] = 2;
                // }
                // if (y+1 < height && screenY[y+1][x] == 1) {
                //     if (screenY[y+1][x] != 2) changes++;
                //     screenY[y+1][x] = 2;
                // }
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

class Pixel {
    constructor() {
        this.red = null;
        this.blue = null;
        this.green = null;
        this.alpha = 255;
    }
    getRGB() {
        return {
            red: this.red,
            blue: this.blue,
            green: this.green
        };
    }
    getLightness() {
        return (Math.max(this.red, this.blue, this.green) + Math.min(this.red, this.blue, this.green))/2;
    }
    setRed(red) {
        this.red = red;
    }
    setBlue(blue) {
        this.blue = blue;
    }
    setGreen(green) {
        this.green = green;
    }
    setAlpha(alpha) {
        this.alpha = alpha;
    }
}