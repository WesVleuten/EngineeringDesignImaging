module.exports = function({ lightness, lightnesspercentile, CUTOFFDYNAMIC}) {
    let maxvalue = lightness[0];
    for (let i = 1; i < lightness.length; i++) {
        if (maxvalue < lightness[i]) {
            maxvalue = lightness[i];
        }
    }
    console.log(maxvalue);
    return maxvalue * lightnesspercentile;
};