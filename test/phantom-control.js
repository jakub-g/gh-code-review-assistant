// this file is executed in the scope of PhantomJS

var phantomUtil = require('./phantom-control-lib.js');
phantomUtil.userScriptPath =  "../ghAssistant.user.js";

var url = "https://github.com/ariatemplates/ariatemplates/pull/1117/files";

phantomUtil.openAndTest(url, function () {
    var elm = document.querySelector('.js-issue-title').innerText;
    console.log(elm);
    var len = document.querySelectorAll('.ghaCfgOpenButton').length;
    console.log(len);
    assert.eq(1, 2);
    phantom.exit();
});
