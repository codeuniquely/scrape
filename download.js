(function(){

  const path = require("path");
  const http = require('http');
  const https = require('https');
  const url = require('url');
  const cheerio = require("cheerio");

  const ProgressBar = require('./report');
  const Files = require('./files');

  const config = require('./config.js');

  // get the image from the site
  // ===========================
  function getImage(where, id, imageUrl, callback){
    var parsedUrl = url.parse(imageUrl);

    // Support HTTPS.
    let protocol = http;
    if(parsedUrl.protocol === "https:") {
      protocol = https;
    }

    // get the file type - Just SMASH it all together - no checks
    const noquery = parsedUrl.href.replace(`?${parsedUrl.query}`, '');
    const download = noquery.replace(config.trimTail, '');
    const postdot = download.split('.').pop(); // .png
    const ext = postdot.split('?')[0].toLowerCase();

    // build the writeable filename
    const filename = `image${id}.${ext}`;

    // Make a reference to the current instance.
    const saveFilepath = path.resolve(__dirname, config.savePath, filename);

    let request = protocol.request(download, response => {
      if(response.statusCode !== 200) {
        return callback(`Error: image, (statusCode: + ${response.statusCode}), ${download}`);
      }

      const stream = Files.createFile(saveFilepath);
      stream.on('error', e => {
        callback(`Error: saving image: ${e}`);
      });
      const len = parseInt(response.headers['content-length'], 10);
      ProgressBar.downloading(where, len);

      response.on('data', data => {
        Files.write(stream, data);
        ProgressBar.tick(data.length);
      });
      response.on('end', () => {
        Files.close(stream);
        callback(null, filename);
      });
      response.on('error', e => {
        Files.close(stream);
        callback(`Error: receiving image: ${e}`);
      });
    });

    request.on('error', e => {
      callback(`Error: loading image: ${e}`);
    });

    request.end();
  }

  module.exports = {

    scrape(where, id, website, callback) {
      const parsedUrl = url.parse(website);

      // Support HTTPS.
      let protocol = http;
      if(parsedUrl.protocol == "https:") {
        protocol = https;
      }

      let request = protocol.request(website, response => {
        if(response.statusCode !== 200) {
          return callback(`scrape(1): Error (statusCode: ${response.statusCode}), ${website}`);
        }
        response.setEncoding('utf8');

        response.on('error', e => {
          callback(`scrape(2): Error while loading web page: ${e}.`);
        });

        let page = '';

        response.on('data', data => {
          page += data;
        });

        // Once the wholepage is loaded
        response.on('end', () => {
          // stick the page into a cheerio DOM doc
          const $ = cheerio.load(page);

          // Target the Image DOM node required
          const target = $(`${config.target}`);
          if (target.length > 0) {
            const imageUrl = target[0].attribs.href;
            if (imageUrl) {
              getImage(where, id, imageUrl, callback);
            } else {
              callback(`No HREF for target ${target[0]}`);
            }
          } else {
            callback(`No matching Img on ${website}`);
          }
        });

      });

      request.on('error', e => {
        callback(`scrape(2): Error while loading web page: ${e}.`);
      });

      request.end();
    }
  }

})();
