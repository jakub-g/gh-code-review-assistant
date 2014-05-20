module.exports = function(grunt) {

    var testTasks = ['jshint', 'run-phantom'];

    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.config('watch', {
        files: ['**/*'],
        tasks: testTasks,
        options : {
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

    grunt.loadTasks('./grunt-tasks');

    grunt.registerTask('lint', 'jshint');
    grunt.registerTask('test', testTasks);
    grunt.registerTask('tdd', testTasks.concat('watch'));
    grunt.registerTask('default', 'tdd');
};
