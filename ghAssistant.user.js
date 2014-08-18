// ==UserScript==
// @name            GitHub code review assistant
// @description     Collapse & expand files one by one on diffs and mark them as reviewed. Useful to review commits with lots of files changed.
// @icon            https://github.com/favicon.ico
// @version         1.0.2.20140724
// @namespace       http://jakub-g.github.com/
// @author          http://jakub-g.github.com/
// @downloadURL     https://raw.github.com/jakub-g/gh-code-review-assistant/master/ghAssistant.user.js
// @updateURL       https://raw.github.com/jakub-g/gh-code-review-assistant/master/ghAssistant.meta.js
// @userscriptsOrg  http://userscripts.org/scripts/show/153049
// @grant           GM_getValue
// @grant           GM_setValue
// @include         https://github.com/*/*/commit/*
// @include         https://github.com/*/*/pull/*
// @include         https://github.com/*/*/compare/*
// ==/UserScript==

/*jshint -W043,scripturl:true */

/*
 * Copyright 2013-2014 Jakub Gieryluk
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *  http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// ============================================ CONFIG =============================================

// This is the default config that will be read during the very first run of the script.
// It'll be imported during first run to the internal browser's storage via GM_setValue (SQLite
// storages of Greasemonkey/Tampermonkey in user's profile folder of the browser).
// Then it can be changed from the settings dialog on GHA pages.

var CONFIG = {};
CONFIG.hideAllWhenMoreThanFiles =
    {val: 4, type: "int", info: "If there are more than #N files in the diff (commit/pull request), fold them all automatically. 0 disables the feature."};

CONFIG.hideFileWhenDiffMoreThanLines =
    {val: 0, type: "int", info: "If a file has more than #N lines changed, fold that file automatically. Use 0 to disable the feature."};

CONFIG.dontHideAnythingIfLessThanFiles =
    {val: 3, type: "int", info: "Do not apply @hideFileWhenDiffMoreThanLines if there are less than #N files in the diff"};

CONFIG.enableReviewedButtons =
    {val: true, type: "bool", info: "Whether to show Ok/Fail buttons next to each file"};

CONFIG.hideGitHubForWindowsButtons =
    {val: false, type: "bool", info: "Whether to hide 'Open this file in GitHub for Windows' buttons"};

CONFIG.enableDiffSidebarAndFooter =
    {val: true, type: "bool", info: "Whether to show sidebar and footer for each file that scroll to the top of the file on click"};

CONFIG.sidebarSize =
    {val: 12, type: "int", info: "In pixels. See @enableDiffSidebarAndFooter"};
CONFIG.footerSize =
    {val: 8, type: "int", info: "In pixels. See @enableDiffSidebarAndFooter"};
CONFIG.sidebarColor1 =
    {val: '#eeeeee', type: "color", info: "This should be #rrggbb color. See @enableDiffSidebarAndFooter"};
CONFIG.sidebarColor2 =
    {val: '#aaaaaa', type: "color", info: "This should be #rrggbb color. See @enableDiffSidebarAndFooter"};

// =================================================================================================

var L10N = {
    ok: 'Ok',
    fail: 'Fail',
    expandAll: 'Expand all',
    expandUnreviewed: 'Expand unreviewed',
    collapseAll: 'Collapse all',
    wipeStorageText : 'Wipe GHA storage:',
    buttonWipeAllStorage: 'all',
    buttonWipeRepoStorage: 'this repo',
    buttonWipeCurrentUrlStorage: 'this URL',
    buttonWipeCurrentCommitStorage: 'this commit',
    noEntriesFound: "No GHA entries to be deleted ",
    noEntriesFoundPrefix: "No GHA entries to be deleted matching the prefix ",
    alertWipeDone: "Done",
    sidebarFooterTooltip: "Click me to scroll to the top of this file",
    questionWipeAll: "Really want to wipe *all* the GH Assistant storage ",
    questionWipeRepo: "Really want to wipe GH Assistant storage for the repo ",
    questionWipeEntry: "Really want to wipe GH Assistant storage for current entity: ",
    orphanedCommitsInfo: "Note though that storage on *commits* is repo-independent in order " +
        "to work across the forks.\nThere are currently %ORPH orphaned commit-related entries.",
    hashInUrlUpdated: "Code review status was exported to the hash in your URL.\nThe hash length is now ",
    codeReviewStatusInfoBtn : "Code review status:",
    importStatusFromUrl : "Import from URL",
    exportStatusToUrl : "Export to URL",
    nothingToExport : "Nothing to export - code review status is empty",
    nothingToImport : "Nothing to import - check your URL hash",
    confirmDeserialize : "This may wipe your current review status. Proceed?\n\n" +
        "Note that for now, importing from URL just highlights items but doesn't store anything in your local storage.",
    openCfg : "Open GH Assistant config dialog",
    refreshForConfigUpdate : "Refresh the page to see the update of the config",
};

var gha = {
    classes : {},  // classes to be instantiated
    instance : {},  // holder of instantiated storage
    DomReader : {},
    DomWriter : {},
    DomUtil : {},
    VisibilityManager : {},
    ReviewStatusMarker : {},
    StatusExporter : {},
    Cfg : {},
    Storage : {},
    ClickHandlers : {},
};

// =================================================================================================

(function(){
    // for easier regexes
    var pageId = document.location.pathname.replace(/\//g,'#');
    gha.Page = {
        pageId    : pageId,
        isCommit  : pageId.match(/^#.*?#.*?#commit/),
        isPull    : pageId.match(/^#.*?#.*?#pull/),
        isCompare : pageId.match(/^#.*?#.*?#compare/),
    };
})();

var makeDiv = function (cssClassName) {
    return makeElem('div', cssClassName);
};
var makeElem = function (elem, cssClassName) {
    var div = document.createElement(elem);
    div.className  = cssClassName || "";
    return div;
};
var isPositiveInteger = function (str) {
    var n = ~~Number(str);
    return String(n) === str && n >= 0;
};

// =================================================================================================

gha.DomReader = {};

/**
 * Get a list of containers of the each diff-file.
 * @return {Array}
 */
