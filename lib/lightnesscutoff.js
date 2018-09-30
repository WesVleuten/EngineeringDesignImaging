module.exports = function({ lightness, lightnesspercentile, CUTOFFDYNAMIC}) {
    console.time('lightcutoff');
    let lightnesscutoff;
    if (CUTOFFDYNAMIC) {
        lightnesscutoff = lightness.slice().sort((a, b) => a - b)[Math.round(lightness.length * lightnesspercentile)];
    } else {
        lightnesscutoff = Math.max(...lightness) - 60;
    }
    console.timeEnd('lightcutoff');
    return lightnesscutoff;
};