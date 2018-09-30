const input = './test';

const width = 160;
const height = 90;

const fs = require('fs');
const pngjs = require('pngjs').PNG;

const buffer = fs.readFileSync('./test');
let rgba = [];
let i = 0;
console.log(buffer);
console.log(buffer.length);
while (i < buffer.length) {
    const r = buffer[i++];
    const g = buffer[i++];
    const b = buffer[i++];
    rgba.push(r);
    rgba.push(g);
    rgba.push(b);
    rgba.push(0xff);
}

const im = new pngjs({
    width,
    height
});
im.data = rgba;
im.pack().pipe(fs.createWriteStream('./output.png'));
