var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");
var url = require("url");

// third party libs
var cheerio = require("cheerio");
var csv = require('fast-csv');

const config = require('./config.js');

const savePath = path.resolve(__dirname, config.savePath);

// processed record count
let records = 0;

// Processing data
let header = [];
let processedRecords = [];

// Functions
// ===================
function clearArray() {
  processedRecords = [];
}

function ensureWritePath() {
  const writePath = path.resolve(__dirname, config.savePath);
  if (!fs.existsSync(writePath)) {
    fs.mkdirSync(writePath);
  }
}

function getImage(id, imageUrl, callback){
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
  const savedPath = path.resolve(__dirname, config.savePath, filename);

  // WHAT IS THE IMAGE
  // const reqImageUrl = '' + `${download}`;
  // console.log('Getting image', download.replace(config.site, '...'));

  var request = protocol.request(download, response => {
    if(response.statusCode != 200){
      console.error(`scrape(3): Error Image, (statusCode: + ${response.statusCode}), ${download}`);
      // return request.end();
    } else {
      var imageFile = fs.createWriteStream(savedPath);
      imageFile.on('error', function(e){
        console.error(`scrape(4): error while loading image: ${e}.`);
      });
      response.on('data', data => {
        imageFile.write(data);
      });
      response.on('end', () => {
        imageFile.end();
        callback(filename);
      });
    }
  });
  request.end();
  request.on('error', e => {
    console.error(`scrape(5): Error while loading image: ${e}.`);
  });
};

function scrape(id, website, callback) {
  const parsedUrl = url.parse(website);

  // Support HTTPS.
  let protocol = http;
  if(parsedUrl.protocol == "https:") {
    protocol = https;
  }

  let request = protocol.request(website, response => {
    if(response.statusCode === 200){
      response.setEncoding('utf8');

      let page = '';
      response.on('data', data => {
        page += data;
      });

      // Once the wholepage is loaded
      response.on('end', function() {
        // stick the page into a cheerio DOM doc
        const $ = cheerio.load(page);

        // Target the Image DOM node required
        const target = $(`${config.target}`);
        if (target.length > 0) {
          const imageUrl = target[0].attribs.href;
          if (imageUrl) {
            getImage(id, imageUrl, callback);
          } else {
            console.log('No HREF for target', target[0]);
            callback('missing.jpg');
          }
        } else {
          console.log('No IMAGE for', website);
          callback('missing.jpg');
        }
      });
    } else {
      console.error(`scrape(1): Error (statusCode: ${response.statusCode}), ${website}`);
      callback('missing.jpg');
    }
  });

  request.on('error', function(e){
    console.error(`scrape(2): Error while loading web page: ${e}.`);
  });

  request.end();
};

function buildRecord(data) {
  const record = {};
  for(let i=0 ; i<header.length ; i++) {
    let name = header[i].toLowerCase();
    let value = data[i];
    if (i === config.urlColumn) {
      const page = data[config.urlColumn];
      name = 'webpage';
      value = `${config.site}${page.replace('\\\/', '')}`;
    }
    record[name] = value;
  }
  record.filename = '';
  return record;
}

// \/Thomas_Sorenson_(Earth-616) => Thomas_Sorenson_(Earth-616)
function processRecord(data) {
  if (records === 0) {
    header = data;
  } else {
    processedRecords.push(buildRecord(data));
  }
  records++;
}

function downloadImages(done) {
  console.log('Starting download...');
  function processRecord(index) {
    if (index === processedRecords.length) {
      console.log('Completed download.');
      return done();
    }
    const record = processedRecords[index];
    const id = record[config.idColumn];
    scrape(id, record.webpage, filename => {
      processedRecords[index].filename = filename;
      processRecord(index + 1);
    });
  }
  processRecord(0);
}

// loop through all teh record and write them to a csv
function saveNewCSV() {
  const filename = path.resolve(__dirname, config.savePath, 'processed.csv');
  const csvStream = csv.format({ headers: true });
  const writableStream = fs.createWriteStream(filename);

  writableStream.on('finish', () => {
    console.log(`processed ${records} records`);
    console.log('Finished!'); // eslint-disable-line no-console
  });

  csvStream.pipe(writableStream);
  for(let i = 0; i < processedRecords.length; i++) {
    const record = processedRecords[i];
    csvStream.write(record);
  }

  csvStream.end();
}

function run () {
  // clear down the array
  clearArray();
  ensureWritePath();

  csv.fromPath(config.file)
    .on('data', data => {
      processRecord(data);
    })
    .on('end', function(){
      console.log('CSV ENDS');
      downloadImages(() => {
        saveNewCSV();
      });
    });
}

// Args
// scrape [options.json]
run();
