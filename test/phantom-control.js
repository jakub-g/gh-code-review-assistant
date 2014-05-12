var webpage = require('webpage');

var userScriptPath = "../ghAssistant.user.js";
var debug = true;

function defineXUnit () {
    window.assert = {
        eq : function (a1, a2) {
            if (a1 !== a2) {
                throw new Error("ASSERT_FAIL: expected " + a1 + " to equal " + a2);
            }
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
        var injected = page.injectJs(userScriptPath);
        console.log(injected ? "OK" : "FAILED");

        console.log("Injecting the unit test utils... ");
        page.evaluate(defineXUnit);

        console.log("Starting the tests... ");
        page.evaluate(testCb);
        console.log("Tests finished.");
    });
}

// ==================================================================================================


var url = "https://github.com/ariatemplates/ariatemplates/pull/1117/files";
openAndTest(url, function () {
    var elm = document.querySelector('.js-issue-title').innerText;
    console.log(elm);
    var len = document.querySelectorAll('.ghaCfgOpenButton').length;
    console.log(len);
    assert.eq(1, 2);
    phantom.exit();
});