gha.DomReader.getDiffContainers = function() {
    var mainDiffDiv = document.getElementById('files');
    var files = [].filter.call(mainDiffDiv.children, function (elm) {
        return elm.nodeName == "DIV" && elm.classList.contains('file'); // elm.id.match(/^diff\-/);
    });
    return files;
};

/**
 * How many files are there in current commit / pull request
 * @return {Integer}
 */
gha.DomReader.getNumberOfFiles = function () {
    return gha.DomReader.getDiffContainers().length;
};

gha.DomReader.getFilePathFromDiffContainerHeader = function (diffContainerHeader) {
    return diffContainerHeader.querySelector('.info').children[1].innerHTML.trim();
};

// =================================================================================================

gha.DomWriter = {};

gha.DomWriter.ghaReviewButtonClassNameBase = 'ghaFileState';

gha.DomWriter.attachGlobalCss = function () {
    var css = [];

    css.push('.floatLeft {float:left;}');
    css.push('.floatRight {float:right;}');

    css.push('a.ghaFileNameSpan {text-decoration: none; margin-left: -10px;  padding: 0 10px;}'); // so that the box's outline looks nicer when focused

    css.push('.ghaFileStateNormal {\
        background-image:   linear-gradient(to bottom, #fafafa, #eaeaea) !important;\
    }');
    css.push('.ghaFileStateOk {\
        background-image:   linear-gradient(to bottom, #333, #444) !important;\
        text-shadow: none !important;\
    }');
    css.push('.ghaFileStateFail {\
        background-image:   linear-gradient(to bottom, #833, #844) !important;\
        text-shadow: none !important;\
    }');

    css.push('.ghaFileStateNormal a.ghaFileNameSpan { color: #555 !important;}');
    css.push('.ghaFileStateOk     a.ghaFileNameSpan { color: #fff !important;}');
    css.push('.ghaFileStateFail   a.ghaFileNameSpan { color: #fff !important;}');

    // we have border, let's tell Firefox not to add its default dotted outline
    css.push('.minibutton:focus {outline: 0;}');

    css.push('.ghaFileStateNormal .minibutton{text-shadow: none !important; background-image: linear-gradient(to bottom, #fafafa, #eaeaea) !important;}');
    css.push('.ghaFileStateFail   .minibutton{text-shadow: none !important; background-image: linear-gradient(to bottom, #833, #844) !important;       color:#fff !important;}');
    css.push('.ghaFileStateOk     .minibutton{text-shadow: none !important; background-image: linear-gradient(to bottom, #333, #344) !important;       color:#fff !important;}');

    // default GH CSS is suited only for their one button "view file", let's fix it as we add 2 more buttons
    css.push('.ghaFileStateNormal .minibutton:focus {border-radius: 3px; box-shadow: 0 0 3px 4px rgba(81, 167, 232, 0.5);}');
    css.push('.ghaFileStateFail   .minibutton:focus {border-radius: 3px; box-shadow: 0 0 3px 4px #fc0; border-color: #da0;}');
    css.push('.ghaFileStateOk     .minibutton:focus {border-radius: 3px; box-shadow: 0 0 3px 4px #fc0; border-color: #da0;}');

    css.push('.ghaFileNameSpan:focus {outline:0; border-radius:5px;}');
    css.push('.ghaFileStateNormal .ghaFileNameSpan:focus {box-shadow: 0 0 3px 4px rgba(81, 167, 232, 0.5);}');
    css.push('.ghaFileStateFail   .ghaFileNameSpan:focus {box-shadow: 0 0 3px 4px #fc0;}');
    css.push('.ghaFileStateOk     .ghaFileNameSpan:focus {box-shadow: 0 0 3px 4px #fc0;}');

    css.push('.ghaBottomButton {\
        margin:40px 5px 20px 15px;\
    }');

    css.push('.ghaDialogParent {\
        display: none;\
    }');

    css.push('.ghaDialogCenter {\
        z-index: 1000;\
        position: fixed;\
        overflow-y: auto;\
        margin: auto;\
        top:0; left:0; bottom:0; right:0;\
        background-color: #8CCEF8;\
        \
        border: 0.1rem solid black;\
        height: 20rem;\
        width: 48rem;\
        padding: 0.5rem;\
        border-radius: 0.5rem;\
    }');
    css.push('.ghaDialogCenter input {\
        border: 0.1rem solid #666;\
        border-radius: 0.1rem;\
    }');
    css.push('.ghaDialogCloseBtn {\
        display: block;\
        float: right;\
        text-align: center;\
        background-color: darkred;\
        color:white;\
        cursor: pointer;\
        \
        border: 0.15rem solid white;\
        width: 2rem;\
        height: 2rem;\
        font: bold 1.4rem Verdana;\
    }');
    css.push('.ghaDialogCloseBtn:focus {\
        background-color: red;\
    }');

    css.push('.ghaCfgWrapper {\
        -moz-columns: 2;-webkit-columns: 2; columns: 2;\
    }');
    css.push('.ghaCfgText {\
        display: block;\
        float:left;\
        clear:left;\
        cursor: help;\
        \
        margin: 0.1rem;\
        padding: 0.2rem;\
        width: 14rem;\
        height: 2rem;\
        min-height: 2rem;\
    }');
    css.push('input.ghaCfgInput {\
        display: block;\
        float:left;\
        \
        margin: 0.1rem;\
        border: 0.1rem solid black;\
        padding: 0.2rem;\
        width: 5rem;\
        height: 1.5rem;\
        min-height: 1.5rem;\
    }');
    css.push('input.ghaCfgInput:focus {\
        background-color: #FF9;\
        outline: 3px solid navy;\
        -moz-outline-radius: 3px;\
        box-shadow: none;\
    }');
    css.push('.ghaCfgSaveIndicator {\
        display: none;\
        float:left;\
        text-align:center;\
        cursor:help;\
        \
        margin: 0 0.4rem;\
        border: 0.2rem solid black;\
        border-radius: 0.5rem;\
        width: 2.7rem;\
        height: 1.7rem;\
        min-height: 1rem;\
        font: bold 1rem Arial;\
    }');
    css.push('.ghaRefreshInfoDiv {\
        display: none;\
        clear:both;\
        text-align: center;\
        color: darkred;\
        \
        margin-top:0.5rem;\
    }');
    css.push('.ghaCfgOpenButton {\
        display: block;\
        margin: 0px auto 20px;\
    }');


    if (CONFIG.enableDiffSidebarAndFooter.val) {
        css.push('.ghaFileFoot {\
            height: ' + CONFIG.footerSize.val + 'px;\
            border-top: 1px solid rgb(216, 216, 216);\
            background-image: linear-gradient(' + CONFIG.sidebarColor1.val + ', ' + CONFIG.sidebarColor2.val + ');\
            font-size: 6pt;}\
        ');
        css.push('.ghaFileSide {\
            width: '+ CONFIG.sidebarSize.val + 'px;  border-right: 1px solid rgb(216, 216, 216);\
            background-image: linear-gradient(to right, ' + CONFIG.sidebarColor2.val + ', ' + CONFIG.sidebarColor1.val + ');\
            font-size: 6pt;\
            height: 100%;\
            float: left;\
            position: absolute;\
            top:0;\
            left:-' + (CONFIG.sidebarSize.val+2) + 'px;\
            border-radius:0 0 0 10px;}\
        ');

        css.push('.ghaFileFoot > a:hover, .ghaFileFoot > a:focus {\
            background-image: linear-gradient(' + CONFIG.sidebarColor2.val + ', ' + CONFIG.sidebarColor1.val + ');\
            outline: 0;\
        }');
        css.push('.ghaFileSide> a:hover {\
            background-image: linear-gradient(to right, ' + CONFIG.sidebarColor1.val + ', ' + CONFIG.sidebarColor2.val + ');\
        }');

        css.push('.ghaFileFoot > a {display: block; height:100%;}');
        css.push('.ghaFileSide > a {display: block; height:100%;}');

        // override GH's CSS with the "+" button on the side to add the comments
        css.push('#files .add-line-comment  { margin-left:-'+ (25+CONFIG.sidebarSize.val)+'px !important; }');
    }

    if (CONFIG.hideGitHubForWindowsButtons.val) {
        css.push('a[href^="github-windows://"], a[href^="http://windows.github.com"] {display: none;}');
    }

    gha.DomUtil.addCss(css.join('\n'));
};

