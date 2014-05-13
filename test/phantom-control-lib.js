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

function openAndTest(url, testCb) {
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

        console.log("Injecting the userscript... ");
        var injected = page.injectJs(this.userScriptPath);
        console.log(injected ? "OK" : "FAILED");

        console.log("Injecting the unit test utils... ");
        page.evaluate(defineXUnit);

        console.log("Starting the tests... ");
        page.evaluate(testCb);
        console.log("Tests finished.");
    });
}

module.exports = {
    openAndTest : openAndTest,
    userScriptPath : null
};
