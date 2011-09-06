
var fs = require('fs');
var path = require('path');
var async = require('async');
var preprocess = require('./preprocessor').preprocess;
var utils = require('./utils');

function parseFile(contents, filePath, tree, callback) {
  // preprocess the source (compile coffescript etc)
  var source = preprocess(contents, path.extname(filePath).substr(1));

  // parse out all require calls and get the path
  // excuse my horrible regex, probably a better way to write this
  var re = /require\(('|")[^('|")]+/g;
  var deps = (source.match(re) || [] ).map(function(v) {
    var dep = v.substr(9);
    return path.join(path.dirname(filePath), dep);
  });

  // remove duplicates, a file could have several require calls to same module
  deps = utils.removeDuplicates(deps);

  // add any dependencies to tree
  async.forEach(deps, function(depPath, callback) {
    buildDependencyTree(depPath, tree, callback);
  }, callback);
};

function buildDependencyTree(filePath, tree, callback) {
  filePath = path.normalize(filePath);

  fs.readFile(filePath, 'utf8', function(error, data) {
    if (error) {
      tree[filePath] = null;
      callback(error);
    } else {
      // add file to tree and find its dependencies
      tree[filePath] = {};
      parseFile(data, filePath, tree[filePath], callback);
    }
  });
};

function buildModule(modulePath, callback) {
  fs.readFile(modulePath, 'utf8', function(error, data) {
    if (error) return callback(error);

    var source = preprocess(data, path.extname(modulePath).substr(1));
    var dir = path.dirname(modulePath);
    var output = [];

    // wrap the source in a context with correct require path and exports
    output.push('(function(){ // begin ' + path.basename(modulePath));
    output.push('var exports = {};');
    output.push('var require = function(id) { return _require(id, "' + dir + '"); };');
    output.push(source);
    output.push('modules["' + modulePath + '"] = exports;');
    output.push('})(); // end ' + path.basename(modulePath) + '\n');

    callback(null, output.join('\n'));
  });
};

function buildOutput(dependencyTree, callback) {
  var modules = [];

  // sort modules by tree depth
  function recdep(tree) {
    for (var name in tree) {
      modules.push(name);
      if (typeof tree[name] == 'object') recdep(tree[name]);
    }
  };
  recdep(dependencyTree);

  // reverse so that modules deepest in tree are loaded first
  modules = modules.reverse();

  // remove eventual duplicates
  modules = utils.removeDuplicates(modules);

  // build the modules
  async.parallel([
    function(callback) {
      async.map(modules, buildModule, callback);
    },
    function(callback) {
      var templatePath = path.join(path.dirname(fs.realpathSync(__filename)), '../templates/package.js');
      fs.readFile(templatePath, 'utf8', callback);
    }
  ], function(error, results) {
    if (error) { callback(error); } else {
      var moduleSource = results[0].join('');
      var templateSource = results[1];
      callback(null, templateSource + moduleSource);
    }
  });
};

function package(scripts, callback) {
  var tree = {};
  // build a map of all files passed and build output using it
  async.map(scripts, function(script, callback) {
    buildDependencyTree(script, tree, callback);
  }, function(error) {
    if (error) callback(error);
    else buildOutput(tree, callback);
  });
};

// exports
exports.buildDependencyTree = buildDependencyTree;
exports.buildOutput = buildOutput;
exports.package = package;
