const path = require('path');

module.exports = {
    target: 'node',
    entry: './index.js',
    mode: 'production',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
