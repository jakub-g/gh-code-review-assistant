// This module exports methods that will be called on the client side,
// in the scope of the browser (inside a web page), contrary to Phantom
// control script, which controls the Phantom itself

// local requires
var xunit = require('./xunit');

module.exports = {
    xunit : xunit,
    wrapWithTryCatch : function (userConf) {
        // it's done this strange way due to how page.evaluate works
        // it wouldn't see the closure variables, hence the fn to be wrapped
        // is passed as a second param to page.evaluate
        return function (origFn, userConf) {
            try {
                origFn(userConf);
                return true;
            } catch (e) {
                console.log(e);
                return false;
            }
        };
    }
};
