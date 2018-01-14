# GitHub Code Review Assistant
  ----------------------------

DEPRECATION NOTE
================

The project is no longer maintained and left here for historical reasons.

Since GitHub is evolving at a steady pace and updating the script would require a regular effort, and since I use GitHub way less often than before, I will no longer maintain the script for now.

However, see instead: https://github.com/sindresorhus/refined-github

What's that?
============

Github Assistant is a UserScript, i.e. a piece of JavaScript code, that runs in your browser on Github pages to enhance your code review experience:

1. Mark the files as Reviewed / Rejected (this is stored in browser's local storage, so you can safely reload the page or close the browser and come back later).
1. Expand / collapse files comprising the diff individually (by clicking the header of each file).
1. Configure the script to collapse the files automatically if there are >*N* files or the diff is >*M* lines.
1. A footer and sidebar are added next to each file to quickly jump to its top.
1. Serialize & export the code review status into the URL's hash

Works on `/commit`, `/pull`, `/compare` pages.


Configuration
=============

You can configure all the options right from the config dialog in the browser.

Scroll to the bottom of any pull request and you will see a number of buttons added by the script.


Preview
=======

![GitHub Code Review Assistant Screenshot - can take a while to load...](../master/preview.png?raw=true)

Supported browsers
==================

Firefox, Chrome (should work on any reasonably modern version), Opera 12.

Installation guide
==================

### Firefox

 1. Install [GreaseMonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) and restart the browser.
 1. Navigate to [ghAssistant.user.js on GitHub](https://github.com/jakub-g/gh-code-review-assistant/raw/master/ghAssistant.user.js).
 1. You should see an installation prompt. Accept the installation.
 1. GH Assistant should work right away.

### Chrome

 1. Install [TamperMonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?hl=en).
 1. Navigate to [ghAssistant.user.js on GitHub](https://github.com/jakub-g/gh-code-review-assistant/raw/master/ghAssistant.user.js).
 1. You should see an installation prompt. Click "OK" (Install with Tampermonkey).
 1. GH Assistant should work right away.

### Opera 12

 1. Launch the following addresses to configure the browser: set the directory on your disk where to store UserScripts, and activate UserScripts on HTTPS (GitHub is served via HTTPS):

        opera:config#UserPrefs|UserJavaScriptFile
        opera:config#UserPrefs|UserJavaScriptonHTTPS

 1. Download the [ghAssistant.user.js](https://github.com/jakub-g/gh-code-review-assistant/raw/master/ghAssistant.user.js) and put it in the UserScripts folder declared above.
 1. Restart the browser.

Updates
=======

The userscript has an URL to this GitHub repo in its metadata. Hence in Firefox and Chrome you can benefit from easy updates.

### Firefox

Go to `about:addons` (or `Tools > Addons` from Firefox menu, or `Ctrl+Shift+A` from keyboard) to GreaseMonkey tab.
Right click on the entry and choose "Find updates".

If you opted in to have automatic updates in Firefox, the same setting will also apply to GreaseMonkey
which will periodically automatically check for updates of UserScripts.

### Chrome

Open `Tampermonkey menu > Options`. Select the entry and choose "Trigger an update" from the dropdown.

Tampermonkey also checks for UserScripts updates periodically (configurable in extension's settings; default is 12h).

### Opera 12

AFAIK you'll have to do it manually.

Checking if the extension works
===============================

Navigate to some of the /commit, /pull, or /compare URL on Github. The longer the diff, the better you'll see the advantages of the script.

Example: [ariatemplates # pull 427](https://github.com/ariatemplates/ariatemplates/pull/427/files)

I like it!
==========

Spread the word and and star this repo on GitHub. Fork it and submit patches if you found bugs.

You may also like some other of my userscripts:

- GitHub: hide pull requests from issues page
- GitHub: go to pull request branch from pull request
- Wiki language switcher
- and several other

See them on [Github](https://github.com/jakub-g/greasemonkey-userscripts)
or [Userscripts.org](http://userscripts-mirror.org/users/204917/scripts)

Author's homepage: [jakub-g.github.io](http://jakub-g.github.io)

Credits
=======

This extension was developed using the following Firefox extensions:

* [Firebug](https://addons.mozilla.org/en-US/firefox/addon/firebug/)
* [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
* [FireStorage Plus!](https://addons.mozilla.org/en-US/firefox/addon/firestorage-plus/)

Credits to all the respective authors.
