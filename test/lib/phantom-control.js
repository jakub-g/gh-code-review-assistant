// this file is executed in the scope of PhantomJS
var webpage = require('webpage');
var debug = true;

function defineXUnit () {
    window.assert = {
        _goodAsserts: 0,
        eq : function (a1, a2, optMsg) {
            optMsg = optMsg || "";
            if (a1 !== a2) {
                throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected " + a1 + " to equal " + a2);
            }
            this._goodAsserts++;
        },
        length : function (item, len, optMsg) {
            optMsg = optMsg || "";
            if (item.length != len) {
                throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected item's length to equal " + len + " but it is " + item.length);
            }
            this._goodAsserts++;
        }
    }
}

function openAndTest(url, testFn) {
    var _this = this;
    var page = webpage.create();
    page.onConsoleMessage = function (msg) {
        console.log('>>> ', msg);
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
            console.log("Test suite failed, exiting with error code 1");
            phantom.exit(1);
        }
    };

    page.open(url, function (status) {
        console.log("------------------------------------------------");
        console.log("URL: " + url + " loaded with status " + status);

        var usPath = _this.userScriptPath;
        if (!usPath) {
            throw new Error("phantom-control: userScriptPath is not defined");
        }
        console.log("Injecting the userscript... (" + usPath + ")");
        var injected = page.injectJs(usPath);
        console.log(injected ? "OK" : "FAILED");
        if (!injected) {
            throw new Error("Can't inject userscript in the page...");
        }

        console.log("Injecting the unit test utils... ");
        page.evaluate(defineXUnit);

        console.log("Starting the tests... ");
        page.evaluate(testFn);
        console.log("Tests finished.");

        onTestSuiteFinished(page);
    });
}

function onTestSuiteFinished (page) {
    var goodAsserts = page.evaluate(function () {
        return window.assert._goodAsserts;
    });
    console.log("\n--------------------");
    console.log("Test suite summary: " + goodAsserts + " asserts OK");
    phantom.exit();
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
