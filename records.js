(function() {

  const fs = require('fs');
  const path = require("path");
  const csv = require('fast-csv');
  const ProgressBar = require('./report');
  const config = require('./config.js');

  // Header for the "missing" file
  let header = [];
  let headerRow = true;

  // where all the records go
  let records = [];
  let filename = '';
  let writeFilename = '';


  function saveCSV(callback) {
    const csvStream = csv.format({ headers: true });
    const writableStream = fs.createWriteStream(writeFilename);

    writableStream.on('finish', () => {
      callback();
    });

    csvStream.pipe(writableStream);
    for(let i = 0; i < records.length; i++) {
      const record = records[i];
      csvStream.write(record);
    }
    csvStream.end();
  }

  function addRecord(record) {
    records.push(record);
  }

  function buildRecord(data) {
    const record = {};
    for(let i = 0; i < header.length; i++) {
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

  function processRecord(data) {
    if (headerRow) {
      headerRow = false;
      header = data;
    } else {
      addRecord(buildRecord(data));
    }
  }

  module.exports = {
    init() {
      // calculate the filename just the once
      filename = path.resolve(__dirname, config.file, );
      writeFilename = path.resolve(__dirname, config.savePath, 'processed.csv');
      // reset the records
      records = [];
    },
    load(callback) {
      csv.fromPath(filename)
        .on('data', data => {
          processRecord(data);
        })
        .on('end', () => {
          callback();
        });
    },
    update(where, index, filename) {
      records[index].filename = filename;
    },
    save(callback) {
      saveCSV(() => {
        callback();
      });
    },
    get(index) {
      return records[index];
    },
    get count () {
      return records.length;
    },
  };

})();
