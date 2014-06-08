/**
 * Tracks status of the specs; if any spec fails (i.e. phantom exits with error because some suite failed),
 * then this becomes false.
 **/
var ok = true;

/**
 * Helper creating centered-aligned (space-padded) text for console printing
 * @param {String} msg
 * @return {String}
 **/
function alignCenter (msg) {
    var cols = process.stdout.columns;
    var len = msg.length;

    if (cols > len) {
        var pad = Math.floor((cols - len) / 2);
        msg = Array(pad).join(" ") + msg;
    }
    return msg;
}

/**
 * Disables colored output for this module when called.
 */
function noColors () {
    String.prototype.cyan = function () {
        return this.toString();
    };
}

/**
 * This module provides a generic lighweight task 'run-phantom-specs' which reads
 * from config a list of "spec files" to execute, and then executes them one by one.
 * <br>
 * A "spec file" is understood as a standalone "PhantomJS control script".<br>
 * A failure is understood as PhantomJS exiting with code != 0.<br>
 * <br>
 * The value brought by this module are:
 * - simple interface
 * - error handling
 * - logging
 * - Grunt workflow compat (fail grunt if any test fails).
 */
module.exports = function (grunt) {

    /**
     * Factory of phantom exit callbacks. Created callback for n-th spec runs the n+1-st spec,
     * or finishes the grunt task for the last spec.
     * @return {Function} standard node process-exit callback
     **/
    function getPhantomExitCb (specId, allSpecs, cfg, done) {
        var spawnCb = function (error, result, code) {
            if (error) {
                ok = false;
                if (cfg.debug) {
                    console.log("PhantomJS exited with code "  + code);
                }
            }
            var nextSpecId = specId + 1;
            if (nextSpecId == allSpecs.length) { // last spec
                done(ok);
            } else {
                startSpec (nextSpecId, allSpecs, cfg, done);
            }
        };
        return spawnCb;
    }

    /**
     * Boots phantomjs executable with `specPath` as a param, and executes
     * given callback `cb` when phantom process exits.
     * @param {String} specPath
     * @param {Object} cfg
     * @param {Function} cb
     */
    function startPhantom (specPath, cfg, cb) {
        var args = [specPath];
        if (cfg.verbose) {
            args.push("--verbose"); // custom, to be handled by spec runner
        }
        if (cfg.debug) {
            args.push("--debug"); // custom, to be handled by spec runner
        }
        if (cfg.color) {
            args.push("--color"); // custom, to be handled by spec runner
        }
        args.push("--xunitName=" + cfg.xunitName);
        var phantomProcess = grunt.util.spawn({
            cmd : 'phantomjs',
            args : args
        }, cb);

        phantomProcess.stdout.pipe(process.stdout);
        phantomProcess.stderr.pipe(process.stderr);
        return phantomProcess;
    }

    /**
     * Prints some info and relays config to start the n-th spec
     * @param {Integer} n
     * @param {Array} allSpecs
     * @param {Object} cfg
     * @param {Function} done
     */
    function startSpec (n, allSpecs, cfg, done) {
        var printId = n + 1;
        var specPath = allSpecs[n];
        var nSpecs = allSpecs.length;
        var msg = "Running spec file " + specPath + " [" + printId + "/" + nSpecs + "]";

        var bar = Array(process.stdout.columns).join("*");
        console.log("\n" + bar.cyan);
        console.log(alignCenter(msg).cyan);
        console.log(bar.cyan + "\n");

        var cb = getPhantomExitCb(n, allSpecs, cfg, done);
        startPhantom(specPath, cfg, cb);
    }

    /**
     * Runs, sequentially, spec files found on disk matching the expanded `src` value.
     *
     * Passes the "debug", "verbose", "color" opts as command line flags ("--debug" etc.)
     * to PhantomJS executable for consideration by the the Phantom control script.
     *
     * "xunitName" opt tells Phantom control script under what global variable it should
     * make available the XUnit object.
     *
     * Sample config:
     * <pre>
     *    grunt.config('run-phantom-specs', {
     *      src : ["test/spec*.js"],
     *      debug : true,                   // default false
     *      verbose : true                  // default false
     *      color: process.stdout.isTTY     // default false
     *      xunitName : "assert"           // default "assert"
     *    });
     * </pre>
     */
    grunt.task.registerTask('run-phantom-specs', function () {
        grunt.config.requires('run-phantom-specs');
        grunt.config.requires('run-phantom-specs.src');
        var cfg = grunt.config.get('run-phantom-specs');
        var allSpecs = grunt.file.expand(cfg.src);
        if (allSpecs.length == 0) {
            grunt.fail.fatal('No matching specs found by expanding ' + specs.src);
            return;
        }

        // normalize config
        cfg.xunitName = cfg.xunitName || "assert";
        cfg.debug = !!cfg.debug;
        cfg.verbose = !!cfg.verbose;
        cfg.color = !!cfg.color;
        if (!cfg.color) {
            noColors();
        }

        var done = this.async();
        startSpec(0, allSpecs, cfg, done);
    });
};
