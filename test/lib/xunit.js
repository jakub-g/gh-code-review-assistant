/**
 * This function is scoped in web browser, when executed it defines
 * an assertion library in window's global scope.
 * @param {String} varName Under which name in global scope the lib
 * will be available (i.e. window[varName]), if you want to avoid conflicts
 * with the page's global objects.
 */
module.exports = function (varName) {
    varName = varName || "assert";
    (function () {
        function equal (actual, expected, optMsg) {
            optMsg = optMsg || "";
            if (actual != expected) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected " + actual + " to equal " + expected);
            }
            this._goodAsserts++;
        }

        function notEqual (actual, expected, optMsg) {
            optMsg = optMsg || "";
            if (actual == expected) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected " + actual + " to not equal " + expected);
            }
            this._goodAsserts++;
        }

        function strictEqual (actual, expected, optMsg) {
            optMsg = optMsg || "";
            if (actual !== expected) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected " + actual + " to equal " + expected);
            }
            this._goodAsserts++;
        }

        function notStrictEqual (actual, expected, optMsg) {
            optMsg = optMsg || "";
            if (actual === expected) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected " + actual + " to not equal " + expected);
            }
            this._goodAsserts++;
        }

        function ok (guard, optMsg) {
            optMsg = optMsg || "";
            if (!guard) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected truthy value, got " + guard);
            }
            this._goodAsserts++;
        }

        function throws (block, Error_opt, optMsg) {
            optMsg = optMsg || "";
            var caughtException = null;
            try {
                block();
            } catch (e) {
                caughtException = e;
            }

            if (!caughtException) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected an exception");
            }
            if (Error_opt && !(caughtException instanceof Error_opt)) {
                this._badAsserts++;
                throw new Error("ASSERT_FAIL: " + optMsg + "\n expected an exception of type " +
                    Error_opt + " but got " + caughtException);
            }

            this._goodAsserts++;
        }

        var helpers = {
            click : function (elem) {
                var evt = document.createEvent("HTMLEvents");
                evt.initEvent("click", true, true);
                elem.dispatchEvent(evt);
            }
        };

        window[varName] = {
            _goodAsserts: 0,
            _badAsserts: 0,

            // CommonJS
            ok : ok,
            equal : equal,
            notEqual : notEqual,
            strictEqual : strictEqual,
            notStrictEqual : notStrictEqual,
            // deepEqual : function (actual, expected, optMsg)
            // notDeepEqual : function (actual, expected, optMsg)
            throws : throws,

            // custom extensions
            eq : equal,
            neq : notEqual,
            notEq : notEqual,
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

            // helpers for testing that are not assertion themselves
            helpers : helpers
        };
    })();
};
