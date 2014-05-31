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
     * Tracks status of the specs; if any spec fails (i.e. phantom exits with error),
     * then this becomes false.
     **/
    var ok = true;

    /**
     * Factory of phantom exit callbacks. Created callback for n-th spec runs the n+1-st spec,
     * or finishes the grunt task for the last spec.
     * @return {Function} standard node process-exit callback
     **/
    var getPhantomExitCb = function (specId, allSpecs, done) {
        var spawnCb = function (error, result, code) {
            if (error) {
                ok = false;
                if (code != 99) {
                    console.log(error);
                    console.log(code);
                }
            }
            var nextSpecId = specId + 1;
            if (nextSpecId == allSpecs.length) { // last spec
                done(ok);
            } else {
                startSpec (nextSpecId, allSpecs, done);
            }
        };
        return spawnCb;
    }

    /**
     * Boots phantomjs executable with `specPath` as a param, and executes
     * given callback `cb` when phantom process exits.
     * @param {String} specPath
     * @param {Function} cb
     */
    function startPhantom (specPath, cb) {
        var phantomProcess = grunt.util.spawn({
            cmd : 'phantomjs',
            args : [specPath]
        }, cb);

        phantomProcess.stdout.pipe(process.stdout);
        phantomProcess.stderr.pipe(process.stderr);
        return phantomProcess;
    }

    function startSpec (n, allSpecs, done) {
        var printId = n+1;
        var nSpecs = allSpecs.length;
        var msg = "Running spec file " + allSpecs[n] + " [" + printId + "/" + nSpecs + "]";

        var bar = Array(process.stdout.columns).join("*");
        console.log("\n" + bar.cyan);
        console.log(alignCenter(msg).cyan);
        console.log(bar.cyan + "\n");
        startPhantom(allSpecs[n], getPhantomExitCb(n, allSpecs, done));
    }


    grunt.task.registerTask('run-phantom', function () {
        grunt.config.requires('run-phantom');
        grunt.config.requires('run-phantom.src');
        var specs = grunt.config.get('run-phantom');
        var allSpecs = grunt.file.expand(specs.src);
        if (allSpecs.length == 0) {
            grunt.fail.fatal('No matching specs found by expanding ' + specs.src);
            return;
        }
        var done = this.async();
        startSpec(0, allSpecs, done);
    });
};
