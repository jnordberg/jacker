
var fs = require('fs');
var path = require('path');
var async = require('async');
var packager = require('./packager');
var utils = require('./utils');

function main() {
  var optimist  = require('optimist')
    .usage(
      'Packages a javascript application and its dependencies into a single file.\n\n' +
      'Usage: $0 <files>')
    .describe('o', 'Output to file insted of stdout')
    .describe('c', 'Compress the output using uglify-js').boolean('c')
    .describe('t', 'Print dependency tree for files and quit').boolean('t')
    .describe('q', 'Don\'t print any information to stderr').boolean('q')
    .describe('b', 'Build and output browser development script').boolean('b')
    .alias('o', 'output')
    .alias('c', 'compress')
    .alias('t', 'show-tree')
    .alias('q', 'quiet')
    .alias('b', 'browser')

  var argv = optimist.argv;
  var scripts = argv._;

  if (!scripts.length && !argv.browser) {
    optimist.showHelp();
    return;
  }

  function log(message, newline, indent) {
    if (!argv.quiet) utils.log(message, newline, indent);
  };

  function write(contents) {
    var out = (argv.output) ? fs.createWriteStream(argv.output) : process.stdout;
    log('writing output...', false);
    out.write(contents, function(error) {
      if (error) throw error;
      else {
        log('ok\n');
        log('file size: ' + (out.bytesWritten / 1024).toFixed(2) + 'kb\n');
      }
    });
  };

  function compress(source) {
    var jsp = require("uglify-js").parser;
    var pro = require("uglify-js").uglify;

    log('compressing source...', false);
    var ast = jsp.parse(source); // parse code and get the initial AST
    ast = pro.ast_mangle(ast); // get a new AST with mangled names
    ast = pro.ast_squeeze(ast); // get an AST with compression optimizations
    source = pro.gen_code(ast); // compressed code here
    log('ok');

    return source;
  };

  if (argv.browser) {
    log('building browser script\n');
    var templatePath = path.join(path.dirname(fs.realpathSync(__filename)), '../templates/browser.js');
    fs.readFile(templatePath, 'utf8', function(error, source) {
      if (error) throw error;
      if (argv.compress) source = compress(source);
      write(source);
    });
    return;
  }

  log('\nprocessing files:\n  ' + scripts.join('\n  '));
  log('');

  if (argv['show-tree']) {
    var tree = {};
    async.forEach(scripts, function(script, callback) {
      packager.buildDependencyTree(script, tree, callback);
    }, function(error) {
      if (error) throw error;
      log('dependency tree:');
      utils.printTree(tree, 1);
      log('');
    });
  } else {
    packager.package(scripts, function(error, source) {
      if (error) throw error;
      if (argv.compress) source = compress(source);
      write(source);
    });
  }
};

exports.main = main;
