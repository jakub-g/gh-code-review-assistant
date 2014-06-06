// this file is executed in the scope of PhantomJS
var webpage = require('webpage');
var system = require('system');

var bGlobalColor = system.args.indexOf('--color') > -1;
var bGlobalDebug = system.args.indexOf('--debug') > -1;
var bGlobalVerbose = system.args.indexOf('--verbose') > -1;

// this is an npm require
var colors = require('colors');
if (!bGlobalColor) {
    colors.mode = "none";
}

var br = Array(11).join("-");

var scopedInBrowser = {
    defineXUnit : function () {
        window.assert = {
            _goodAsserts: 0,
            _badAsserts: 0,
            eq : function (a1, a2, optMsg) {
                optMsg = optMsg || "";
                if (a1 !== a2) {
                    this._badAsserts++;
                    throw new Error("ASSERT_FAIL: " + optMsg + "\n expected " + a1 + " to equal " + a2);
                }
                this._goodAsserts++;
            },
            len : function (item, len, optMsg) {
                optMsg = optMsg || "";
                if (item.length != len) {
                    this._badAsserts++;
                    throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected item's length to equal " + len + " but it is " + item.length);
                }
                this._goodAsserts++;
            },
            inDom : function (selector, times) {
                var expected = (times === undefined ?  1 : times);
                var actual = document.querySelectorAll(selector).length;

                var msg = "Expected to find " + expected + " nodes matching '" + selector + "'" + " but found " + actual;
                this.eq(expected, actual, msg);
            },
            helpers : {
                click : function (elem) {
                    var evt = document.createEvent("HTMLEvents");
                    evt.initEvent("click", true, true);
                    elem.dispatchEvent(evt);
                }
            }
        };
    },

    wrapWithTryCatch : function (userConf) {
        // it's done this strange way due to how page.evaluate works
        // it wouldn't see the closure variables, hence the fn to be wrapped
        // is passed as a second param to page.evaluate
        return function (origFn, userConf) {
            try {
                origFn(userConf);
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        };
    }
};

function getTestRunner (page, userConf) {
    var pendingTests = [];
    var testRunner = function (message, testFn) {
        pendingTests.push({
            message : message,
            testFn : testFn
        });
    };

    testRunner.start = function () {
        while (pendingTests.length > 0) {
            var test = pendingTests.shift();
            var testFn = scopedInBrowser.wrapWithTryCatch();
            var ok = page.evaluate(testFn, test.testFn, userConf.args);

            console.log( (ok ? (" [ OK ] ".green.bold) : (" [FAIL] ".red.bold)) + test.message);
        }
    };
    return testRunner;
}

function openAndTest(url, userConf, gatherAndRunTests, suiteId, done) {

    userConf.phantom = userConf.phantom || {};
    userConf.args = userConf.args || {};
    var bDebug = (userConf.phantom.debug !== undefined) ? userConf.phantom.debug : bGlobalDebug;
    var bVerbose = (userConf.phantom.verbose !== undefined) ? userConf.phantom.verbose : bGlobalVerbose;

    var verbose = {
        log : bVerbose ? function (msg) {
            console.log(msg);
        } : function () {}
    };
    var ignoredErrors = userConf.phantom.ignoredErrors || null;

    var page = webpage.create();
    page.onConsoleMessage = function (msg) {
        var padding = '  >>> ' ;
        console.log(padding + (""+msg).replace(/\n/g, "\n" + padding));
    };

    page.onError = function(msg, trace) {
        var magicString = "ASSERT_FAIL";
        var isAssertFail = msg.indexOf(magicString) >= 0;

        if (bDebug && !isAssertFail) {
            var ignore = false;
            if (ignoredErrors) {
                ignore = ignoredErrors.some(function (ignoredMsg) {
                    return msg.indexOf(ignoredMsg) > -1;
                });
            }
            if (!ignore) {
                var msgStack = ['PHANTOM ERROR: ' + msg];
                if (trace && trace.length) {
                    trace.forEach(function(t) {
                      msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
                    });
                    msgStack.push("");
                }
                console.error(msgStack.join('\n'));
            }
        }

        if (isAssertFail) {
            var strip = 7; // leading "Error: ";
            console.error(msg.slice(strip));
            //console.log("Test suite failed, exiting with error code 1");
            //phantom.exit(1);
        }
    };

    var _this = this;
    page.open(url, function (status) {
        verbose.log(" Initializing the test:");
        verbose.log(" * Page loaded with status " + status);
        //verbose.log(" * URL: " + url.yellow + " loaded with status " + status);

        var usPaths = _this.userScriptPaths;
        if (!usPaths) {
            throw new Error("phantom-control: userScriptPath is not defined");
        }
        for (var i = 0; i < usPaths.length; i++) {
            verbose.log(" * Injecting the userscript... (" + usPaths[i] + ")");
            var injected = page.injectJs(usPaths[i]);
            // verbose.log("  " + (injected ? "OK" : "FAILED"));
            if (!injected) {
                throw new Error("Can't inject userscript in the page...");
            }
        }

        verbose.log(" * Injecting the unit test utils... ");
        page.evaluate(scopedInBrowser.defineXUnit);

        verbose.log(" * Starting the tests... \n");
        gatherAndRunTests(getTestRunner(page, userConf));
        // verbose.log("\n* Tests finished.");

        onTestSuiteFinished(page, {
            id : suiteId,
            count : _this.registeredSuites.length
        }, done);
    });
}

function onTestSuiteFinished (page, suite, done) {
    var asserts = page.evaluate(function () {
        return window.assert;
    });
    var hasFailures = asserts._badAsserts > 0;

    var msg = "\n  Test suite " + (suite.id + 1) + "/" + suite.count + " finished: ";
    msg += (asserts._goodAsserts + " asserts OK").green.bold;
    if (hasFailures) {
        msg += "; " + (asserts._badAsserts + " asserts KO").red.bold;
    }
    console.log(msg + "\n");

    done(hasFailures ? 99 : 0);
}

module.exports = {
    /**
     * Opens `url` in Phantom, injects `this.userScriptPaths` userscripts, and calls test function `gatherTest`
     * with one argument `test`. Usage:
     * <pre>
     *   phantomUtil.openAndTest("http://example.com/", function (test) {
     *      test('should do something', function () {
     *          assert.eq(1, 1);
     *      });
     *
     *      test('should do something else', function () {
     *          assert.eq(1, 2);
     *      });
     *
     *      test.start();
     *   });
     * </pre>
     * @param {String} url
     * @param {Function} gatherTest
     */
    openAndTest : openAndTest,

    /**
     * Sets internal cfg variable `this.userScriptPath` as provided, and returns `this` for chaining.
     * @param {String} userScriptPath
     */
    userScript : function (userScriptPath) {
        this.userScriptPaths.push(userScriptPath);
        return this;
    },
    userScriptPaths : [],

    /**
     * Registers a suite to be executed via `openAndTest`. Params expected are same
     * as for `openAndTest`.
     * @see openAndTest
     */
    registerSuite : function (/*args*/) {
        this.registeredSuites.push([].slice.call(arguments, 0));
    },
    registeredSuites : [],
    _exitCodes : [],

    /**
     * Returns a callback function that will be called upon finishing of suite n.
     * The callback runs n+1-st suite, or in case of last suite, exits PhantomJS,
     * with proper exit code (failure code if any of suites failed, 0 otherwise).
     * @param {Integer} n
     * @return {Function}
     */
    _getSuiteDoneCb : function (n) {
        var that = this;
        var nSuites = this.registeredSuites.length;
        return function (exitCode) {
            // printing in 1-based values for user-friendliness
            // console.log("Test suite " + (n+1) + " finished with code " + exitCode);
            that._exitCodes.push(exitCode);
            var nextSuiteId = n+1;
            if (nextSuiteId < nSuites) {
                that.startSuite(nextSuiteId);
            } else {
                var hasError = that._exitCodes.indexOf(99) > -1;
                var msg = "All suites finished; ";
                if (hasError) {
                    msg = (msg + "there were some failures.").red;
                } else {
                    msg = (msg + "OK").green;
                }
                console.log(msg);
                phantom.exit(hasError ? 99 : 0);
            }
        };
    },
    startSuite : function (n) {
        var nSuites = this.registeredSuites.length;
        var args = this.registeredSuites[n];
        var url = args[0];
        if (n > 0) {
            console.log(br + "\n");
        }
        console.log("Starting test suite " + (n+1) + "/" + nSuites + ": " + url.yellow + "\n");
        args.push(n, this._getSuiteDoneCb(n));
        this.openAndTest.apply(this, args);
    },

    /**
     * Main entry point - starts the first suite to be executed.
     */
    start : function () {
        if (this.registeredSuites.length > 0) {
            //console.log(br);
            this.startSuite(0);
        } else {
            console.error("No suites registered!");
            phantom.exit(98);
        }
    },

};
