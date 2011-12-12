
var path = require('path');

var removeDuplicates = exports.removeDuplicates = function(array) {
  var rv = [];
  for (var i = 0; i < array.length; i++)
    if (rv.indexOf(array[i]) == -1) rv.push(array[i]);
  return rv;
};

var log = exports.log = function(message, newline, indent) {
  if (indent === undefined) indent = 0;
  for (var i = 0; i < indent; i++) message = '  ' + message;
  process.stderr.write('' + message);
  if (newline === true || newline === undefined)
    process.stderr.write('\n');
};

var printTree = exports.printTree = function(tree, depth) {
  if (depth === undefined) depth = 0;
  for (var name in tree) {
    var val = tree[name];
    log(path.basename(name), true, depth);
    if (typeof val == 'object') printTree(val, depth + 1);
  }
};
