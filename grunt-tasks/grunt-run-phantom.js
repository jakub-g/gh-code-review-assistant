module.exports = function(grunt) {
    grunt.task.registerTask('run-phantom', function () {
        var done = this.async();
        var child = grunt.util.spawn({
            cmd : 'node',
            args : ['./test/lib/run-phantom.js'],
            opts : {
                stdio : 'inherit'
            }
        }, function (error, result, code) {
            if (error) {
                if (code != 99) {
                    console.log(error);
                    console.log(code);
                }
            }
            done(error);
        });
    });
};