/**
 *Minimize del frontend
 * 1) connect
 * 2) open
 * 3) sass
 * 4) copy
 * 5) uglify
 * 6) concat
 * 7) remove
 * 8) string-replace
 * 9) usebanner
 * 10) watch
 */

module.exports = function (grunt) {
    require("matchdep").filterDev("grunt-*").forEach(grunt.loadNpmTasks);
    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        connect: {
            server: {
                options: {
                    hostname: '0.0.0.0',
                    port: 8888,
                    base: "dist",
                    livereload: true,
                    middleware: function (connect, options, defaultMiddleware) {
                        var proxy = require('grunt-connect-proxy/lib/utils').proxyRequest;
                        return [proxy].concat(defaultMiddleware);
                    }
                }
            }
        },
        open: {
            all: {
                path: 'http://localhost:8888'
            }
        },
        sass: {
            dist: {
                options: {
                    style: 'compressed',
                    sourcemap: 'none'
                },
                files: {
                    'dist/css/bubbles-chart.css': 'src/scss/main.scss'
                }
            }
        },

        copy: {
            main: {
                files: [{
                        cwd: './test',
                        src: '**/*',
                        dest: 'dist/test',
                        expand: true
                    }
                ]
            }
        },


        uglify: {
            options: {
                mangle: false,
                sourceMap: false,
                beautify: false
            },
            build: {
                files: [{
                    expand: true,
                    cwd: 'src/js',
                    src: '*.js',
                    dest: 'dist/js',
                    ext: '.js',
                    extDot: 'last'
                }]
            }
        },
        concat: {
            options: {
                separator: ';\n'
            },
            libs: {
                src: [
                'src/vendors/jquery/dist/jquery.min.js',
                'src/vendors/d3/d3.min.js',
                'src/vendors/d3plus/d3plus.min.js',
                'dist/js/bubbles-chart.js',
                ],
                dest: 'dist/js/bubbles-chart.full.js'
            }
        },
        remove: {
            default_options: {
                trace: true,
                dirList: ['dist/js']
            }
        },

        'string-replace': {
            inline: {
                files: {
                    'dist/': ['dist/js/*.js', 'dist/css/*.css'],
                },
                options: {
                    replacements: [{
                        pattern: /{{VERSION}}/g,
                        replacement: '<%= pkg.version %>'
                    }]
                }
            }
        },

        usebanner: {
            taskName: {
                options: {
                    position: 'top',
                    banner: '/*!\n' +
                        '  * <%= pkg.name %> : <%= pkg.description %>\n' +
                        '  * @version <%= pkg.version %>\n' +
                        '  * @author <%= pkg.author %>\n' +
                        '  * @date <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                        '  */\n',
                    linebreak: true
                },
                files: {
                    src: ['dist/js/*.js', 'dist/css/*.css']
                }
            }
        },

        watch: {
            main: {
                options: {
                    livereload: true
                },
                files: ['src/**/*'],
                tasks: ['default']
            },
            test: {
                options: {
                    livereload: true
                },
                files: ['test/**/*'],
                tasks: ['default', 'copy']
            }
        }
    });

    grunt.registerTask('default', ['uglify', 'sass', 'string-replace', 'concat', 'usebanner']);
    grunt.registerTask('build', ["default"]);
    grunt.registerTask('serve', ['default', 'copy', 'configureProxies:server', "open", 'connect:server', 'watch']);
};
