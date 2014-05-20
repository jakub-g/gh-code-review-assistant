module.exports = function(grunt) {

    var syncConf = grunt.file.readJSON('./.grunt-sync.conf');
    var syncEnabled = syncConf && syncConf.target;

    var testTasks = ['jshint', 'run-phantom'];

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config('watch', {
        files: ['**/*'],
        tasks: syncEnabled ? testTasks.concat('copy') : testTasks,
        options : {
            atBegin : true,
            spawn : true
        }
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.config('jshint', {
        src : ['*.js'],
        test : ['test/**/*.js'],
        options : {
        }
    });

    if (syncEnabled) {
        grunt.loadNpmTasks('grunt-contrib-copy');
        grunt.config('copy', {
            main : {
                expand: true,
                src : ['*.user.js'],
                dest : syncConf.target,
            }
        });
    }

    grunt.loadTasks('./grunt-tasks');

    grunt.registerTask('lint', 'jshint');
    grunt.registerTask('sync', 'copy');
    grunt.registerTask('test', testTasks);
    grunt.registerTask('tdd', 'watch');
    grunt.registerTask('default', 'tdd');
};