/**
 * Attach click listeners to each of the headers of the files in the diff
 */
gha.DomWriter.attachToggleDisplayOnClickListeners = function() {
    var diffContainers = gha.DomReader.getDiffContainers();

    for(var i=0, ii = diffContainers.length; i<ii; i++) {
        gha.DomWriter._attachClickListenersToChild(diffContainers[i]);
    }
};

gha.DomWriter._attachClickListenersToChild = function (diffContainer) {
    if(!diffContainer.id || diffContainer.id.indexOf('diff-') == -1){
        return;
    }

    // We want the evt to fire on the header and some, but not all of the children...
    var diffContainerHeader = diffContainer.children[0];
    var diffContainerFileNameHeader = diffContainerHeader.children[0];

    var diffContainerBody = diffContainer.children[1];

    var handlerForFileNameHeader = gha.ClickHandlers.createToggleDisplayHandler(diffContainerBody, false);
    var handlerForHeader         = gha.ClickHandlers.createToggleDisplayHandler(diffContainerBody, true);

    diffContainerFileNameHeader.addEventListener('click', handlerForFileNameHeader, false);
    diffContainerHeader        .addEventListener('click', handlerForHeader, true);
    diffContainerHeader        .style.cursor = 'pointer';
};

/**
 * Add buttons that collapse/expand all the diffs on the current page.
 */
gha.DomWriter.attachCollapseExpandDiffsButton = function (hiddenByDefault) {

    var buttonBarContainer = document.querySelector('#toc');
    var refElement = buttonBarContainer.querySelector('.toc-diff-stats');

    var btn = document.createElement('a');
    btn.id = 'ghaToggleCollapseExpand';
    btn.className = 'minibutton right';
    btn.tabIndex = 0;
    btn.href = 'javascript:void(0);';

    var nowVisible = 1 - hiddenByDefault; // closure to keep state; boolean to int conversion
    btn.addEventListener('click', function(evt) {
        // change the state between 0:all hidden, 1:all visible, 2:unreviewed visible
        if (nowVisible === 0) {
            nowVisible = 2;
            btn.innerHTML = L10N.expandAll;
        } else if (nowVisible == 2){
            nowVisible = 1;
            btn.innerHTML = L10N.collapseAll;
        } else if (nowVisible == 1){
            nowVisible = 0;
            btn.innerHTML = L10N.expandUnreviewed;
        }
        gha.VisibilityManager.toggleDisplayAll(nowVisible);
    });
    // the innerHTML must be in line with the above function's logic
    btn.innerHTML = (nowVisible) ? L10N.collapseAll : L10N.expandUnreviewed;

    buttonBarContainer.insertBefore(btn, refElement);
};

/**
 * Attach Ok/Fail buttons for code review, and sidebars/footers for navigating to the top of the file,
 * for each of the files on the diff list.
 */
gha.DomWriter.attachPerDiffFileFeatures = function () {

    var mainDiffDiv = document.getElementById('files');
    var children = mainDiffDiv.children;
    var nbOfCommits = children.length;

    for(var i=0, ii = nbOfCommits; i<ii; i++) {
        var child = children[i];
        if(!child.id) {
            continue;
        }
        if (CONFIG.enableReviewedButtons.val) {
            gha.DomWriter._attachReviewStatusButton(child, L10N.ok);
            gha.DomWriter._attachReviewStatusButton(child, L10N.fail);
            gha.DomWriter.makeFileNameKeyboardAccessible(child);
        }
        if (CONFIG.enableDiffSidebarAndFooter.val) {
            gha.DomWriter._attachSidebarAndFooter(child);
        }
    }
};

