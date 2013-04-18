# GitHub Code Review Assistant
  ----------------------------

What's that?
============

Github Assistant is a UserScript, i.e. a piece of JavaScript code, that runs in your browser on Github pages to enhance your code review experience:

1. Mark the files as Reviewed / Rejected (this is stored in browser's local storage, so you can safely reload the page or close the browser and come back later).
1. Expand / collapse files comprising the diff individually (by clicking the header of each file).
1. Configure the script to collapse the files automatically if there are >*N* files or the diff is >*M* lines.
1. A footer and sidebar are added next to each file to quickly jump to its top.

Works on /commit, /pull, /compare pages.

Preview
=======

![GitHub Code Review Assistant Screenshot - can take a while to load...](../master/preview.png?raw=true)

Supported browsers
==================

Firefox, Chrome, Opera. Should work on any reasonably modern version.

Installation guide
==================

Firefox
---

 1. Install [GreaseMonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) and restart the browser.
 1. Go to [Userscripts.org GH Assistant page](http://userscripts.org/scripts/show/153049) and click "Install" in the top-right, or navigate to [ghAssistant.user.js on GitHub](https://github.com/jakub-g/gh-code-review-assistant/raw/master/ghAssistant.user.js).
 1. You should see an installation prompt. Accept the installation.
 1. GH Assistant should work right away.

Chrome
--

 1. Install [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en).
 1. Go to [Userscripts.org GH Assistant page](http://userscripts.org/scripts/show/153049) and click "Install" in the top-right, or navigate to [ghAssistant.user.js on GitHub](https://github.com/jakub-g/gh-code-review-assistant/raw/master/ghAssistant.user.js).
 1. You should see an installation prompt. Click "OK" (Install with Tampermonkey).
 1. GH Assistant should work right away.

Opera
--

 1. Launch the following addresses to configure the browser: set the directory on your disk where to store UserScripts, and activate UserScripts on HTTPS (GitHub is served via HTTPS):

    opera:config#UserPrefs|UserJavaScriptFile
    opera:config#UserPrefs|UserJavaScriptonHTTPS
 1. Download the [ghAssistant.user.js](https://github.com/jakub-g/gh-code-review-assistant/raw/master/ghAssistant.user.js) and put it in the UserScripts folder declared above.
 1. Restart the browser.

Checking if the extension works
===============================

Navigate to some of the /commit, /pull, or /compare URL on Github. The longer the diff, the better you'll see the advantages of the script.

Example: [ariatemplates # pull 427](https://github.com/ariatemplates/ariatemplates/pull/427/files)

I like it!
==========

Sign up to Usescripts.org and [rate the script and/or become a fan](http://userscripts.org/scripts/show/153049).

Contributions and feature requests are welcome.
