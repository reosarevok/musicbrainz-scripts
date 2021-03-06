/* global $ jQuery GM_info MBImport */
'use strict';
// ==UserScript==
// @name         Import Naxos Music Library 3 releases to MusicBrainz
// @namespace    mbz-loujine
// @author       loujine
// @version      2020.4.21
// @downloadURL  https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mbz-naxos_library_importer.user.js
// @updateURL    https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/mbz-naxos_library_importer.user.js
// @supportURL   https://github.com/loujine/musicbrainz-scripts
// @icon         https://raw.githubusercontent.com/loujine/musicbrainz-scripts/master/icon.png
// @description  Add a button to import Naxos Music Library 3 releases to MusicBrainz
// @compatible   firefox+tampermonkey
// @license      MIT
// @include      http*://*nml3.naxosmusiclibrary.com/catalogue/*
// @exclude      http*://*nml3.naxosmusiclibrary.com/catalogue/search
// @require      https://greasyfork.org/scripts/20955-mbimport/code/mbimport.js?version=264826
// @grant        none
// @run-at       document-end
// ==/UserScript==

// seems that $ is predefined but does not work
$ = jQuery;

const url = document.URL.split('.');
url.splice(0, 1, 'https://www');
const editNote = (
    'Imported from ' + url + '\n'
    + 'Warning: Track durations from Naxos Music Library can seldom be incorrect\n'
    + '\n —\n'
    + 'GM script: "' + GM_info.script.name + '" (' + GM_info.script.version + ')\n\n');

const months = {
    'January': 1, 'February': 2, 'March': 3, 'April': 4,
    'May': 5, 'June': 6, 'July': 7, 'August': 8,
    'September': 9, 'October': 10, 'November': 11, 'December': 12
};

function _clean(s) {
    return s
        .replace(' In ', ' in ')
        .replace('Minor', 'minor')
        .replace('Major', 'major')
        .replace('Op.', 'op. ')
        .replace(/No\. /g, 'no. ')
        .replace(/No\./g, 'no. ')
        .replace('-Flat', '-flat')
        .replace(' Flat', '-flat')
        .replace(' flat', '-flat')
        .replace('-Sharp', '-sharp')
        .replace(' Sharp', '-sharp')
        .replace(' sharp', '-sharp')
        .replace('1. ', 'I. ')
        .replace('2. ', 'II. ')
        .replace('3. ', 'III. ')
        .replace('4. ', 'IV. ')
        .replace('5. ', 'V. ')
        .replace('6. ', 'VI. ')
        .replace('7. ', 'VII. ')
        .replace('8. ', 'VIII. ')
        .replace('9. ', 'IX. ')
        .replace('10. ', 'X. ')
        .replace(' - ', ': ')
        .replace(' | ', ': ')
        .replace('K.', 'K. ') // Mozart
        .replace('S.', 'S. ') // Liszt
    ;
}

function extract_release_data() {
    console.log('extract_release_data');

    function _setTitle() {
        return document.querySelector('div.song-tit').textContent;
    }

    function _setReleasePerformers() {
        const artists = $('ul.album-type li:contains("Artist(s):") span a').toArray();
        const list = artists.map(artist => ({
            'credited_name': artist.textContent,
            'artist_name': artist.textContent,
            'artist_mbid': '',
            'joinphrase': ', '
        }));
        list[list.length - 1].joinphrase = '';
        return list;
    }

    function _setReleaseArtists() {
        const composers = $('ul.album-type li:contains("Composer(s):") span a').toArray();
        const list = composers.map(composer => ({
            'credited_name': composer.textContent,
            'artist_name': composer.textContent,
            'artist_mbid': '',
            'joinphrase': ', '
        }));
        list[list.length - 1].joinphrase = '; ';
        return list.concat(_setReleasePerformers());
    }

    let date = $('ul.album-type li:contains("Release Date:") span').text().trim().split(' ');
    if (date.length == 1) {
        date = ['', '', date[0]];
    }
    const label = $('ul.album-type li:contains("Label:") span').text().trim();
    const catno = $('ul.album-type li:contains("Catalogue No.:") span').text().trim();

    function _extract_track_data(node, parentWork) {
        const numberField = node.querySelector('div.number').textContent.trim();
        let title = node.querySelector('div.trackTitle').textContent.trim();
        if (parentWork && title.trim().startsWith('»')) {
            title = parentWork + ': ' + title.replace('»', '');
        }
        let artists = Array.prototype.map.call(
            node.querySelectorAll('div.list-artist a'),
            aNode => ({
                'credited_name': aNode.textContent,
                'artist_name': aNode.textContent,
                'artist_mbid': '',
                'joinphrase': ', '
            })
        );
        if (!artists.length) {
            artists = _setReleaseArtists();
        } else {
            artists[artists.length - 1].joinphrase = '';
        }

        return {
            'number': parseInt(numberField),
            'title': _clean(title),
            'duration': node.querySelector('div.time').textContent.trim(),
            'artist_credit': artists
        };
    }

    const discs = [];
    const discNodes = document.querySelectorAll('div.playlist-list');

    let parentWork;
    discNodes.forEach(discNode => {
        let tracks = [];
        discNode.querySelectorAll('div.list-con').forEach((trackNode, idx) => {
            if (trackNode.classList.contains('cata-work-title')) {
                parentWork = trackNode.querySelector('div.production').textContent.trim();
            } else {
                tracks.push(_extract_track_data(trackNode, parentWork));
            }
        });

        discs.push({
            'title': '',
            'format': 'CD',
            'tracks': tracks
        });
    });

    return {
        'title': _setTitle(),
        'artist_credit': _setReleaseArtists(),
        'type': 'Album',
        'status': 'Official',
        'language': 'eng', // 'English',
        'script': 'Latn', // 'Latin',
        'packaging': '',
        'country': '',
        'year': date[2],
        'month': months[date[1]],
        'day': date[0],
        'labels': [{
            'name': label,
            'catno': catno
        }],
        // 'barcode': catno,
        'urls': [],
        'discs': discs
    };
}

// Insert links in page
function insertMBSection(release) {
    const mbUI = $('<div class="section musicbrainz"><h3>MusicBrainz</h3></div>');
    const mbContentBlock = $('<div class="section_content"></div>');
    mbUI.append(mbContentBlock);

    // Form parameters
    const parameters = MBImport.buildFormParameters(release, editNote);

    // Build form + search button
    const innerHTML = '<div id="mb_buttons">'
      + MBImport.buildFormHTML(parameters)
      + MBImport.buildSearchButton(release)
      + '</div>';
    mbContentBlock.append(innerHTML);

    document.querySelector('div.song-con').prepend(mbUI[0]);

    $('#mb_buttons').css({
      display: 'inline-block',
      width: '100%'
    });
    $('form.musicbrainz_import').css({width: '49%', display: 'inline-block'});
    $('form.musicbrainz_import_search').css({'float': 'right'})
    $('form.musicbrainz_import > button').css(
        {width: '100%', 'box-sizing': 'border-box'}
    );

    mbUI.slideDown();
}

try {
    const release = extract_release_data();
    // console.log(release);
    insertMBSection(release);
} catch (e) {
    console.log(e);
    throw e;
}
