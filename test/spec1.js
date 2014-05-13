// this file is executed in the scope of PhantomJS
var phantomUtil = require('./lib/phantom-control.js')
    .userScript("./polyfills/Function.bind.js")
    .userScript("../ghAssistant.user.js");

phantomUtil.openAndTest("https://github.com/jakub-g/test-repo/pull/1/files", function (test) {
    test('should have the button to open config', function () {
        assert.inDom('.ghaCfgOpenButton');
    });

    test('should print the title of the issue', function () {
        var elm = document.querySelector('.js-issue-title').innerText;
        console.log(elm);
        assert.eq(1, 2);
    });

    test.start();
});