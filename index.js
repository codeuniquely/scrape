var fs = require("fs");
var http = require("http");
var https = require("https");
var path = require("path");
var url = require("url");

// third party libs
var cheerio = require("cheerio");
var csv = require('fast-csv');


// let webRoot = 'http://marvel.wikia.com/wiki/';
const config = require('./config.js');

// const scrape = new Scraper();
const savePath = path.resolve(__dirname, config.savePath);

// processed record count
let records = 0;
let currentImage = '';
let writeFilename = '';

// Processing data
let header = [];
let processedRecords = [];

// // The "Image" class.
// function Image(image, address){
//   var at = this.attributes = image.attribs;
//   this.name = path.basename(at.src, path.extname(at.src));
//   this.saveTo = path.dirname(require.main.filename) + "/";
//   this.extension = path.extname(at.src);
//   this.address = url.resolve(address, at.src);
//   this.fromAddress = address;
// }

// the image
let image = null;

function clearArray() {
  processedRecords = [];
}

function save(callback){

  var parsedUrl = url.parse(this.address);

  // Support HTTPS.
  var protocol = http;
  if(parsedUrl.protocol === "https:") {
    protocol = https;
  }

  // Make a reference to the current instance.
  // var ref = this;

  var request = protocol.request(this.address, function(response){
    if(response.statusCode != 200){
      console.error(`Image scraper(3): image couldn't be found. (statusCode: + ${response.statusCode})`);
      return request.end();
    } else{
      var imageFile = fs.createWriteStream(path.resolve(savePath, ref.name + ref.extension));
      imageFile.on('error', function(e){
        console.error(`Image scraper(4): error while loading image: ${e}.`);
      });
      response.on('data', function(data) {
        imageFile.write(data);
      });
      response.on('end', function(){
        imageFile.end();
        if (typeof(callback) === 'function') {
          callback.call(ref);
        }
      });
    }
  });
  request.end();
  request.on('error', function(e) {
    console.error(e);
  });
};

function scrape(website, id, callback) {
  const parsedUrl = url.parse(website);

  // Support HTTPS.
  let protocol = http;
  if(parsedUrl.protocol == "https:") {
    protocol = https;
  }

  var request = protocol.request(website, function(response) {
    if(response.statusCode === 200){
      response.setEncoding('utf8');

      var current;
      var previous = '';

      response.on('data', function(data) {
        var current = previous + data;
        current.replace(/<img[\S\s]*?>/ig, function(m) {
          var image = new Image(cheerio.load(m)('img')[0], website);
          callback(id, image);
        });
        previous = data;
      });
    } else {
      console.error(`Image scraper(1): web page couldn't be found. (statusCode: ${response.statusCode})`);
      request.end();
      return process.exit(1);
    }
  });

  request.end();

  request.on('error', function(e){
    console.error(`Image scraper(2): error while loading web page: ${e}.`);
  });
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
    console.log('.');
    processedRecords.push(buildRecord(data));
  }
  records++;
}

function downloadImages(done) {
  console.log('START DOWNLOAD');
  function processRecord(index) {
    if (index === processedRecords.length) {
      console.log('END DOWNLOAD');
      // write the new CSV to disc
      done();
    }
    const record = processedRecords[index];
    scrape(record.webpage, record.id, function(filename) {
      processedRecords.filename = filename;
      processRecord(index + 1);
    });
  }
  processRecord(0);
}

// loop through all teh record and write them to a csv
function saveNewCSV() {
}

function run () {
  // clear down the array
  clearArray();

  csv.fromPath(config.file)
    .on('data', function(data){
      processRecord(data);
    })
    .on('end', function(){
      console.log('CSV ENDS');
      downloadImages(function() {
        saveNewCSV();
        console.log(`finished procesing ${records}`);
      });
    });
}

// Args
// scrape [options.json]
run();
