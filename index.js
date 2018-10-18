console.log('Ready');

const fs = require('fs');
const pngjs = require('pngjs').PNG;
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

try {
    fs.mkdirSync('./frames');
} catch(e) {}

const { exec } = require('child_process');
exec(`aplay ./beep/beep.wav`);

const alg = require('./algorithm.js');
const capture = require('./lib/capture');

const getfile = () => {
    capture(config, function(err, data) {
        alg(err, data, config);
        getfile();
    });
};
getfile();