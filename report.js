(function() {

  const ProgressBar = require('progress');

  // where all the records go
  let bar;

  // bar = new ProgressBar(` missing     ${where} [:bar]`, {
  // bar = new ProgressBar(` already     ${where} [:bar]`, {
  // bar = new ProgressBar(` downloading ${index} [:bar] :rate/bps :percent :etas`, {
  module.exports = {
    already( where, length ) {
      bar = new ProgressBar(` already     ${where} [:bar]`, {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: length
      });
    },
    missing( where, length ) {
      bar = new ProgressBar(` missing     ${where} [:bar]`, {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: length
      });
    },
    downloading(where, length) {
      bar = new ProgressBar(` downloading ${where} [:bar] :rate/bps :percent :etas`, {
        complete: '=',
        incomplete: ' ',
        width: 50,
        total: length
      });
    },
    tick(length) {
      bar.tick(length);
    }
  };

})();
