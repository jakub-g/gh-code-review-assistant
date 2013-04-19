// ==UserScript==
// @name            GitHub code review assistant
// @description     Toggle diff visibility per file in the commit. Mark reviewed files (preserves refreshes). Useful to review commits with lots of files changed.
// @icon            https://github.com/favicon.ico
// @version         0.9.2.20130418
// @namespace       http://jakub-g.github.com/
// @author          http://jakub-g.github.com/
// @downloadURL     https://raw.github.com/jakub-g/gh-code-review-assistant/master/ghAssistant.user.js
// @userscriptsOrg  http://userscripts.org/scripts/show/153049
// @grant           none
// @include         http*://github.com/*/*/commit/*
// @include         http*://github.com/*/*/pull/*
// @include         http*://github.com/*/*/compare/*
// ==/UserScript==

// Changelog:
// 0.1
//  initial version
// 0.1.2
//  includes pull requests
// 0.1.3
//  do not fire the event on child nodes
// 0.1.4
//  fire intelligently on some child nodes
// 0.2.0
//  'expand all' / 'collapse all' button
//  auto hiding on long diff
//  code refactor
// 0.3.0
//  code review mark button
// 0.4.0-20130201
//  accomodated to new GH HTML markup
// 0.4.1-20130212
//  enabled also on /compare/ URLs
// 0.5.0-20130305
//  Works also in Chrome (Tampermonkey) now!
// 0.6.0-20130404
//  Added sidebar and footer to quickly go to the beginning of the current file.
//  Added additional button to mark file as problematic (OK / Fail).
//  After clicking "Reviewed" on file n, scroll to file n, and make the file n+1 expanded.
// 0.6.1.20130417
//  Fix the ugly text shadow on marked files
// 0.6.2.20130417
//  Refactor, comments
// 0.9.0.20130418
//  Local storage support to preserve the review across page refreshes!
// 0.9.1.20130418
//  Moved to separate GitHub repository
// 0.9.2.20130418
//  Fixed regression from 0.6.2 (reviewed file was not hiding on Fail/Ok click)

// TODO
// 1. On compare pages with really long diffs, it can take a few seconds to load everything.
//    To profile and see if something can be improved.
// 2. Upon wiping current repo / all local storage things, also all the items on the current
//    page should be visually restored to the normal state.

// ============================= CONFIG ================================

var CONFIG = {};
// If there's more than N commits in the diff, automatically collapse them all.
// Use 0 to disable that feature.
CONFIG.hideAllWhenMoreThanFiles = 4;

// Automatically collapse entries that have changed more than N lines.
CONFIG.hideFileWhenDiffGt = 0;

// Do not do any of above if small number of files changed in that commit
CONFIG.dontHideUnlessMoreThanFiles = 2;

// Whether to show 'Reviewed' button next to each file
CONFIG.enableReviewedButton = true;

// Whether to show sidebar and footer that scroll to the top of the file on click.
// Below related look'n'feel config
CONFIG.enableDiffSidebarAndFooter = true;
CONFIG.sidebarSize = 12; // in pixels
CONFIG.footerSize = 8;
CONFIG.sidebarColor1 = '#eee';
CONFIG.sidebarColor2 = '#aaa';

// ============================== CODE =================================

var L10N = {
    ok: 'Ok',
    fail: 'Fail',
    expandAll: 'Expand all',
    collapseAll: 'Collapse all',
}

var GHA = {};

