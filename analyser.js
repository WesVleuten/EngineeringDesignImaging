console.log('Ready');

const fs = require('fs');
const pngjs = require('pngjs').PNG;
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

try {
    fs.mkdirSync('./frames');
} catch(e) {}
try {
    fs.mkdirSync('./analyse');
} catch(e) {}

const alg = require('./algorithm.js');

/*
const framefolder = 'frames_walking3_camfacingdown';
/*/
const framefolder = 'frames'
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
        im.pack().pipe(fs.createWriteStream(`./analyse/${f}.png`));

        const r = alg(err, data, config);
        fs.writeFileSync(`./analyse/${f}.json`, JSON.stringify(r), 'utf8');
        getfile();
    });
};

getfile();