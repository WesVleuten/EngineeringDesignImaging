const imagestart = function(buffer, config) {
    const { inputwidth, inputheight } = config;
    const heightskipped = Math.floor(inputheight * config.startY);
    const height = inputheight - heightskipped;
    const process = {
        slice: [ heightskipped * inputwidth, inputheight * inputwidth ],
        input: {
            width: inputwidth,
            height: inputheight,
            exposure: 'antishake'
        },
        height: height,
        width: inputwidth,
        screen: null,
        lightnesscutoff: 255,
        user: {
            y: height,
            x: Math.round(inputwidth/2)
        }
    };
    return process;
};

module.exports = imagestart;