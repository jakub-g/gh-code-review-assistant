// this file is executed in the scope of PhantomJS
var phantomUtil = require('./lib/phantom-control.js').userScript("../ghAssistant.user.js");

phantomUtil.openAndTest("https://github.com/jakub-g/test-repo/pull/1/files", function (it) {
    it('should have the button to open config', function () {
        var len = document.querySelectorAll('.ghaCfgOpenButton').length;
        console.log(len);
        assert.eq(1, 2);
        assert.eq(1, 1);
    });
    
    it('should print the title of the issue', function () {
        var elm = document.querySelector('.js-issue-title').innerText;
        console.log(elm);
    });
    
    it.start();
});
