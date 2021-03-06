/* global requests helper */
'use strict';
// ==UserScript==
// @name         MusicBrainz: Display alias count
// @namespace    mbz-loujine
// @author       loujine
// @version      2020.4.12
// @downloadURL  https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mbz-display_count_alias.user.js
// @updateURL    https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mbz-display_count_alias.user.js
// @supportURL   https://github.com/loujine/musicbrainz-scripts
// @icon         https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/icon.png
// @description  musicbrainz.org: Display alias count on work/artist pages
// @compatible   firefox+tampermonkey
// @license      MIT
// @require      https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mbz-loujine-common.js
// @include      http*://*musicbrainz.org/work/*
// @exclude      http*://*musicbrainz.org/work/add*
// @exclude      http*://*musicbrainz.org/work/create*
// @include      http*://*musicbrainz.org/artist/*
// @exclude      http*://*musicbrainz.org/artist/add*
// @exclude      http*://*musicbrainz.org/artist/create*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// adapted from jesus2099  mb. INLINE STUFF

function parseCount(resp, tab) {
    var cnt = resp.aliases.length,
        locales = [];
    if (cnt > 0) {
        tab.style.setProperty('background-color', '#6f9');
    }
    tab.textContent += ' (' + cnt + ')';
    resp.aliases.forEach(function (alias) {
        if (alias.locale) {
            locales.push(alias.locale);
        }
    });
    if (locales.length > 0) {
        tab.textContent += ' ' + locales.sort().join(',');
    }
}

(function showCountAliases() {
    var tab = document.querySelector("a[href$='/aliases']"),
        entityType = document.URL.split('/')[3],
        url = helper.wsUrl(entityType, ['aliases']);
    requests.GET(url, function (resp) {
        parseCount(JSON.parse(resp), tab);
    });
})();