GHA.attachGlobalCss = function () {
    var css = [];

    css.push('.ghAssistantButtonStateNormal {\
        background-image:   linear-gradient(to bottom, #fafafa, #eaeaea) !important;\
        color: #555 !important;\
        text-shadow: none !important;\
    }');
    css.push('.ghAssistantButtonStateOk {\
        background-image:   linear-gradient(to bottom, #333, #444) !important;\
        color: #fff !important;\
        text-shadow: none !important;\
    }');
    css.push('.ghAssistantButtonStateFail {\
        background-image:   linear-gradient(to bottom, #833, #844) !important;\
        color: #fff !important;\
        text-shadow: none !important;\
    }');

    css.push('.ghAssistantStorageWipe {\
        margin:40px 5px 20px 20px;\
    }');

    if (CONFIG.enableDiffSidebarAndFooter) {
        css.push('.ghAssistantFileFoot {\
            height: ' + CONFIG.footerSize + 'px;\
            border-top: 1px solid rgb(216, 216, 216);\
            background-image: linear-gradient(' + CONFIG.sidebarColor1 + ', ' + CONFIG.sidebarColor2 + ');\
            font-size: 6pt;}\
        ');
        css.push('.ghAssistantFileSide {\
            width: '+ CONFIG.sidebarSize + 'px;  border-right: 1px solid rgb(216, 216, 216);\
            background-image: linear-gradient(to right, ' + CONFIG.sidebarColor2 + ', ' + CONFIG.sidebarColor1 + ');\
            font-size: 6pt;\
            height: 100%;\
            float: left;\
            position: absolute;\
            top:0;\
            left:-' + (CONFIG.sidebarSize+2) + 'px;\
            border-radius:0 0 0 10px;}\
        ');

        css.push('.ghAssistantFileFoot:hover {\
            background-image: linear-gradient(' + CONFIG.sidebarColor2 + ', ' + CONFIG.sidebarColor1 + ');\
        }');
        css.push('.ghAssistantFileSide:hover {\
            background-image: linear-gradient(to right, ' + CONFIG.sidebarColor1 + ', ' + CONFIG.sidebarColor2 + ');\
        }');

        css.push('.ghAssistantFileFoot a {display: block; height:100%;}');
        css.push('.ghAssistantFileSide a {display: block; height:100%;}');

        // override GH's CSS with the "+" button on the side to add the comments
        css.push('#files .add-line-comment  { margin-left:-'+ (25+CONFIG.sidebarSize)+'px} !important');
    }

    DomUtil.addCss(css.join('\n'));
};

/**
 * Get a list of containers of the each diff-file.
 */
GHA.getDiffContainers = function() {
    var mainDiffDiv = document.getElementById('files');
    var children = mainDiffDiv.children;
    var nbOfCommits = children.length;

    var out = [];
    for(var i=0, ii = nbOfCommits; i<ii; i++) {
        var child = children[i];
        if(child.id && child.id.indexOf('diff-') === 0){
            out.push(child);
        }
    }
    return out;
};

/**
 * Attach click listeners to each of the headers of the files in the diff
 */
GHA.attachToggleDisplayOnClickListeners = function() {
    var diffContainers = GHA.getDiffContainers();

    for(var i=0, ii = diffContainers.length; i<ii; i++) {
        GHA._attachClickListenersToChild(diffContainers[i]);
    }
}

GHA._attachClickListenersToChild = function (child) {
    if(!child.id || child.id.indexOf('diff-') == -1){
        return;
    }
    var diffContainer = child; // document.getElementById('diff-1');

    // We want the evt to fire on the header and some, but not all of the children...
    var diffContainerHeader = diffContainer.children[0];
    var diffContainerFileNameHeader = diffContainerHeader.children[0];

    var diffContainerBody = diffContainer.children[1];

    var handler1 = GHA._getOnClickToggleDisplayHandler(diffContainerBody, false);
    var handler2 = GHA._getOnClickToggleDisplayHandler(diffContainerBody, true);

    diffContainerFileNameHeader.addEventListener('click', handler1, false);
    diffContainerHeader.addEventListener('click', handler2, true);
    diffContainerHeader.style.cursor = 'pointer';
}

/**
 * @param elem element to be toggled upon clicking
 * @param bStrictTarget whether the event listener should fire only on its strict target or also children
 */
GHA._getOnClickToggleDisplayHandler = function(elem, bStrictTarget) {
    return function(evt){
        if(bStrictTarget){
            if (evt.currentTarget != evt.target) {
                // don't want to trigger the event when clicking on "View file" or "Show comment"
                return;
            }
        }

        var currDisplay = elem.style.display;
        if(currDisplay === 'none') {
            elem.style.display = 'block';
        } else {
            elem.style.display = 'none';
        }
    };
};

/**
 * Hide long diffs, i.e. those whose diff size is > @minDiff
 * @param {Integer} minDiff
 */
