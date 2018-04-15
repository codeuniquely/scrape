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
  let lastFind = 0;

  function find(id) {
    let found = false;
    for(let i = lastFind; i < records.length; i++) {
      const record = records[i];
      if (record.id === id) {
        found = true;
        break;
      }
      lastFind++;
    }
    return found;
  }

  function save() {
    const csvStream = csv.format({ headers: true });
    const writableStream = fs.createWriteStream(filename);
    csvStream.pipe(writableStream);
    for(let i = 0; i < records.length; i++) {
      const record = records[i];
      csvStream.write(record);
    }
    csvStream.end();
  }

  function addRecord(record) {
    records.push(record);
    save();
  }

  function buildRecord(data) {
    const record = {};
    for(let i = 0; i < header.length; i++) {
      let name = header[i].toLowerCase();
      let value = data[i];
      record[name] = value;
    }
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
      filename = path.resolve(__dirname, config.savePath, 'missing.csv');
      // reset the records
      records = [];
    },
    exists(id) {
      return find(id);
    },
    load(callback) {
      // if the file does not exist on disc - callback
      if (!fs.existsSync(filename)) {
        return callback();
      }
      // otherwise process the file
      csv.fromPath(filename)
        .on('data', data => {
          processRecord(data);
        })
        .on('end', function(){
          callback();
        });
    },
    update(where, record) {
      ProgressBar.missing(where, 1);
      addRecord(record);
      ProgressBar.tick(1);
    }
  };

})();
