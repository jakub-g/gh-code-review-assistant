var url = "https://github.com/ariatemplates/ariatemplates/pull/1117/files";
//var url = "http://topspot/index.php/Aria_Templates_-_Deprecated_features";
var userScriptPath = "../ghAssistant.user.js";

var page = require('webpage').create();

page.onInitialized = function() {
    page.evaluate(function () {
        document.addEventListener("DOMContentLoaded", function () {
            window.callPhantom({
                name: "DOMContentLoaded"
            });
        }, false);
    });
};

page.onCallback = function (event) {
    if (event.name == "DOMContentLoaded") {
        onDOMContentLoaded();
    }
};

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

    page.evaluate(function(){
    var len = document.querySelectorAll('.ghaCfgOpenButton').length;
    console.log(len);
    });
    
    phantom.exit();
});

function onDOMContentLoaded () {
    console.log("DOMContentLoaded");
    var injected = page.injectJs(userScriptPath);
    console.log("injected? " + injected);
    page.evaluate(tests);
}

// ==================================================================================================

function tests () {
    var elm = document.querySelector('.js-issue-title').innerText;
    console.log(elm);
    var len = document.querySelectorAll('.ghaCfgOpenButton').length;
    console.log(len);
}
