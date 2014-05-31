// this file is executed in the scope of PhantomJS
var phantomUtil = require('./lib/phantom-control.js')
    .userScript("./polyfills/Function.bind.js")
    .userScript("../ghAssistant.user.js");

var conf = {
    phantom : {
        debug : true,
        ignoredErrors : [
            "evaluating 'Array.prototype.forEach.call.bind",
            "Can't find variable: $"
        ]
    },
    args : {
        filesOnPage : 3
    }
};

//phantomUtil.evalInPageScope
phantomUtil.registerSuite("https://github.com/jakub-g/test-repo/pull/1/files", conf, function (test) {
    test('has the button to open config', function () {
        assert.inDom('.ghaCfgOpenButton');
    });

    test('has buttons to wipe storage', function () {
        assert.inDom('#ghaWipeCommitOrUrl');
        assert.inDom('#ghaWipeRepo');
        assert.inDom('#ghaWipeAll');
    });
    test.start();
});

phantomUtil.start();