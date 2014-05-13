// this file is executed in the scope of PhantomJS
var webpage = require('webpage');
var debug = true;

var br = "--------------------------------------------------------------------------------";

function defineXUnit () {
    window.assert = {
        _goodAsserts: 0,
        _badAsserts: 0,
        eq : function (a1, a2, optMsg) {
            optMsg = optMsg || "";
            if (a1 !== a2) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected " + a1 + " to equal " + a2);
            }
            this._goodAsserts++;
        },
        length : function (item, len, optMsg) {
            optMsg = optMsg || "";
            if (item.length != len) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected item's length to equal " + len + " but it is " + item.length);
            }
            this._goodAsserts++;
        }
    }
}

function openAndTest(url, gatherTests) {
    var _this = this;

    var pendingTests = [];
    var wrapWithTryCatch = function () {
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
        }
    }
    var it = function (message, testFn) {
        pendingTests.push({
            message : message,
            testFn : testFn
        });
    }
    it.start = function () {
        while (pendingTests.length > 0) {
            var test = pendingTests.shift();
            var testFn = wrapWithTryCatch();
            var ok = page.evaluate(testFn, test.testFn);

            console.log( (ok ? " [ OK ] " : " [FAIL] ") + test.message);
        }
    }

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

    page.open(url, function (status) {
        console.log(br);
        console.log("INITIALIZING THE TEST\n");
        console.log("* URL: " + url + " loaded with status " + status);

        var usPath = _this.userScriptPath;
        if (!usPath) {
            throw new Error("phantom-control: userScriptPath is not defined");
        }
        console.log("* Injecting the userscript... (" + usPath + ")");
        var injected = page.injectJs(usPath);
        console.log(injected ? "OK" : "FAILED");
        if (!injected) {
            throw new Error("Can't inject userscript in the page...");
        }

        console.log("* Injecting the unit test utils... ");
        page.evaluate(defineXUnit);

        console.log("* Starting the tests... \n");
        gatherTests(it);;
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
    console.log("| " + asserts._goodAsserts + " asserts OK");
    console.log("| " + asserts._badAsserts + " asserts KO");
    console.log(br);

    phantom.exit(hasFailures ? 1 : 0);
};

module.exports = {
    /**
     * Opens `url` in Phantom, injects `this.userScriptPath` userscript, and calls test function `testFn`
     * @param {String} url
     * @param {Function} testFn
     */
    openAndTest : openAndTest,

    /**
     * Sets internal cfg variable userScriptPath as provided, and returns this for chaining.
     * @param {String} userScriptPath
     */
    userScript : function (userScriptPath) {
        this.userScriptPath = userScriptPath;
        return this;
    }
};