GHA.hideLongDiffs = function(minDiff) {

    var mainDiffDiv = document.getElementById('files');
    var children = mainDiffDiv.children;
    var nbOfCommits = children.length;

    for(var i=0, ii = nbOfCommits; i<ii; i++) {
        var child = children[i];
        if(!child.id || child.id.indexOf('diff-') == -1){
            continue;
        }

        var diffContainer = child;
        var diffContainerBody = diffContainer.children[1];

        var diffStats = parseInt(diffContainer.children[0].children[0].children[0].firstChild.textContent, 10);
        //console.log(diffStats);

        if(diffStats > minDiff){
            diffContainerBody.style.display = 'none';
        }
    }
};

/**
 * Add buttons that collapse/expand all the diffs on the current page.
 */
GHA.attachCollapseExpandDiffsButton = function (hiddenByDefault) {

    var buttonBarContainer = document.querySelector('#toc');
    var buttonBar = buttonBarContainer.children[0];

    var newButton = document.createElement('a');
    newButton.className = 'minibutton';
    newButton.href = '#';

    newButton.innerHTML = hiddenByDefault ? L10N.expandAll : L10N.collapseAll;

    var nowHidden = hiddenByDefault; // closure to keep state
    newButton.addEventListener('click', function(evt) {
        if(nowHidden == true){
            GHA.toggleDisplayAll(true);
            nowHidden = false;
            newButton.innerHTML = L10N.collapseAll;
        } else {
            GHA.toggleDisplayAll(false);
            nowHidden = true;
            newButton.innerHTML = L10N.expandAll;
        }
    });

    buttonBar.appendChild(newButton);
};

/**
 * Collapse/expand all the diffs on the current page.
 */
GHA.toggleDisplayAll = function(bVisible) {

    var mainDiffDiv = document.getElementById('files');
    var children = mainDiffDiv.children;
    var nbOfCommits = children.length;

    var newDisplay = bVisible ? 'block' : 'none';

    for(var i=0, ii = nbOfCommits; i<ii; i++) {
        var child = children[i];
        if(!child.id || child.id.indexOf('diff-') == -1){
            continue;
        }

        var diffContainer = child;
        var diffContainerBody = diffContainer.children[1];

        diffContainerBody.style.display = newDisplay;
    }
};

/**
 * Attach Ok/Fail buttons for code review, and sidebars/footers for navigating to the top of the file,
 * for each of the files on the diff list.
 */
GHA.attachPerDiffFileFeatures = function () {

    var mainDiffDiv = document.getElementById('files');
    var children = mainDiffDiv.children;
    var nbOfCommits = children.length;

    for(var i=0, ii = nbOfCommits; i<ii; i++) {
        var child = children[i];
        if (CONFIG.enableReviewedButton) {
            GHA._attachReviewStatusButton(child, L10N.ok);
            GHA._attachReviewStatusButton(child, L10N.fail);
        }
        if (CONFIG.enableDiffSidebarAndFooter) {
            GHA._attachSidebarAndFooter(child);
        }
    }
};

GHA._getFilePathFromDiffContainerHeader = function (diffContainerHeader) {
    return diffContainerHeader.querySelector('.info').children[1].innerHTML.trim();
}

GHA._attachReviewStatusButton = function (child, text /*also cssClassNamePostfix*/) {
    if(!child.id || child.id.indexOf('diff-') == -1){
        return;
    }

    var currentDiffIdx = Number(child.id.replace('diff-',''));
    var diffContainer = child;
    var diffContainerHeader = diffContainer.children[0]; // .meta
    var diffContainerBody = diffContainer.children[1];   // .data

    var parent = diffContainer.querySelector('div.actions > div.button-group');

    var newButton = document.createElement('a');
    newButton.className = 'minibutton';
    //newButton.href = '#fakeHash';

    newButton.innerHTML = text;

    newButton.addEventListener('click', function(evt) {
        var ghaClassName = 'ghAssistantButtonState' + text;
        var ghaClassNameAlt = 'ghAssistantButtonState' + (text === L10N.ok ? L10N.fail : L10N.ok);
        var wasMarked = diffContainerHeader.className.indexOf(ghaClassName) > -1;
        var filePath = GHA._getFilePathFromDiffContainerHeader(diffContainerHeader);

        if(wasMarked){
            /* unmark */

            // remove from localstorage
            GHA.Storage.clearState(filePath);

            // unmark the header with background color change
            GHAReviewStatusMarker.unmark(diffContainerHeader, ghaClassName);
        } else {
            /* mark as Ok/Fail */

            // save in localstorage
            var newState = (text === L10N.ok ? 1 : 0);
            GHA.Storage.saveState(filePath, newState);

            // mark the header with background color change
            GHAReviewStatusMarker.mark(diffContainerHeader, ghaClassName, ghaClassNameAlt);

            // hide the just-reviewed file contents
            diffContainerBody.style.display = 'none';

            // scroll the page so that currently reviewed file is in the top
            document.location = '#diff-' + currentDiffIdx;

            // expand the next file if it was hidden
            var nextFileContainer = document.getElementById('diff-' + (currentDiffIdx+1));
            if(nextFileContainer) {
                nextFileContainer.children[1].style.display = 'block';
            }
        }
    });

    parent.insertBefore(newButton, parent.firstChild);
};

