// this file is executed in the scope of PhantomJS
var phantomTester = require('userscript-phantom-tester')
    .polyfill("./polyfills/Function.bind.js")
    .userScript("../ghAssistant.user.js");

phantomTester.setTestArgs({
    filesOnPage : 3
});

phantomTester.registerSuite("https://github.com/jakub-g/test-repo/pull/1/files", function (test) {
    test('has the button to open config', function () {
        assert.inDom('.ghaCfgOpenButton');
    });

    test('has buttons to wipe storage', function () {
        assert.inDom('#ghaWipeCommitOrUrl');
        assert.inDom('#ghaWipeRepo');
        assert.inDom('#ghaWipeAll');
    });
});

phantomTester.start();