/*
  package-js - browser.js

  Synchronous module loading for javascript. Attemts to mimic node's
  module loading system and conforms to CommonJS module loading spec.

  This script is meant for rapid development and should not be used
  in a production enviroment (lots of synchronous GET's to load everything
  is slow and could cause memory leaks).

  Use package-js to build your project for production.

  Author: Johan Nordberg <its@johan-nordberg.com>
*/

(function() {

var modules = {};

this.modules = modules;

function _require(moduleName, basePath) {
  if (modules[moduleName] !== undefined)
    return modules[moduleName];

  if (moduleName.substr(0, 2) == './') {
    var path = moduleName.substr(2, moduleName.length);
    path = normalizePath(basePath !== undefined ? basePath + path : path);
    var module = modules[path] || loadFile(path);
    if (module !== undefined) {
      modules[path] = module;
      return module;
    }
  }

  throw new Error("Cannot find module '" + moduleName + "'");
};
this._require = _require;

/* dummy function to be overridden */
function require(id, basePath) {
  return _require(id, basePath);
};
this.require = require;

/* here's the place to implement script preprocessors.
   e.g. compiling CoffeeScript into javascript
   remember to implement a preprocessor in package.js as well */
function preprocess(source, type) {
  switch (type) {
    case 'coffee':
      if (typeof CoffeeScript != 'undefined') {
        return CoffeeScript.compile(source, {bare: true});
      } else {
        throw new Error('Unable to load .coffee files. CoffeeScript library not loaded');
      }
    case 'json':
      // set json contents as exports
      return 'exports = JSON.parse("' + source.replace('\n', '') + '");';
    default:
      return source;
  }
};

function loadFile(path) {
  console.log('loading', path)

  var request = new XMLHttpRequest();
  request.open('GET', path, false);
  request.send(null);

  if (request.status == 200) {
    // preprocess response
    var response = preprocess(request.responseText,
      path.substr(path.lastIndexOf('.') + 1, path.length));

    // load the response script
    var exports = loadScript(response, path);

    return exports;
  }
};

function loadScript(source, path) {
  var exports, prevExports, script, dir, src = [];

  // get up require path
  dir = path.substr(0, path.lastIndexOf('/') + 1);

  // add wrapper script to keep the require path
  src.push('(function(){');
  src.push('var require = function(id) { return _require(id, "' + dir + '"); };');
  src.push(source);
  src.push('})();');

  // set up new exports context
  prevExports = window.exports;
  window.exports = {};

  // inject script (yes this is synchronous)
  script = document.createElement('script');
  script.type = 'text/javascript';
  script.text = src.join('\n');
  document.head.appendChild(script);

  // restore exports context
  exports = window.exports;
  window.exports = prevExports;

  return exports;
};

/* adaptation of Rasmus Andersson's normalizePath - http://jsperf.com/normalize-path */
function normalizePath(path) {
  var directories = [], parts = path.split("/"), prev;

  for (var i = 0, l = parts.length - 1; i <= l; i++) {
    var directory = parts[i];

    // if it's blank, but it's not the first thing, and not the last thing, skip it.
    if (directory === "" && i !== 0 && i !== l) continue;

    // if it's a dot, and there was some previous dir already, then skip it.
    if (directory === "." && prev !== undefined) continue;

    // if it starts with "", and is a . or .., then skip it.
    if (directories.length === 1 && directories[0] === "" &&
        (directory === "." || directory === "..")) continue;

    if (directory === ".." && directories.length && prev !== ".." &&
        prev !== "." && prev !== undefined && (prev !== "")) {
      directories.pop();
      prev = directories.slice(-1)[0]
    } else {
      if (prev === ".") directories.pop();
      directories.push(directory);
      prev = directory;
    }
  }
  return directories.join("/");
};

}).apply((typeof exports != 'undefined') ? exports : this);
