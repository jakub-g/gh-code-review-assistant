// this file is executed in the scope of PhantomJS
var phantomUtil = require('./lib/phantom-control.js')
    .userScript("./polyfills/Function.bind.js")
    .userScript("../ghAssistant.user.js");

var CONF = {
    filesOnPage : 3
};

phantomUtil.openAndTest("https://github.com/jakub-g/test-repo/pull/1/files", CONF, function (test) {
    test('should have the button to open config', function () {
        assert.inDom('.ghaCfgOpenButton');
    });

    test('should have buttons to wipe storage', function () {
        assert.inDom('#ghaWipeCommitOrUrl');
        assert.inDom('#ghaWipeRepo');
        assert.inDom('#ghaWipeAll');
    });

    test('should count number of files properly', function (CONF) {
        var expectedFiles = CONF.filesOnPage;
        assert.eq(gha.DomReader.getNumberOfFiles(), expectedFiles);
    });

    test('should inject fail/ok buttons proper nb. of times', function (CONF) {
        assert.inDom('.ghaToggleFileState', CONF.filesOnPage * 2);
        assert.inDom('.ghaToggleFileStateFail', CONF.filesOnPage);
        assert.inDom('.ghaToggleFileStateOk', CONF.filesOnPage);
    });

    test('toggle fail button changes files style', function () {
        var helpers = assert.helpers;
        var elems = document.querySelectorAll('.ghaToggleFileStateFail');
        assert.inDom('.ghaFileStateFail', 0);
        helpers.click(elems[0]);
        assert.inDom('.ghaFileStateFail', 1);
        helpers.click(elems[1]);
        assert.inDom('.ghaFileStateFail', 2);
        helpers.click(elems[0]);
        assert.inDom('.ghaFileStateFail', 1);
        helpers.click(elems[1]);
        assert.inDom('.ghaFileStateFail', 0);
    });

    test('toggle ok button changes files style', function () {
        var helpers = assert.helpers;
        var elems = document.querySelectorAll('.ghaToggleFileStateOk');
        assert.inDom('.ghaFileStateOk', 0);
        helpers.click(elems[2]);
        helpers.click(elems[1]);
        assert.inDom('.ghaFileStateOk', 2);
        helpers.click(elems[2]);
        helpers.click(elems[1]);
        assert.inDom('.ghaFileStateOk', 0);
    });

    test('has buttons to toggle expanded files', function () {
        assert.inDom('#ghaToggleCollapseExpand');
    });


    test('expand/collapse files button toggles in a good direction', function () {
        var helpers = assert.helpers;
        var btn = document.querySelector('#ghaToggleCollapseExpand');

        assert.eq(btn.innerHTML, L10N.collapseAll);
        helpers.click(btn);
        assert.eq(btn.innerHTML, L10N.expandUnreviewed);
        helpers.click(btn);
        assert.eq(btn.innerHTML, L10N.expandAll);
        helpers.click(btn);
        assert.eq(btn.innerHTML, L10N.collapseAll);
    });






























    /*test('should print the title of the issue', function () {
        var elm = document.querySelector('.js-issue-title').innerText;
        //console.log(elm);
        //assert.eq(1, 1);
    });*/

    test.start();
});