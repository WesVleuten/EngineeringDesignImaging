console.log('Ready');

const fs = require('fs');
const pngjs = require('pngjs').PNG;
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
config.analyse = true;

try {
    fs.mkdirSync('./frames');
} catch(e) {}
try {
    fs.mkdirSync('./analyse');
} catch(e) {}

const alg = require('./algorithm.js');

//*
const framefolder = 'frames_3g_1';
/*/
const framefolder = 'f2';
//*/

let testfileQueue = fs.readdirSync('./' + framefolder);
const getfile = () => {
    if (testfileQueue.length == 0) {
        return;
    }
    let f = testfileQueue.shift();
    while (f.length > 1 && f[0] == '.') {
        f = testfileQueue.shift();
    }

    console.log('using testfile', f);
    fs.readFile(`./${framefolder}/${f}`, function(err, data) {

        let rgba = [];
        let i = 0;
        while (i < data.length) {
            const l = data[i++];
            rgba.push(l, l, l, 0xff);
        }
        const im = new pngjs({
            width: 160,
            height: 90
        });
        im.data = rgba;

        const r = alg(err, f, data, config);
        if (typeof r == 'string') {
            fs.writeFileSync(`./analyse/${f}_x.err`, r, 'utf8');
        }
        if (true) {
            im.pack().pipe(fs.createWriteStream(`./analyse/${f}_.png`));
            fs.writeFileSync(`./analyse/${f}_x.json`, JSON.stringify(r), 'utf8');
            const process = r.process;
            const im2 = new pngjs({
                width: process.input.width,
                height: process.input.height
            });
            for (let i = 0; i < process.middlepoints.length; i++) {
                const mp = process.middlepoints[i];
                const index = (process.slice[0] * 4) + mp * 4;
                im2.data[index] = 0xff;
                im2.data[index+1] = 0xff;
                im2.data[index+2] = 0xff;
                im2.data[index+3] = 0xff;
            }
            for (let y = 0; y < process.height; y++) {
                const index =  4 * (process.slice[0] + process.width * y + process.user.x);
                im2.data[index] = 0xff;
                im2.data[index+1] = 0x00;
                im2.data[index+2] = 0x00;
                im2.data[index+3] = 0xff;
            }
            im2.pack().pipe(fs.createWriteStream('./analyse/' + process.name + '_l.png'))
        }
        getfile();
    });
};

getfile();