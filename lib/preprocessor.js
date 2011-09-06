
function preprocess(source, type) {
  switch (type) {
    case 'coffee':
      return require('coffee-script').compile(source, {bare: false});
    case 'json':
      source = source.replace('\n', '');
      JSON.parse(source); // just so we have an error thrown if the json is invalid
      return 'exports = (' + source + ');';
    default:
      return source;
  }
};

exports.preprocess = preprocess;