gha.DomWriter.makeFileNameKeyboardAccessible = function (child) {
    var fileNameSpan = child.querySelector('.info > .js-selectable-text');
    // turns out getting parent is impossible after changing outerHTML, let's do it now
    var diffContainerBody = fileNameSpan.parentNode.parentNode.parentNode.children[1];
    fileNameSpan.className += ' ghaFileNameSpan';

    // Yeah this is bad and fragile, but I don't want to create yet another button.
    // Let's make this span be an anchor, so it magically gets support for executing 'onclick' from keyboard event
    // See http://jakub-g.github.io/accessibility/onclick/
    fileNameSpan.tabIndex = 0;
    fileNameSpan.outerHTML = fileNameSpan.outerHTML.replace('span', 'a');

    // Firefox bug (or feature): after writing to outerHTML, can't use the handle to 'fileNameSpan' to write 'href';
    // it's discarded, probably the browser still think it's a span
    child.querySelector('.ghaFileNameSpan').href = 'javascript:void(0);';

    // Ok, now we're keyboard-reachable, let's add an event listener then which shows/hides the diff
    var handler = gha.ClickHandlers.createToggleDisplayHandler(diffContainerBody, true);
    fileNameSpan.addEventListener('click', handler, false);
};

gha.DomWriter._attachReviewStatusButton = function (diffContainer, text /*also cssClassNamePostfix*/) {
    if(!diffContainer.id || diffContainer.id.indexOf('diff-') == -1){
        return;
    }

    var newButton = document.createElement('a');
    newButton.className = 'minibutton ghaToggleFileState ghaToggleFileState' + (text == L10N.ok ? 'Ok' : 'Fail');

    newButton.href = "javascript:void(0)"; // crucial to make it launchable from keyboard
    newButton.tabIndex = 0;
    newButton.innerHTML = text;
    newButton.addEventListener('click', gha.ClickHandlers.createReviewButtonHandler(text, diffContainer));

    var parentOfNewButton = diffContainer.querySelector('div.actions');
    gha.DomUtil.insertAsFirstChild(newButton, parentOfNewButton);
};

/**
 * Add sidebar and footer to each of the files in the diff. When clicked, that sidebar/footer
 * scrolls page to the top of the current file.
 */
gha.DomWriter._attachSidebarAndFooter = function (child) {
    if(!child.id || child.id.indexOf('diff-') == -1){
        return;
    }

    var diffContainer = child;
    var diffContainerBody = diffContainer.children[1];

    var hLink = '<a tabIndex=0 title="' + L10N.sidebarFooterTooltip + '" href="#' + diffContainer.id + '">&nbsp;</a>';

    var dfoot = makeDiv('ghaFileFoot');
    dfoot.innerHTML = hLink;
    diffContainer.appendChild(dfoot);

    var dsidebar = makeDiv('ghaFileSide');
    dsidebar.innerHTML = hLink.replace('tabIndex=0', 'tabIndex=-1'); // let only footer be TAB-navigable, no need to have both
    diffContainer.appendChild(dsidebar);
};


// =================================================================================================

gha.StatusExporter = {};

gha.StatusExporter.MAGIC_STRING = ";GHADATA=";

gha.StatusExporter.createButtonSerialize = function () {
    var btn = gha.DomUtil.createButton({
        text : L10N.exportStatusToUrl
    });

    btn.addEventListener('click', function () {
        var status = gha.instance.storage.getEntriesForCurrentContext();
        if (status.length === 0) {
            alert(L10N.nothingToExport);
            return;
        }

        var entries = status.entries;
        var fullPrefix = gha.instance.storage.getFullPrefixForCurrentContext();

        // strip the boilerplate and save to intermediate object
        var shortStatus = [];
        for (var key in entries) {
            var shortKey = key.replace(fullPrefix, "");
            shortStatus.push({
                key : shortKey,
                value : entries[key]
            });
        }

        var serialized = shortStatus.map(function (item){
            return item.key + ":" + item.value;
        }).join("&");

        var magic = gha.StatusExporter.MAGIC_STRING;
        var hashChunk = global.encodeURIComponent(magic + serialized);
        var hashIdx = window.location.hash.indexOf(magic);
        if (hashIdx >= 0) {
            // overwrite instead of appending multiple times
            window.location.hash = window.location.hash.slice(0, hashIdx) + hashChunk;
        } else {
            window.location.hash += hashChunk;
        }
        alert(L10N.hashInUrlUpdated + hashChunk.length);
    });

    return btn;
};

