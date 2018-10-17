const hough = function(process, config) {
    const { houghMaxCutoff } = config;
    const houghheight = 720;
    const houghwidth = 180;

    // allocate buffer according to hough height and width
    const hough = Buffer.alloc(houghheight * houghwidth);

    let houghMax = 0;
    const hhwidth = houghwidth /2;
    const hhheight = houghheight /2;
    const degreetorad = Math.PI / 180;
    const houghIndexes = [];
    const points = process.middlepoints;
    for (let i = 0; i < points.length; i++) {
        const idx = points[i];
        const pointA = idx % process.width;
        const pointB = Math.floor(idx / process.width);

        // r(o) = x * cos(o) + y * sin(o)
        const r = omega => (pointA * Math.cos(omega)) + (pointB * Math.sin(omega));
        for (let x = 0; x < houghwidth; x++) {

            // calculate all y values for all x-es
            const y = Math.round( r((x * degreetorad) - hhwidth) + hhheight );
            if (y < 0 || y >= houghheight) continue;

            let idx = y * houghwidth + x;

            hough[idx] += 8;
            //calculate maximum hough value
            if (hough[idx] > houghMax) {
                houghMax = hough[idx];
                if (houghIndexes.indexOf(idx) == -1) {
                    houghIndexes.push(idx);
                }
            }
        }
    }
    houghMax *= houghMaxCutoff;

    // get index from cords
    const getindex = (x, y) => y * houghwidth + x;
    const houghPoints = [];
    for (let j = 0; j < houghIndexes.length; j++) {
        let i = houghIndexes[j];
        if (hough[i] > houghMax) {
            // easy function to get cords from index
            const c = {
                x: (i % houghwidth),
                y: Math.floor(i / houghwidth)
            };

            // neighbour suppression
            // this suppresses any lines that look much like the one we have detected at c
            hough[getindex(c.x   , c.y +1)] = 0;
            hough[getindex(c.x   , c.y -1)] = 0;
            hough[getindex(c.x +1, c.y +1)] = 0;
            hough[getindex(c.x +1, c.y   )] = 0;
            hough[getindex(c.x +1, c.y -1)] = 0;
            hough[getindex(c.x -1, c.y +1)] = 0;
            hough[getindex(c.x -1, c.y   )] = 0;
            hough[getindex(c.x -1, c.y -1)] = 0;

            // get omega from x cord
            const omegaRad = (c.x * degreetorad) - hhwidth;
            // get r from y cord
            const r = c.y - hhheight;

            // sin and cos for ease of calculation
            const cosOmega = Math.cos(omegaRad);
            const sinOmega = Math.sin(omegaRad);

            // get a and b from y = a * x + b
            const velocity = -1 * cosOmega / sinOmega;
            const constant = r / sinOmega;

            // push values to array
            houghPoints.push([velocity, constant]);
        }
    }
    return houghPoints;
};

module.exports = hough;