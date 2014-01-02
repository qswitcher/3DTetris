module.exports = function(grunt) {
    grunt.initConfig({
        jasmine : {
            tetris3d : {
                src : ['js/game.js', 'js/block.js', 'js/tetris.js'],
                options: {
                    specs : 'specs/*spec.js',
                    vendor: ['libs/jquery-2.0.0.js', 'libs/three.js', 'libs/OrbitControls.js', 'libs/RequestAnimationFrame.js']
                }
            }
        }
     });

    grunt.loadNpmTasks('grunt-contrib-jasmine');

    grunt.registerTask('default', 'jasmine');

};
