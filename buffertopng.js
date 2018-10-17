const input = './frames/raspiyuvbuffer_1539693194684';

const width = 160;
const height = 90;

const fs = require('fs');
const pngjs = require('pngjs').PNG;

const buffer = fs.readFileSync(input);
let rgba = [];
let i = 0;
console.log(buffer);
console.log(buffer.length);
while (i < buffer.length) {
    const l = buffer[i++];
    rgba.push(l);
    rgba.push(l);
    rgba.push(l);
    rgba.push(0xff);
}

const im = new pngjs({
    width,
    height
});
im.data = rgba;
im.pack().pipe(fs.createWriteStream('./output.png'));
