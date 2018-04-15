var path = require("path");
const config = require('./config.js');

// local modules
const Files = require('./files');
const Records = require('./records');
const Missing = require('./missing');
const Download = require('./download');
const ProgressBar = require('./report');

const savePath = path.resolve(__dirname, config.savePath);

// maximum nuber fo records to process
const maxRecords = undefined; // 1000;

function processAllRecords(done) {
  // How many records where loaded
  const count = Records.count;

  // How many records will be processed
  const willStopAt = maxRecords ? maxRecords : count;

  function processRecord(index) {
    if (index === willStopAt) {
      // ============================================
      // ALL DOWNLOAD PROCESSING IS NOW COMPLETE HERE
      // ============================================
      console.log(`processed ${willStopAt} records`);
      return done();
    }

    const where = `${index}/${count}`;

    const record = Records.get(index);
    const id = record[config.idColumn];

    // does an image aready exist for this id
    const filename = Files.doesFileForIdExist(id);
    const missing = Missing.exists(id);

    if (filename) {
      ProgressBar.already(where, 1);
      Records.update(where, index, filename);
      ProgressBar.tick(1);
      processRecord(index + 1);
    } else if (missing) {
      ProgressBar.missing(where, 1);
      Records.update(where, index, 'missing.jpg');
      ProgressBar.tick(1);
      processRecord(index + 1);
    } else {
      Download.scrape(where, id, record.webpage, (err, filename) => {
        if(err) {
          filename = 'missing.jpg';
          Missing.update(where, { id:id, msg: err });
        }
        Records.update(where, index, filename);
        processRecord(index + 1);
      });
    }
  }

  // loop
  processRecord(0);
}

function loadMissing(callback) {
  Missing.init(config);
  Missing.load(callback);
}

function loadRecords(callback) {
  Records.init(config);
  Records.load(callback)
}

function buildIndex(done) {
  const count = Records.count;
  for(let index = 0; index < count; index++) {
    const where = `${index}/${count}`;
    const record = Records.get(index);
    const id = record[config.idColumn];
    const filename = Files.doesFileForIdExist(id);
    if (filename) {
      ProgressBar.already(where, 1);
      Records.update(where, index, filename);
      ProgressBar.tick(1);
    } else {
      ProgressBar.missing(where, 1);
      Records.update(where, index, 'missing.jpg');
      ProgressBar.tick(1);
    }
  }
  console.log(`processed ${count} records`);
  done();
}

function run () {
  Files.ensureWritePath();
  loadMissing(() => {
    loadRecords(() => {
      console.log('Starting download...');
      // buildIndex(() => {
      //   Records.save(() => {
      //     console.log('Finished!'); // eslint-disable-line no-console
      //   });
      // });
      processAllRecords(() => {
        Records.save(() => {
          console.log('Finished!'); // eslint-disable-line no-console
        });
      });
    });
  });
}

// run the app
run();
