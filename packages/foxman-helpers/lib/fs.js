const pify = require('pify');
const del = require('del');
const mkdirp = require('mkdirp');
const readJSONFile = require('load-json-file');
const fs = require('fs');
const path = require('path');

const pfs = Object.assign(pify(fs), {
    write(filepath, content) {
        const dir = path.dirname(filepath);
        return pify(mkdirp)(dir).then(() => {
            return pify(fs.writeFile)(filepath, content);
        });
    },
    del,
    readJSONFile
});

module.exports = pfs;
