const capture = function (config, cb) {
    const filename = './frames/raspiyuvbuffer_' + Date.now();
    const { width, height, exposure } = config.input;
    exec(`raspiyuv --luma --timeout 1 --output ${filename} --width ${width} --height ${height} --exposure ${exposure}`, (err, stdout, stderr) => {
        console.log(err, stdout, stderr);
        fs.readFile(filename, function(err, data) {
            cb(err, data);
        });
    });
}