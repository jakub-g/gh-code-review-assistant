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

    test('counts number of files properly', function (args) {
        var expectedFiles = args.filesOnPage;
        assert.eq(gha.DomReader.getNumberOfFiles(), expectedFiles);
    });

    test('injects fail/ok buttons proper nb. of times', function (args) {
        assert.inDom('.ghaToggleFileState', args.filesOnPage * 2);
        assert.inDom('.ghaToggleFileStateFail', args.filesOnPage);
        assert.inDom('.ghaToggleFileStateOk', args.filesOnPage);
    });

    test('has buttons to toggle expanded files', function () {
        assert.inDom('#ghaToggleCollapseExpand');
    });

    // this has to be done before toggle fail button changes files style
    test('expand/collapse files button toggles in a good direction', function () {
        var helpers = assert.helpers;
        var getVisible = function (filesBodies) {
            return filesBodies.filter(function (elem){
                return getComputedStyle(elem).display != "none";
            });
        };

        var toggleLastElem = function () {
            // taking the last one since clicking the last button should not expand anything else
            var okBtns = document.querySelectorAll('.ghaToggleFileStateOk');
            var btnReviewLastOk = okBtns[okBtns.length - 1];
            helpers.click(btnReviewLastOk);
        };

        // button under test
        var BUT = document.querySelector('#ghaToggleCollapseExpand');

        var filesBodies = gha.DomReader.getDiffContainers().map(function(elem) {
            return elem.children[1];
        });
        assert.len(filesBodies, 3);

        // note the cycle start depends on the number of files and a cfg option

        assert.len(getVisible(filesBodies), 3);
        assert.eq(BUT.innerHTML, L10N.collapseAll);

        helpers.click(BUT); // collapsing all
        assert.len(getVisible(filesBodies), 0);
        assert.eq(BUT.innerHTML, L10N.expandUnreviewed);

        toggleLastElem(); // let's have 1 elem in reviewed state for the tests
        assert.len(getVisible(filesBodies), 0);

        helpers.click(BUT); // expanding 2 unreviewed
        assert.len(getVisible(filesBodies), 2);
        assert.eq(BUT.innerHTML, L10N.expandAll);

        helpers.click(BUT); // expanding all 3
        assert.len(getVisible(filesBodies), 3);
        assert.eq(BUT.innerHTML, L10N.collapseAll);

        helpers.click(BUT); // collapsing all
        assert.len(getVisible(filesBodies), 0);

        toggleLastElem(); // reset
    });

    test.start();
});

phantomUtil.registerSuite("https://github.com/jakub-g/test-repo/pull/1/files", conf, function (test) {

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

    test.start();
});

phantomUtil.start();