/**
 * Add sidebar and footer to each of the files in the diff. When clicked, that sidebar/footer
 * scrolls page to the top of the current file.
 */
GHA._attachSidebarAndFooter = function (child) {
    if(!child.id || child.id.indexOf('diff-') == -1){
        return;
    }

    var diffContainer = child;
    var diffContainerBody = diffContainer.children[1];

    var hLink = '<a title="Click me to scroll to the top of this file" href="#' + diffContainer.id + '">&nbsp;</a>';

    var dfoot = document.createElement('div');
    dfoot.className = 'ghAssistantFileFoot';
    dfoot.innerHTML = hLink;
    diffContainer.appendChild(dfoot);

    var dsidebar = document.createElement('div');
    dsidebar.className = 'ghAssistantFileSide';
    dsidebar.innerHTML = hLink;
    diffContainer.appendChild(dsidebar);
};

GHA.attachStorageWipeButtons = function () {
    var footer = document.getElementById('footer');

    var div = document.createElement('div');
    var buttonAll = document.createElement('button');
    buttonAll.innerHTML = 'Wipe ALL GHA storage';
    buttonAll.className = 'minibutton ghAssistantStorageWipe';
    buttonAll.addEventListener('click', function () {
        var msg = "Really want to wipe *all* the GH Assistant storage (" + GHA.Storage.checkSize() + " entries)?";
        if( window.confirm(msg) ) {
            GHA.Storage.wipeStorage();
            window.alert("Done");
        }
    });

    var repoId = GHA.Storage._repoId;
    var prefix = GHA.Storage._prefix + repoId;

    var buttonRepo = document.createElement('button');
    buttonRepo.innerHTML = 'Wipe GH Assistant storage for this repo';
    buttonRepo.className = 'minibutton ghAssistantStorageWipe';
    buttonRepo.addEventListener('click', function () {
        var msg = "Really want to wipe GH Assistant storage for " + repoId + " (" + GHA.Storage.checkSize(prefix) + " entries)?";
        if( window.confirm(msg) ) {
            GHA.Storage.wipeStorage(prefix);
            window.alert("Done");
        }
    });

    div.appendChild(buttonRepo);
    div.appendChild(buttonAll);
    footer.appendChild(div);
};

// =================================================================================================

var GHAReviewStatusMarker = {
    mark : function (diffContainerHeader, ghaClassName, ghaClassNameAlt) {
        // 1 remove 'Ok' if we're setting 'Fail' and the opposite as well
        // 2 add the class name for 'Fail' / 'Ok'
        diffContainerHeader.className = diffContainerHeader.className.replace(ghaClassNameAlt, '') + " " + ghaClassName;
    },
    unmark : function (diffContainerHeader, ghaClassName) {
        // remove the added class name for 'Fail' / 'Ok'
        diffContainerHeader.className = diffContainerHeader.className.replace(ghaClassName, '');
    }
};

// =================================================================================================

