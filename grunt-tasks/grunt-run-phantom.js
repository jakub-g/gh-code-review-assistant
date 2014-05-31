module.exports = function(grunt) {
    grunt.task.registerTask('run-phantom', function () {
        var done = this.async();
        var spawnCb = function (error, result, code) {
            if (error) {
                if (code != 99) {
                    console.log(error);
                    console.log(code);
                }
            }
            done(error);
        };
        var phantomProcess = grunt.util.spawn({
            cmd : 'phantomjs',
            args : ['./test/spec1.js']
        }, spawnCb);

        phantomProcess.stdout.pipe(process.stdout);
        phantomProcess.stderr.pipe(process.stderr);
    });
};