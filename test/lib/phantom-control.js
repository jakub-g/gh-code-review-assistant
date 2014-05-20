// this file is executed in the scope of PhantomJS
var webpage = require('webpage');
var colors = require('colors');
var debug = true;

var br = "--------------------------------------------------------------------------------";

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
            inDom : function (selector) {
                var expected = 1;
                var actual = document.querySelectorAll(selector).length;

                var msg = "Expected to find a node matching " + selector;
                this.eq(expected, actual, msg);
            },
            length : function (item, len, optMsg) {
                optMsg = optMsg || "";
                if (item.length != len) {
                    this._badAsserts++;
                    throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected item's length to equal " + len + " but it is " + item.length);
                }
                this._goodAsserts++;
            }
        };
    },

    wrapWithTryCatch : function () {
        // it's done this strange way due to how page.evaluate works
        // it wouldn't see the closure variables, hence the fn to be wrapped
        // is passed as a second param to page.evaluate
        return function (origFn) {
            try {
                origFn();
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        };
    }
};

function getTestRunner (page) {
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
            var ok = page.evaluate(testFn, test.testFn);

            console.log( (ok ? (" [ OK ] ".green) : (" [FAIL] ".red)) + test.message);
        }
    };
    return testRunner;
}

function openAndTest(url, gatherAndRunTests) {
    var page = webpage.create();
    page.onConsoleMessage = function (msg) {
        var padding = '  >>> ' ;
        console.log(padding + (""+msg).replace(/\n/g, "\n" + padding));
    };

    page.onError = function(msg, trace) {
        var magicString = "ASSERT_FAIL";
        var isAssertFail = msg.indexOf(magicString) >= 0;

        if (debug && !isAssertFail) {
            var msgStack = ['PHANTOM ERROR: ' + msg];
            if (trace && trace.length) {
                trace.forEach(function(t) {
                  msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
                });
                msgStack.push("");
            }
            console.error(msgStack.join('\n'));
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
        console.log(br);
        console.log("INITIALIZING THE TEST\n");
        console.log("* URL: " + url + " loaded with status " + status);

        var usPaths = _this.userScriptPaths;
        if (!usPaths) {
            throw new Error("phantom-control: userScriptPath is not defined");
        }
        for (var i = 0; i < usPaths.length; i++) {
            console.log("* Injecting the userscript... (" + usPaths[i] + ")");
            var injected = page.injectJs(usPaths[i]);
            // console.log("  " + (injected ? "OK" : "FAILED"));
            if (!injected) {
                throw new Error("Can't inject userscript in the page...");
            }
        }

        console.log("* Injecting the unit test utils... ");
        page.evaluate(scopedInBrowser.defineXUnit);

        console.log("* Starting the tests... \n");
        gatherAndRunTests(getTestRunner(page));
        console.log("\n* Tests finished.");

        onTestSuiteFinished(page);
    });
}

function onTestSuiteFinished (page) {
    var asserts = page.evaluate(function () {
        return window.assert;
    });
    var hasFailures = asserts._badAsserts > 0;

    console.log("\n" + br);
    console.log("| Test suite summary: ");
    console.log(("| " + asserts._goodAsserts + " asserts OK").green);
    if (hasFailures) {
        console.log(("| " + asserts._badAsserts + " asserts KO").red);
    }
    console.log(br);

    phantom.exit(hasFailures ? 99 : 0);
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
    
    userScriptPaths : []
};
