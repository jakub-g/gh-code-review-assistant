// this file is executed in the scope of PhantomJS
var phantomTester = require('./lib/phantom-tester.js')
    .userScript("./polyfills/Function.bind.js")
    .userScript("../ghAssistant.user.js");

var conf = {
    phantom : {
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
phantomTester.registerSuite("https://github.com/jakub-g/test-repo/pull/1/files", conf, function (test) {
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

phantomTester.start();