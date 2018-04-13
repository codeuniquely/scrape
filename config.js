const config = {
  file: 'data.csv',
  idColumn: 'page_id',
  urlColumn: 2,
  imageColumn: 'image',
  savePath: 'images',
  trimTail: '/revision/latest',
  site: 'http://marvel.wikia.com/wiki/',
  target: '#mw-content-text figure.pi-image a.image-thumbnail',
  index: 0,
};

module.exports = config;