gha.StatusExporter.createButtonDeserialize = function () {
    var btn = gha.DomUtil.createButton({
        text : L10N.importStatusFromUrl
    });

    btn.addEventListener('click', function () {
        var magic = gha.StatusExporter.MAGIC_STRING;
        var hash = global.decodeURIComponent(window.location.hash);

        // check if GHADATA is present in hash
        var idx = hash.indexOf(magic);
        if (idx == -1) {
            alert(L10N.nothingToImport);
            return;
        }

        // warn user this might overwrite status
        var msg = L10N.confirmDeserialize;
        if( !window.confirm(msg) ) {
            return;
        }

        var ghaData = hash.slice(idx + magic.length);
        var asDeserialized = ghaData.split("&");
        var storageHashmap = {};
        asDeserialized.forEach(function (sKeyAndValue) {
            var data = sKeyAndValue.split(":");
            var key = data[0];
            var value = data[1];
            var filePath = key.replace(/#/g, "/");
            storageHashmap[filePath] = value;
        });

        // hack: create an instance of storage loader, using storageHashmap as provider
        new gha.classes.GHALocalStorageLoader({
            loadState : function (filePath) {
                return storageHashmap[filePath];
            }
        }).run();
    });

    return btn;
};

// =================================================================================================

gha.Cfg = {};

gha.Cfg.synchronizeSettingsWithBrowser = function () {
    // Read things from GM_getValue, use CONFIG above just as defaults in case entries are not there
    // After the first run, we want a perfect sync between GM_getValue and CONFIG

    // For reading, we can then use CONFIG
    // For writing, special method that updates both CONFIG and GM_* storage
    for (var key in CONFIG) {
        var val = GM_getValue(key);

        // make sure we have numeric values as numbers - they could be stored to GM storage as strings...
        if (typeof(val) !== "boolean" && val == Number(val)) {
            val = Number(val);
        }

        if (val !== undefined) {
            CONFIG[key].val = val;
        } else {
            GM_setValue(key, CONFIG[key].val);
        }
    }
};

gha.Cfg.setValue = function (key, value) {
    CONFIG[key].val = value;
    GM_setValue(key, value);
};

gha.Cfg.getDynamicConfig = function (CONFIG, nbOfFiles) {
    var EVALEDCONFIG = {
        autoHide : false,
        autoHideLong : false
    };
    if (nbOfFiles >= CONFIG.dontHideAnythingIfLessThanFiles.val) {
        if (CONFIG.hideAllWhenMoreThanFiles.val > 0 && nbOfFiles > CONFIG.hideAllWhenMoreThanFiles.val){
            EVALEDCONFIG.autoHide = true;
        } else if (CONFIG.hideFileWhenDiffMoreThanLines.val > 0) {
            EVALEDCONFIG.autoHideLong = true;
        }
    }
    return EVALEDCONFIG;
};

gha.Cfg.createCfgOpenButton = function (div) {
    var btn = gha.DomUtil.createButton({
        text : L10N.openCfg,
        className : "ghaCfgOpenButton",
    });

    btn.addEventListener('click', function () {
        div.style.display = "block";
    });

    return btn;
};
// =================================================================================================

gha.DomWriter.attachStorageWipeButtons = function (parentDiv) {
    var storage = gha.instance.storage;

    var buttonInfo = gha.DomUtil.createButton({
        text : L10N.wipeStorageText,
        disabled : true
    });

    var buttonCurrentEntity = gha.Storage.createWipeButton({
        id : "ghaWipeCommitOrUrl",
        text : (gha.Page.isCommit ? L10N.buttonWipeCurrentCommitStorage : L10N.buttonWipeCurrentUrlStorage),
        storagePrefix : storage._objectId,
        wipeMsg : function () {
            return L10N.questionWipeEntry  + storage._objectId + " \n%TODEL?";
        }
    });

    var buttonRepo = gha.Storage.createWipeButton({
        id : "ghaWipeRepo",
        text : L10N.buttonWipeRepoStorage,
        storagePrefix : storage._repoId,
        wipeMsg : function () {
            var msg = L10N.questionWipeRepo + storage._repoId + " \n%TODEL?";

            var nOrphanedCommits = storage.checkOrphanedCommits();
            if (nOrphanedCommits > 0) {
                msg += "\n\n" + L10N.orphanedCommitsInfo.replace("%ORPH", nOrphanedCommits);
            }

            return msg;
        }
    });

    var buttonAll = gha.Storage.createWipeButton({
        id : "ghaWipeAll",
        text : L10N.buttonWipeAllStorage,
        storagePrefix : null,
        wipeMsg : function () {
            return L10N.questionWipeAll + " \n%TODEL?";
        }
    });

    var div = makeDiv('floatLeft');

    div.appendChild(buttonInfo);
    div.appendChild(buttonCurrentEntity);
    div.appendChild(buttonRepo);
    div.appendChild(buttonAll);

    parentDiv.appendChild(div);
};

gha.DomWriter.attachStatusImportExportButtons = function (parentDiv) {
    var buttonInfo = gha.DomUtil.createButton({
        text : L10N.codeReviewStatusInfoBtn,
        disabled : true
    });
    var buttonSerialize = gha.StatusExporter.createButtonSerialize();
    var buttonDeserialize = gha.StatusExporter.createButtonDeserialize();

    var div = makeDiv('floatRight');

    div.appendChild(buttonInfo);
    div.appendChild(buttonSerialize);
    div.appendChild(buttonDeserialize);

    parentDiv.appendChild(div);
};

gha.DomWriter.createGHACfgDialog = function () {
    var wrapperDiv = makeDiv('ghaDialogParent');

    var cfgDiv = makeDiv("ghaDialogCenter");

    var closeBtn = makeElem("a","ghaDialogCloseBtn");
    closeBtn.href = "javascript:void(0);";
    closeBtn.innerHTML = 'X';
    closeBtn.addEventListener('click', function () {
        wrapperDiv.style.display = 'none';
    });
    cfgDiv.appendChild(closeBtn);

    var h1 = document.createElement('h1');
    h1.style.cssText = 'width:100%; text-align:center';
    h1.textContent = 'GH Code Review Assistant settings';
    cfgDiv.appendChild(h1);

    var makeInputOnChangeFn = function(key, saveIndicator) {
        return function() {
            var newVal = ("checkbox" == this.type) ? this.checked : this.value;

            // validate
            var valid = true;
            if (CONFIG[key].type == "int" && !isPositiveInteger(newVal)) {
                valid = false;
            }

            if (valid) {
                gha.Cfg.setValue(key, newVal);
                console.info("Writing config: ", key, newVal);
                document.querySelector('.ghaRefreshInfoDiv').style.display = "block";
                saveIndicator.style.cssText += "background-color: lime; color: black;";
                saveIndicator.innerHTML = "OK";
                saveIndicator.title = "Saved to permanent browser storage";
            } else {
                saveIndicator.style.cssText += "background-color: darkred; color: white;";
                saveIndicator.innerHTML = "KO";
                saveIndicator.title = "Invalid value";
            }
            saveIndicator.style.display = "block";
        };
    };

    var cfgItemsDiv = makeDiv('ghaCfgWrapper');
    var cfgItems = [];
    for (var key in CONFIG) {
        var val = CONFIG[key].val;
        var inputType;
        var isCheckbox = false;
        if (typeof val == "boolean") {
            inputType = "checkbox";
            isCheckbox = true;
        } else if (typeof val == "number") {
            inputType = "number";
        } else if (val.charAt(0) == "#") {
            inputType = "color";
        } else {
            inputType = "text";
        }

        var text = makeDiv("ghaCfgText");
        text.innerHTML = key;
        text.title = CONFIG[key].info;

        var saveIndicator = makeDiv("ghaCfgSaveIndicator");

        var input = document.createElement("input");
        input.type = inputType;
        input.className = "ghaCfgInput";
        if (isCheckbox) {
            input.checked = val;
        } else {
            input.value = val;
        }
        input.onchange = makeInputOnChangeFn(key, saveIndicator);

        cfgItemsDiv.appendChild(text);
        cfgItemsDiv.appendChild(input);
        cfgItemsDiv.appendChild(saveIndicator);
    }

    cfgDiv.appendChild(cfgItemsDiv);

    var refreshInfoDiv = makeDiv('ghaRefreshInfoDiv');
    refreshInfoDiv.textContent = L10N.refreshForConfigUpdate;
    cfgDiv.appendChild(refreshInfoDiv);

    wrapperDiv.appendChild(cfgDiv);
    document.body.appendChild(wrapperDiv);
    return wrapperDiv;
};

gha.DomWriter.attachGHACfgButton = function (parentDiv) {
    var cfgDiv = gha.DomWriter.createGHACfgDialog();
    var btn = gha.Cfg.createCfgOpenButton(cfgDiv);

    var div = makeDiv();
    div.style.cssText = "clear:both";
    div.appendChild(btn);

    parentDiv.appendChild(div);
};

gha.DomWriter.enableEditing = function () {
    document.getElementById('files').setAttribute('contenteditable', true);
    document.body.setAttribute('spellcheck', false); // needs to be set on BODY to not mark contenteditable elements in red
    /*var items = document.querySelectorAll('td.diff-line-code');
    for(var i=0, ii = items.length, item; item = items[i], i < ii; i++) {
        item.setAttribute('contenteditable', true); // setting it on some parent elements results in not so good behavior in Firefox
    }*/
};

// =================================================================================================

gha.Storage = {};

gha.Storage.createWipeButton = function (cfg) {
    var storage = gha.instance.storage;

    var btn = gha.DomUtil.createButton(cfg);

    btn.addEventListener('click', function () {
        var prefix = cfg.storagePrefix;
        var msg;

        var nItemsToBeDeleted = storage.checkSize(prefix);
        if (nItemsToBeDeleted === 0) {
            if (prefix) {
                msg = L10N.noEntriesFoundPrefix + prefix.replace(storage._prefix, "");
                if (gha.Page.isCommit) {
                    var nOrphanedCommits = storage.checkOrphanedCommits();
                    if (nOrphanedCommits > 0) {
                        msg += "\n\n" + L10N.orphanedCommitsInfo.replace("%ORPH", nOrphanedCommits);
                    }
                }
            } else {
                msg = L10N.noEntriesFound;
            }
            window.alert(msg);
            setTimeout(gha.Storage.clearSlowEventsHack, 0);
            return;
        } else {
            msg = cfg.wipeMsg().replace("%TODEL", "(" + nItemsToBeDeleted + " entries)");
            if( window.confirm(msg) ) {
                storage.wipeStorage(cfg.storagePrefix);
                window.alert(L10N.alertWipeDone);
            }
            setTimeout(gha.Storage.clearSlowEventsHack, 0);
        }
    });

    return btn;
};

/*
 * GitHub logs data about slow events into local storage and uploads them shortly after that
 * to their servers for inspection. It's likely this will happen when clicking "Wipe GHA storage"
 * buttons due to blocking nature of prompt and alter. Let's remove that data entries not to
 * upload data connected to GHA
 */
gha.Storage.clearSlowEventsHack = function () {
    window.localStorage.removeItem("slow-events");
};

// =================================================================================================

gha.VisibilityManager = {};

/**
 * Hide long diffs, i.e. those whose diff size is > @minDiff
 * @param {Integer} minDiff
 */
gha.VisibilityManager.hideLongDiffs = function(minDiff) {

    var mainDiffDiv = document.getElementById('files');
    var children = mainDiffDiv.children;
    var nbOfCommits = children.length;

    var hashInUrl = document.location.hash.replace('#', '');
    for(var i=0, ii = nbOfCommits; i<ii; i++) {
        var child = children[i];
        if(!child.id || child.id.indexOf('diff-') == -1){
            continue;
        }

        var diffContainer = child;
        var diffContainerBody = diffContainer.children[1];

        var diffStats = parseInt(diffContainer.children[0].children[0].children[0].firstChild.textContent, 10);
        //console.log(diffStats);

        var fileName = diffContainer.querySelector('.meta').getAttribute('data-path');
        if(diffStats > minDiff && fileName != hashInUrl){
            diffContainerBody.style.display = 'none';
        }
    }
};

/**
 * Collapse/expand all the diffs on the current page.
 * @param {Integer} iVisible state after this invocation (0 none, 1 all, 2 unreviewed)
 * @param {Boolean} bKeepItemFromUrlHash whether to skip hiding files that were passed by hash in the URL. Default false.
 */
gha.VisibilityManager.toggleDisplayAll = function (iVisible, bKeepItemFromUrlHash) {

    bKeepItemFromUrlHash = (bKeepItemFromUrlHash === true);

    var diffContainers = gha.DomReader.getDiffContainers();
    var nbOfCommits = diffContainers.length;

    var hashInUrl = document.location.hash.replace('#', '');
    for (var i = 0, ii = nbOfCommits; i < ii; i++) {
        var diffContainer = diffContainers[i];
        var diffContainerHeader = diffContainer.children[0];
        var diffContainerBody = diffContainer.children[1];
        var fileName = diffContainer.querySelector('.meta').getAttribute('data-path');

        if (bKeepItemFromUrlHash && !iVisible && fileName == hashInUrl){
            continue;
        }

        var style = diffContainerBody.style;
        if (iVisible == 2) { // "display unreviewed" mode
            var cl = diffContainerHeader.classList;
            // reading this from DOM since for now, the import from URL feature just highlights items without affecting local storage..
            if (cl.contains("ghaFileStateFail") || cl.contains("ghaFileStateOk")) {
                style.display = "none";
            } else {
                style.display = "block";
            }
        } else {
            style.display = iVisible ? 'block' : 'none';
        }
    }
};

/**
 * If there was something like #diff-046dc342b82cf4f293c2f533e24aeec2 passed in the URL, it points to a specific
 * file that should be made visible.
 */
gha.VisibilityManager.restoreElementsFromHash = function() {
    var hash = document.location.hash.replace('#', '');
    var match; // using match[0] instead of hash in querySelector due to possible ;GHADATA in hash

    var diffContainer;
    var diffContainerBody;

    if ( (match = hash.match("diff-[0-9a-f]{32}")) !== null ) {
        var hashAnchor = document.querySelector("a[name='" + match[0] + "']");
        if (hashAnchor) {
            diffContainer = hashAnchor.nextElementSibling;
            diffContainerBody = diffContainer.children[1];
            diffContainerBody.style.display = "block";
        }
    } else if ( (match = hash.match("diff-[0-9]{1,3}")) !== null ) {
        diffContainer = document.querySelector("div#" + match[0]);
        if (diffContainer) {
            diffContainerBody = diffContainer.children[1];
            diffContainerBody.style.display = "block";
        }
    }
};

// =================================================================================================

gha.ClickHandlers = {};

/**
 * @param elem element to be toggled upon clicking
 * @param bStrictTarget whether the event listener should fire only on its strict target or also children
 */
gha.ClickHandlers.createToggleDisplayHandler = function(elem, bStrictTarget) {
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

gha.ClickHandlers.createReviewButtonHandler = function (text, diffContainer) {
    return function(evt) {

        var diffContainerHeader = diffContainer.children[0]; // .meta
        var diffContainerBody = diffContainer.children[1];   // .data
        var currentDiffIdx = Number(diffContainer.id.replace('diff-',''));

        var btnBaseClass = gha.DomWriter.ghaReviewButtonClassNameBase;
        var ghaClassName = btnBaseClass + text;
        var ghaClassNameAlt = btnBaseClass + (text === L10N.ok ? L10N.fail : L10N.ok);
        var wasMarked = diffContainerHeader.classList.contains(ghaClassName);
        var filePath = gha.DomReader.getFilePathFromDiffContainerHeader(diffContainerHeader);

        if(wasMarked){
            /* unmark */

            // remove from localstorage
            gha.instance.storage.clearState(filePath);

            // unmark the header with background color change
            gha.ReviewStatusMarker.unmark(diffContainerHeader, ghaClassName);
        } else {
            /* mark as Ok/Fail */

            // save in localstorage
            var newState = (text === L10N.ok ? 1 : 0);
            gha.instance.storage.saveState(filePath, newState);

            // mark the header with background color change
            gha.ReviewStatusMarker.mark(diffContainerHeader, ghaClassName, ghaClassNameAlt);

            // hide the just-reviewed file contents
            diffContainerBody.style.display = 'none';

            // scroll the page so that currently reviewed file is in the top
            document.location = '#diff-' + currentDiffIdx;

            // expand the next not-yet-reviewed file, if any (without looping to the beginning)
            var nextFileContainer = gha.ReviewStatusMarker.findNextUnmarked(currentDiffIdx);
            if (nextFileContainer) {
                // make the diff visible
                nextFileContainer.children[1].style.display = 'block';

                // move focus to the file name
                nextFileContainer.querySelector('.ghaFileNameSpan').focus();
            }
        }
    };
};

// =================================================================================================

gha.ReviewStatusMarker = {
    mark : function (diffContainerHeader, ghaClassName, ghaClassNameAlt) {
        var btnBaseClass = gha.DomWriter.ghaReviewButtonClassNameBase;
        // 0 remove 'Normal'
        // 1 remove 'Ok' if we're setting 'Fail' and the opposite as well
        // 2 add the class name for 'Fail' / 'Ok'
        diffContainerHeader.className = diffContainerHeader.className.replace(btnBaseClass + "Normal",'').replace(ghaClassNameAlt, '') + " " + ghaClassName;
    },

    unmark : function (diffContainerHeader, ghaClassName) {
        var btnBaseClass = gha.DomWriter.ghaReviewButtonClassNameBase;
        // remove the added class name for 'Fail' / 'Ok', add class for 'Normal'
        diffContainerHeader.className = diffContainerHeader.className.replace(ghaClassName, '') + " " + btnBaseClass + "Normal";
    },

    findNextUnmarked : function (diffIdx) {
        var btnBaseClass = gha.DomWriter.ghaReviewButtonClassNameBase;
        var wasReviewed = true;
        var fileContainer;

        while (wasReviewed) {
            ++diffIdx;
            fileContainer = document.getElementById('diff-' + diffIdx);

            if (!fileContainer) {
                return null;
            }
            var cn = fileContainer.children[0].className;
            wasReviewed = (cn.indexOf(btnBaseClass + "Ok") != -1) || (cn.indexOf(btnBaseClass + "Fail") != -1);
            if (!wasReviewed) {
                return fileContainer;
            } // else continue the loop
        }
    },

    unmarkAll : function () {
        var btnBaseClass = gha.DomWriter.ghaReviewButtonClassNameBase;
        var diffContainers = gha.DomReader.getDiffContainers();

        for(var i=0, ii = diffContainers.length; i<ii; i++) {
            var diffContainerHeader = diffContainers[i].children[0];
            gha.ReviewStatusMarker.unmark (diffContainerHeader, btnBaseClass + "Ok");
            gha.ReviewStatusMarker.unmark (diffContainerHeader, btnBaseClass + "Fail");
        }
    }
};

// =================================================================================================

gha.classes.GHALocalStorage = function () {

    this._prefix = "__GHA__";

    // @type {String} objectId either
    this._objectId = null;
    this._repoId = null;

    this.init = function () {
        var matches = gha.Page.pageId.match(/^#([A-Za-z0-9_\-\.]+#[A-Za-z0-9_\-\.]+)#(?:commit|pull|compare)#([A-Za-z0-9_\-\.]+)/);
        if (matches) {
            // we want repoId to be a leading substring of objectId
            this._objectId = matches[0];     // sth like "#ariatemplates#ariatemplates#pull#1060"
            this._repoId = "#" + matches[1]; // sth like "#ariatemplates#ariatemplates"

            if (gha.Page.isCommit) {
                // Use canonical SHA1 of the commit, the URL might contain shortened one
                // or sth like some-other-sha^^ etc.
                // However fallback to matches[2] just in case GH changed the selector or something
                var commitSha1 = document.querySelector('.sha').textContent;
                this._objectId = "#commit#" + (commitSha1 || matches[2]);
            }
            //debugger;
        } else {
            console.error("Unable to create a local storage key for " + gha.Page.pageId);
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
        arbitraryPrefix = this._prefix + (arbitraryPrefix || "");

        for (var key in window.localStorage){
            if(key.slice(0, arbitraryPrefix.length) === arbitraryPrefix) {
                window.localStorage.removeItem(key);
            }
        }

        gha.ReviewStatusMarker.unmarkAll();
    };

    this.checkSize = function (arbitraryPrefix) {
        return this.getEntries(arbitraryPrefix).length;
    };

    this.getEntries = function (arbitraryPrefix) {
        arbitraryPrefix = this._prefix + (arbitraryPrefix || "");

        var out = {
            entries : {},
            length : 0
        };
        for (var key in window.localStorage){
            if (key.slice(0, arbitraryPrefix.length) === arbitraryPrefix) {
                out.entries[key] = window.localStorage[key];
                out.length++;
            }
        }
        return out;
    };

    this.getEntriesForCurrentContext = function () {
        return this.getEntries(this._objectId);
    };

    this.getFullPrefixForCurrentContext = function () {
        return this._prefix + this._objectId + "#";
    };

    this.checkOrphanedCommits = function () {
        return this.checkSize("#commit#");
    };

    this._getKeyFromObjId = function (filePath) {
        return this.getFullPrefixForCurrentContext() + filePath.replace(/\//g, '#');
    };
};

// =================================================================================================

gha.classes.GHALocalStorageLoader = function (storage) {

    this._storage = storage;

    this.run = function () {
        var diffContainers = gha.DomReader.getDiffContainers();

        for(var i=0, ii = diffContainers.length; i<ii; i++) {
            this._updateStateFromStorage(diffContainers[i]);
        }
    };

    this._updateStateFromStorage = function(diffContainer) {
        var diffContainerHeader = diffContainer.children[0];

        var filePath = gha.DomReader.getFilePathFromDiffContainerHeader(diffContainerHeader);
        var state = this._storage.loadState(filePath); // might be 0, 1 or undefined

        var btnBaseClass = gha.DomWriter.ghaReviewButtonClassNameBase;
        if (state !== null && state !== undefined) {
            var text = (state === "0") ? L10N.fail : L10N.ok;
            var ghaClassName = btnBaseClass + text;
            var ghaClassNameAlt = btnBaseClass + (text === L10N.ok ? L10N.fail : L10N.ok);

            gha.ReviewStatusMarker.mark (diffContainerHeader, ghaClassName, ghaClassNameAlt);
        } else {
            gha.ReviewStatusMarker.unmark (diffContainerHeader, null);
        }
    };
};

// =================================================================================================

gha.DomUtil = {
    addCss : function (sCss) {
        var dStyle = document.createElement('style');
        dStyle.type = 'text/css';
        dStyle.appendChild(document.createTextNode(sCss));
        document.getElementsByTagName('head')[0].appendChild(dStyle);
    },

    insertAsFirstChild : function (element, parent) {
        parent.insertBefore(element, parent.firstChild);
    },

    createButton : function (cfg) {
        var btn = document.createElement('button');

        btn.id = cfg.id || "";
        btn.disabled = !!cfg.disabled;
        btn.style.cssText = cfg.style || "";
        btn.innerHTML = cfg.text || "";
        btn.className = 'minibutton ghaBottomButton ' + (cfg.className || "");
        btn.tabIndex = 0;

        return btn;
    },
};

// =================================================================================================

var global = this;
var main = function () {
    global.GM_getValue = global.GM_getValue || function () {};
    global.GM_setValue = global.GM_setValue || function () {};

    gha.Cfg.synchronizeSettingsWithBrowser();

    var nbOfFiles = gha.DomReader.getNumberOfFiles();
    var EVALEDCONFIG = gha.Cfg.getDynamicConfig(CONFIG, nbOfFiles);

    // let's go
    gha.instance.storage = new gha.classes.GHALocalStorage();
    gha.instance.storage.init();

    var storageLoader = new gha.classes.GHALocalStorageLoader(gha.instance.storage);
    storageLoader.run();

    gha.DomWriter.attachGlobalCss();
    gha.DomWriter.attachToggleDisplayOnClickListeners();
    if (EVALEDCONFIG.autoHide) {
        gha.VisibilityManager.toggleDisplayAll(false, true);
    } else if (EVALEDCONFIG.autoHideLong) {
        gha.VisibilityManager.hideLongDiffs(CONFIG.hideFileWhenDiffMoreThanLines.val);
    }
    gha.VisibilityManager.restoreElementsFromHash();
    gha.DomWriter.attachCollapseExpandDiffsButton(EVALEDCONFIG.autoHide);

    gha.DomWriter.attachPerDiffFileFeatures();

    var footer = document.querySelector('body > .container');

    gha.DomWriter.attachStorageWipeButtons(footer);
    gha.DomWriter.attachStatusImportExportButtons(footer);
    gha.DomWriter.attachGHACfgButton(footer);

    // gha.DomWriter.enableEditing();
};

main();
