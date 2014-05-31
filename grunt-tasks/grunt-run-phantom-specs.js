/**
 * Tracks status of the specs; if any spec fails (i.e. phantom exits with error),
 * then this becomes false.
 **/
var ok = true;

/**
 * Helper creating centered-aligned (space-padded) text for console printing
 * @param {String} msg
 * @return {String}
 **/
function alignCenter(msg) {
    var cols = process.stdout.columns;
    var len = msg.length;

    if (cols > len) {
        var pad = Math.floor((cols - len) / 2);
        msg = Array(pad).join(" ") + msg;
    }
    return msg;
}

module.exports = function(grunt) {

    /**
     * Factory of phantom exit callbacks. Created callback for n-th spec runs the n+1-st spec,
     * or finishes the grunt task for the last spec.
     * @return {Function} standard node process-exit callback
     **/
    function getPhantomExitCb (specId, allSpecs, cfg, done) {
        var spawnCb = function (error, result, code) {
            if (error) {
                ok = false;
                // code 99 is a custom code which signifies the error
                // was already handled by phantom control script
                if (code != 99) {
                    console.log(error);
                    console.log(code);
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
     */
    function startSpec (n, allSpecs, cfg, done) {
        var printId = n+1;
        var nSpecs = allSpecs.length;
        var msg = "Running spec file " + allSpecs[n] + " [" + printId + "/" + nSpecs + "]";

        var bar = Array(process.stdout.columns).join("*");
        console.log("\n" + bar.cyan);
        console.log(alignCenter(msg).cyan);
        console.log(bar.cyan + "\n");

        startPhantom(allSpecs[n], cfg, getPhantomExitCb(n, allSpecs, cfg, done));
    }

    grunt.task.registerTask('run-phantom-specs', function () {
        grunt.config.requires('run-phantom-specs');
        grunt.config.requires('run-phantom-specs.src');
        var cfg = grunt.config.get('run-phantom-specs');
        var allSpecs = grunt.file.expand(cfg.src);
        if (allSpecs.length == 0) {
            grunt.fail.fatal('No matching specs found by expanding ' + specs.src);
            return;
        }
        cfg.debug = !!cfg.debug || false;
        cfg.verbose = !!cfg.verbose || false;
        var done = this.async();
        startSpec(0, allSpecs, cfg, done);
    });
};
