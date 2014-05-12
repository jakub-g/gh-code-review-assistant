var webpage = require('webpage');

var userScriptPath = "../ghAssistant.user.js";

function openAndTest (url, testCb) {
    var page = webpage.create();
    page.onConsoleMessage = function (msg) {
        console.log('>>> ', msg);
    };

    page.onError = function(msg, trace) {
      var msgStack = ['PHANTOM ERROR: ' + msg];
      if (trace && trace.length) {
        trace.forEach(function(t) {
          msgStack.push(' -> ' + (t.file || t.sourceURL) + ': ' + t.line + (t.function ? ' (in function ' + t.function +')' : ''));
        });
        msgStack.push("");
      }
      console.error(msgStack.join('\n'));
    };

    page.open(url, function (status) {
        console.log("Loaded " + url + " with status " + status);

        console.log("Injecting the userscript... ");
        var injected = page.injectJs(userScriptPath);
        console.log(injected ? "OK" : "FAILED");

        page.evaluate(tests);

        phantom.exit();
    });
}

// ==================================================================================================

var url = "https://github.com/ariatemplates/ariatemplates/pull/1117/files";
openAndTest(url, function () {
    var elm = document.querySelector('.js-issue-title').innerText;
    console.log(elm);
    var len = document.querySelectorAll('.ghaCfgOpenButton').length;
    console.log(len);
});
