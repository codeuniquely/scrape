(function(){

  const fs = require('fs');
  const path = require("path");
  const config = require('./config.js');

  function exists(file) {
    return fs.existsSync(file);
  }

  module.exports = {

    ensureWritePath() {
      const writePath = path.resolve(__dirname, config.savePath);
      if (!fs.existsSync(writePath)) {
        fs.mkdirSync(writePath);
      }
    },

    doesFileExist(path) {
      return exists(path);
    },

    doesFileForIdExist(id) {
      const jpg = path.resolve(__dirname, config.savePath, `image${id}.jpg`);
      if (exists(jpg)) {
        return `image${id}.jpg`;
      }
      const png = path.resolve(__dirname, config.savePath, `image${id}.png`);
      if (exists(png)) {
        return `image${id}.png`;
      }
      const gif = path.resolve(__dirname, config.savePath, `image${id}.gif`);
      if (exists(gif)) {
        return `image${id}.gif`;
      }
      return;
    },

    createFile(path) {
      return fs.createWriteStream(path);
    },

    write(stream, data) {
      stream.write(data);
    },

    close(stream) {
      stream.end();
    },
  }

})();
