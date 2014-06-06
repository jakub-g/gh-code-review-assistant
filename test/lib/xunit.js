/**
 * This function is scoped in web browser, when executed it defines 
 * an assertion library in window's global scope.
 * @param {String} varName Under which name in global scope the lib
 * will be available (i.e. window[varName]).
 */
module.exports = function (varName) {
    varName = varName || "assert";
    window[varName] = {
        _goodAsserts: 0,
        _badAsserts: 0,
        eq : function (a1, a2, optMsg) {
            optMsg = optMsg || "";
            if (a1 !== a2) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected " + a1 + " to equal " + a2);
            }
            this._goodAsserts++;
        },
        len : function (item, len, optMsg) {
            optMsg = optMsg || "";
            if (item.length != len) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n-->expected item's length to equal " + len + " but it is " + item.length);
            }
            this._goodAsserts++;
        },
        inDom : function (selector, times) {
            var expected = (times === undefined ?  1 : times);
            var actual = document.querySelectorAll(selector).length;

            var msg = "Expected to find " + expected + " nodes matching '" + selector + "'" + " but found " + actual;
            this.eq(expected, actual, msg);
        },
        helpers : {
            click : function (elem) {
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("click", true, true);
                elem.dispatchEvent(evt);
            }
        }
    };
};
