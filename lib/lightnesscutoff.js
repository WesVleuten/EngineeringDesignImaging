module.exports = function({ lightness, lightnesspercentile, CUTOFFDYNAMIC}) {
    console.time('lightcutoff');
    let lightnesscutoff = Buffer.from(lightness).sort((a, b) => a - b)[Math.round(lightness.length * lightnesspercentile)];
    console.timeEnd('lightcutoff');
    return lightnesscutoff;
};