var GHALocalStorage = function () {

    this._prefix = "__GHA__";

    // @type {String} objectId either
    this._objectId = null;
    this._repoId = null;

    this.init = function () {
        var loc = document.location.pathname.replace(/\//g,'#'); // for easier regexes
        var matches = loc.match(/^#([a-z0-9\-]+#[a-z0-9\-]+)#(commit|pull|compare)#([a-z0-9\-]+)/);
        if (matches) {
            this._objectId = matches[0];
            this._repoId = "#" + matches[1]; // we want repoId to be a leading substring of objectId
        } else {
            console.error("Unable to create a local storage key for " + loc);
            this.saveState = this.loadState = this.clearState = function () {};
        }
    };
    /**
     * @param {String} filePath
     * @param {Integer} state 0 (fail), 1 (ok)
     */
    this.saveState = function (filePath, state) {
        var sKey = this._getKeyFromObjId(filePath);
        window.localStorage.setItem(sKey, state);
    };

    /**
     * @param {String} filePath
     */
    this.loadState = function (filePath) {
        var sKey = this._getKeyFromObjId(filePath);
        var value = window.localStorage.getItem(sKey);
        return value;
    };

    this.clearState = function (filePath) {
        var sKey = this._getKeyFromObjId(filePath);
        window.localStorage.removeItem(sKey);
    };

    this.wipeStorage = function (arbitraryPrefix) {
        arbitraryPrefix = arbitraryPrefix || this._prefix;

        for (var key in window.localStorage){
            if(key.slice(0, arbitraryPrefix.length) === arbitraryPrefix) {
                window.localStorage.removeItem(key);
            }
        }
    };

    this.checkSize = function (arbitraryPrefix) {
        arbitraryPrefix = arbitraryPrefix || this._prefix;

        var n = 0;
        for (var key in window.localStorage){
            if(key.slice(0, arbitraryPrefix.length) === arbitraryPrefix) {
                n++
            }
        }
        return n;
    };

    this._getKeyFromObjId = function (filePath) {
        return this._prefix + this._objectId + filePath.replace(/\//g, '#');
    }


};

// =================================================================================================

var GHALocalStorageLoader = function (storage) {

    this._storage = storage;

    this.run = function () {
        var diffContainers = GHA.getDiffContainers();

        for(var i=0, ii = diffContainers.length; i<ii; i++) {
            this.updateStateFromStorage(diffContainers[i]);
        }
    };

    this.updateStateFromStorage = function(diffContainer) {
        var diffContainerHeader = diffContainer.children[0];

        var filePath = GHA._getFilePathFromDiffContainerHeader(diffContainerHeader);
        var state = this._storage.loadState(filePath); // might be 0, 1 or undefined

        if(state != null) {
            var text = (state == 0) ? L10N.fail : L10N.ok;
            var ghaClassName = 'ghAssistantButtonState' + text;
            var ghaClassNameAlt = 'ghAssistantButtonState' + (text === L10N.ok ? L10N.fail : L10N.ok);

            GHAReviewStatusMarker.mark (diffContainerHeader, ghaClassName, ghaClassNameAlt);
        }
    };
};

// =================================================================================================

var DomUtil = {
    addCss : function (sCss) {
        var dStyle = document.createElement('style');
        dStyle.type = 'text/css';
        dStyle.appendChild(document.createTextNode(sCss));
        document.getElementsByTagName('head')[0].appendChild(dStyle);
    }
};

// =================================================================================================

var main = function () {

    // read config
    var mainDiffDiv = document.getElementById('files');
    var nbOfFiles = mainDiffDiv.children.length;

    var autoHide = false;
    var autoHideLong = false;
    if(nbOfFiles > CONFIG.dontHideUnlessMoreThanFiles) {
        if(CONFIG.hideAllWhenMoreThanFiles > 0 && nbOfFiles > CONFIG.hideAllWhenMoreThanFiles){
            autoHide = true;
        }else if(CONFIG.hideFileWhenDiffGt > 0) {
            autoHideLong = true;
        }
    }

    // let's go
    GHA.Storage = new GHALocalStorage();
    GHA.Storage.init();

    var storageLoader = new GHALocalStorageLoader(GHA.Storage);
    storageLoader.run();

    GHA.attachGlobalCss();
    GHA.attachToggleDisplayOnClickListeners();
    if(autoHide) {
        GHA.toggleDisplayAll(false);
    }else if(autoHideLong) {
        GHA.hideLongDiffs(CONFIG.hideFileWhenDiffGt);
    }
    GHA.attachCollapseExpandDiffsButton(autoHide);

    GHA.attachPerDiffFileFeatures();
    GHA.attachStorageWipeButtons();
};

main();
