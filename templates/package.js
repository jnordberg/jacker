// built with jacker
var modules, require, _require;
(function() {

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

modules = {};

_require = function(id, basePath) {
  if (basePath) id = normalizePath(basePath + '/' + id);
  return modules[id];
};

/* dummy function to be overridden */
require = function(id, basePath) {
  return _require(id, basePath);
};

})();
