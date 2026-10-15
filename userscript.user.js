// ==UserScript==
// @name         Twitch - Pan & multiview
// @namespace    https://greasyfork.org/ja/users/941284-ぐらんぴ
// @version      2026-06-08
// @description  Adds Audio Panning and Multiview features to Twitch.
// @author       ぐらんぴ
// @match        https://www.twitch.tv/*
// @match        https://player.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        unsafeWindow
// @grant        GM.getValue
// @grant        GM.setValue
// @run-at       document-start
// @license      MIT
// ==/UserScript==
// ==========================================
// Utils
// ==========================================
let w = typeof unsafeWindow !== 'undefined' ? unsafeWindow : window, d = document;
let $S = s => document.querySelector(s), $SA = s => document.querySelectorAll(s);
let $C = (tag, props = {}, styles = {}) => {
    const s = document.createElement(tag)
    Object.assign(s, props)
    Object.assign(s.style, styles)
    return s
};
// ==========================================
// Drop Box
// ==========================================
function addBtn(){
    const parent = $S('.top-nav__prime');
    if (!parent) return;

    const trigger = $C('div', { className: 'grmp-trigger', title: 'drop here', role: 'button', tabIndex: 0 }, {
        cursor: 'pointer',padding: '6px',background: 'transparent',color: 'inherit',borderRadius: '6px',display: 'inline-flex',
        alignItems: 'center',justifyContent: 'center',marginRight: '8px',userSelect: 'none',position: 'relative',
    });

    const svg = '<svg class="grmp-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block"><path d="M12 5v10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 12l-7-7-7 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 19h14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    trigger.innerHTML = svg;

    parent.before(trigger);

    const style = $C('style', { className: 'grmp-style' }, {});
    style.textContent = `
.grmp-trigger:focus { outline: none; box-shadow: 0 0 0 3px rgba(0,120,212,0.12); border-radius:6px; }
.grmp-dropbox { position: absolute; left: 50%; transform: translateX(-50%); top: calc(100% + 10px); width: 360px; max-height: 420px; overflow: auto; border-radius: 10px; padding: 12px; box-sizing: border-box; background: #fff; color: #111; box-shadow: 0 8px 30px rgba(0,0,0,0.12); border: 1px solid rgba(0,0,0,0.06); transition: opacity 180ms ease, transform 180ms ease; opacity: 0; pointer-events: none; z-index: 99999; }
.grmp-dropbox.grmp-open { opacity: 1; pointer-events: auto; transform: translateX(-50%) translateY(0); }
.grmp-dropbox .grmp-hint { font-size: 13px; color: #666; margin-bottom: 8px; }
.grmp-dropbox .grmp-input-row { display:flex; gap:1px; margin-bottom:8px; position:relative; }
.grmp-input { flex:1; padding:8px 10px; border-radius:8px; border:1px solid rgba(0,0,0,0.08); font-size:13px; }
.grmp-input.invalid { border-color: #e55353; box-shadow: 0 0 0 3px rgba(229,83,83,0.08); }
.grmp-add { padding:8px 10px; border-radius:8px; border:1px solid rgba(0,0,0,0.08); background:#f5f5f5; cursor:pointer; }
.grmp-dropbox .grmp-list { display:flex; flex-direction:column; gap:8px; }
.grmp-row { display:flex; gap:8px; align-items:center; position:relative; justify-content:space-between; }
.grmp-meta { display:flex; flex-direction:column; overflow:hidden; flex:1 1 auto; margin-right:12px; }
.grmp-action-wrap { display:flex; align-items:center; gap:8px; flex:0 0 auto; }
.grmp-trash { margin-left:6px; cursor:pointer; user-select:none; font-size:16px; background:transparent; border:none; padding:4px; border-radius:6px; }
.grmp-trash:hover { background: rgba(0,0,0,0.04); }
.grmp-link { color:#0366d6; text-decoration:none; font-size:13px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px; pointer-events:none; }
.grmp-empty { font-size:13px; color:#999; padding:12px 6px; text-align:center; }
.grmp-dropbox.grmp-dragover { border: 2px dashed #2b8cff; background: linear-gradient(180deg,#f7fbff,#fff); }
.grmp-close { position:absolute; top:8px; right:8px; width:28px; height:28px; display:inline-flex; align-items:center; justify-content:center; border-radius:6px; cursor:pointer; color:#666; background:transparent; border:none; }
.grmp-close:hover { background: rgba(0,0,0,0.04); color:#111; }
.grmp-input-row .grmp-view { margin-left: 4px; }
`;
    d.head.appendChild(style);

    function createDropBox() {
        let existing = trigger.querySelector('.grmp-dropbox');
        if (existing) return existing;
        const box = $C('div', { className: 'grmp-dropbox' }, { });
        const closeBtn = $C('button', { className: 'grmp-close', title: 'Close', type: 'button' }, {});
        closeBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        closeBtn.addEventListener('click', e => {
            e.stopPropagation();
            box.classList.remove('grmp-open');
            d.removeEventListener('click', outsideClick);
            d.removeEventListener('keydown', onKeyDown);
        });

        const hint = $C('div', { className: 'grmp-hint', innerText: 'Drop Cards here' }, {});
        const inputRow = $C('div', { className: 'grmp-input-row' }, {});
        const input = $C('input', { className: 'grmp-input', placeholder: 'https://www.twitch.tv/[channelName]' }, {});
        const addBtn = $C('button', { className: 'grmp-add', type: 'button', innerText: 'Add' }, {});
        inputRow.appendChild(input); inputRow.appendChild(addBtn);

        // view button placed to the right of add button, sharing .grmp-add style
        const viewBtn = $C('button', { className: 'grmp-add grmp-view', type: 'button', innerText: 'View' }, {});
        inputRow.appendChild(viewBtn);

        const list = $C('div', { className: 'grmp-list' }, {});
        const empty = $C('div', { className: 'grmp-empty', innerText: 'Nothing yet' }, {});
        list.appendChild(empty);

        box.appendChild(closeBtn); box.appendChild(hint); box.appendChild(inputRow); box.appendChild(list);

        // auto-fill when first key is 'h' or 'H'
        input.addEventListener('keydown', function (ev) {
            if ((ev.key === 'h' || ev.key === 'H') && this.value.length === 0) {
                ev.preventDefault();
                this.value = 'https://www.twitch.tv/';
                setTimeout(() => {
                    this.setSelectionRange(this.value.length, this.value.length);
                }, 0);
                return;
            }
            if (ev.key === 'Enter') {
                ev.preventDefault();
                ev.stopPropagation();
                const btn = inputRow.querySelector('.grmp-add');
                if (btn && typeof btn.click === 'function') {
                    // temporarily suspend outsideClick to avoid closing
                    d.removeEventListener('click', outsideClick);
                    try {
                        btn.click();
                    } finally {
                        setTimeout(() => d.addEventListener('click', outsideClick), 0);
                    }
                }
            }
        });

        addBtn.addEventListener('click', async (ev) => {
            ev.stopPropagation();
            const v = (input.value || '').trim();
            if (!v) return;
            if (!v.startsWith('https://www.twitch.tv/')) {
                flashInvalid(input);
                return;
            }
            await addUrlToList(v, list);
            input.value = '';
        });

        // view button focuses input and does not close dropbox
        viewBtn.addEventListener('click', (ev) => {
            ev.stopPropagation();
            multiView()
            box.classList.remove('grmp-open');
        });
        viewBtn.addEventListener('mousedown', ev => ev.preventDefault());

        box.addEventListener('dragover', e => {
            e.preventDefault();
            e.stopPropagation();
            box.classList.add('grmp-dragover');
        });

        box.addEventListener('dragleave', e => {
            e.preventDefault();
            e.stopPropagation();
            box.classList.remove('grmp-dragover');
        });

        box.addEventListener('drop', async e => {
            e.preventDefault();
            e.stopPropagation();
            box.classList.remove('grmp-dragover');
            const listEl = box.querySelector('.grmp-list') || ensureList(box);
            await handleDrop(e, listEl);
        });

        trigger.appendChild(box);
        positionDropbox(box);
        return box;
    }

    function ensureList(box) {
        let list = box.querySelector('.grmp-list');
        if (!list) {
            list = $C('div', { className: 'grmp-list' }, {});
            const empty = $C('div', { className: 'grmp-empty', innerText: 'Nothing yet' }, {});
            list.appendChild(empty);
            box.appendChild(list);
        }
        return list;
    }

    function flashInvalid(inputEl) {
        inputEl.classList.add('invalid');
        setTimeout(() => inputEl.classList.remove('invalid'), 900);
    }

    function openDropbox() {
        const box = createDropBox();
        box.classList.add('grmp-open');
        d.addEventListener('click', outsideClick);
        d.addEventListener('keydown', onKeyDown);
    }

    function closeDropbox() {
        const box = trigger.querySelector('.grmp-dropbox');
        if (!box) return;
        box.classList.remove('grmp-open');
        d.removeEventListener('click', outsideClick);
        d.removeEventListener('keydown', onKeyDown);
    }

    function outsideClick(e) {
        const box = trigger.querySelector('.grmp-dropbox');
        if (!box) return;
        if (box.contains(e.target)) return;
        closeDropbox();
    }

    function onKeyDown(e) {
        if (e.key === 'Escape') closeDropbox();
    }

    function positionDropbox(box) {
        const rect = trigger.getBoundingClientRect();
        const docEl = d.documentElement;
        const left = rect.left + rect.width / 2;
        box.style.left = `${left}px`;
        const maxRight = docEl.clientWidth - 12;
        const boxRect = box.getBoundingClientRect();
        if (boxRect.right > maxRight) {
            const overflow = boxRect.right - maxRight;
            box.style.transform = `translateX(calc(-50% - ${overflow}px))`;
        } else {
            box.style.transform = 'translateX(-50%)';
        }
    }

    async function addUrlToList(value, list) {
        const empty = list.querySelector('.grmp-empty');
        if (empty) empty.remove();
        const row = buildRow(value, list);
        list.appendChild(row);
    }

    async function handleDrop(e, list) {
        try {
            const dt = e.dataTransfer;
            if (!dt) return;
            const seen = new Set();
            const empty = list.querySelector('.grmp-empty');
            if (empty) empty.remove();

            if (dt.files && dt.files.length) {
                for (let i = 0; i < dt.files.length; i++) {
                    try {
                        const file = dt.files[i];
                        const key = file.name + '|' + file.size + '|' + file.type;
                        if (seen.has(key)) continue;
                        seen.add(key);
                        if (file.type && file.type.startsWith('image/')) {
                            const row = buildRow(file.name || 'image', list);
                            list.appendChild(row);
                        } else {
                            const row = buildRow(file.name || file.type || 'file', list);
                            list.appendChild(row);
                        }
                    } catch (innerErr) {
                        console.error('handleDrop file item error', innerErr);
                        continue;
                    }
                }
                return;
            }

            if (dt.items && dt.items.length) {
                for (let i = 0; i < dt.items.length; i++) {
                    const item = dt.items[i];
                    try {
                        if (item.kind === 'file') {
                            const file = item.getAsFile();
                            if (!file) continue;
                            const key = file.name + '|' + file.size + '|' + file.type;
                            if (seen.has(key)) continue;
                            seen.add(key);
                            if (file.type && file.type.startsWith('image/')) {
                                const row = buildRow(file.name || 'image', list);
                                list.appendChild(row);
                            } else {
                                const row = buildRow(file.name || 'file', list);
                                list.appendChild(row);
                            }
                        } else if (item.kind === 'string') {
                            await new Promise(resolve => {
                                try {
                                    item.getAsString(async str => {
                                        try {
                                            const trimmed = (str || '').trim();
                                            const imgSrc = extractImageSrcFromHtml(trimmed);
                                            const urlCandidate = imgSrc || (trimmed.split('\n')[0] || trimmed);
                                            const key = urlCandidate;
                                            if (!key || seen.has(key)) { resolve(); return; }
                                            if (imgSrc) {
                                                seen.add(key);
                                                const row = buildRow(imgSrc, list);
                                                list.appendChild(row);
                                            } else if (isValidUrl(urlCandidate)) {
                                                if (urlCandidate.startsWith('https://www.twitch.tv/')) {
                                                    seen.add(key);
                                                    const row = buildRow(urlCandidate, list);
                                                    list.appendChild(row);
                                                } else {
                                                    seen.add(key);
                                                    const row = buildRow(urlCandidate, list);
                                                    list.appendChild(row);
                                                }
                                            } else if (trimmed) {
                                                const twitch = findTwitchInText(trimmed);
                                                if (twitch && !seen.has(twitch)) {
                                                    seen.add(twitch);
                                                    const row = buildRow(twitch, list);
                                                    list.appendChild(row);
                                                } else if (!isValidUrl(trimmed) && !seen.has(trimmed)) {
                                                    seen.add(trimmed);
                                                    const row = buildRow(trimmed, list);
                                                    list.appendChild(row);
                                                }
                                            }
                                        } catch (innerStrErr) {
                                            console.error('handleDrop string item processing error', innerStrErr);
                                        } finally {
                                            resolve();
                                        }
                                    });
                                } catch (getAsStringErr) {
                                    console.error('handleDrop getAsString error', getAsStringErr);
                                    resolve();
                                }
                            });
                        }
                    } catch (innerErr) {
                        console.error('handleDrop dt.items loop error', innerErr);
                        continue;
                    }
                }
                return;
            }

            const text = dt.getData('text/plain') || dt.getData('text/uri-list') || dt.getData('text');
            if (text) {
                try {
                    const url = text.trim();
                    const imgSrc = extractImageSrcFromHtml(url);
                    const key = imgSrc || url;
                    if (key && !seen.has(key)) {
                        if (imgSrc) {
                            seen.add(key);
                            const row = buildRow(imgSrc, list);
                            list.appendChild(row);
                        } else if (isValidUrl(url)) {
                            seen.add(key);
                            const row = buildRow(url, list);
                            list.appendChild(row);
                        } else {
                            const twitch = findTwitchInText(url);
                            if (twitch && !seen.has(twitch)) {
                                seen.add(twitch);
                                const row = buildRow(twitch, list);
                                list.appendChild(row);
                            } else if (!seen.has(url)) {
                                seen.add(url);
                                const row = buildRow(url, list);
                                list.appendChild(row);
                            }
                        }
                    }
                } catch (textErr) {
                    console.error('handleDrop text fallback error', textErr);
                }
            }
        } catch (err) {
            console.error('handleDrop unexpected error', err);
        }
    }


    function findTwitchInText(s) {
        const m = s.match(/https?:\/\/www\.twitch\.tv\/[^\s'"]+/i);
        return m ? m[0] : null;
    }

    function extractImageSrcFromHtml(html) {
        const m = html.match(/<img[^>]+src=["']?([^"'>\s]+)/i);
        return m ? m[1] : null;
    }

    function isValidUrl(s) {
        try {
            new URL(s);
            return true;
        } catch (e) {
            return false;
        }
    }

    function buildRow(text, list) {
        const row = $C('div', { className: 'grmp-row' }, {});
        const meta = $C('div', { className: 'grmp-meta' }, {});
        const link = $C('a', { className: 'grmp-link', href: '#', innerText: text }, {});
        link.setAttribute('draggable', 'false');
        meta.appendChild(link);

        const action = $C('div', { className: 'grmp-action-wrap' }, {});
        const trash = $C('button', { className: 'grmp-trash', title: 'Remove this item', type: 'button' }, {});
        trash.innerText = '🗑️';
        trash.setAttribute('draggable', 'false');
        trash.addEventListener('mousedown', ev => ev.preventDefault());
        trash.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const listEl = ev.target.closest('.grmp-row');
            if (listEl) listEl.remove();
        });

        action.appendChild(trash);

        row.appendChild(meta);
        row.appendChild(action);
        return row;
    }

    trigger.addEventListener('dragover', e => {
        e.preventDefault();
        e.stopPropagation();
        const box = createDropBox();
        box.classList.add('grmp-open');
        box.classList.add('grmp-dragover');
        d.addEventListener('click', outsideClick);
        d.addEventListener('keydown', onKeyDown);
    });

    trigger.addEventListener('dragleave', e => {
        e.preventDefault();
        e.stopPropagation();
        const box = trigger.querySelector('.grmp-dropbox');
        if (box) box.classList.remove('grmp-dragover');
    });

    trigger.addEventListener('drop', async e => {
        e.preventDefault();
        e.stopPropagation();
        const box = createDropBox();
        box.classList.remove('grmp-dragover');
        const list = box.querySelector('.grmp-list') || ensureList(box);
        await handleDrop(e, list);
    });

    trigger.addEventListener('click', e => {
        if (e.target.closest('.grmp-dropbox')) return;
        e.stopPropagation();
        const box = trigger.querySelector('.grmp-dropbox');
        if (box && box.classList.contains('grmp-open')) {
            closeDropbox();
        } else {
            openDropbox();
        }
    });

    trigger.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            const box = trigger.querySelector('.grmp-dropbox');
            if (box && box.classList.contains('grmp-open')) closeDropbox();
            else openDropbox();
        }
    });

    w.addEventListener('resize', () => {
        const box = trigger.querySelector('.grmp-dropbox');
        if (box) positionDropbox(box);
    });

    createDropBox();
}
w.onload = () => { addBtn(); }

// ==========================================
// Multi View
// ==========================================

async function multiView() {
    const main = $S('main');
    if (!main) return false;

    const existing = $S('.grmp-multiview');
    if (existing) existing.remove();

    const links = Array.from($SA('.grmp-link'))
    .map(a => (a.innerText || '').trim())
    .filter(Boolean);

    if (!links.length) return false;

    let splitCount = Math.max(1, Math.floor(Number(await GM.getValue('grmp-mv-split-count', 2)) || 2));

    const rect = main.getBoundingClientRect();

    const container = $C('div', { className: 'grmp-multiview' }, {
        position: 'absolute',
        left: (rect.left + window.scrollX) + 'px',
        width: rect.width + 'px',
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        zIndex: 99,
        pointerEvents: 'auto',
        background: 'transparent',
        boxSizing: 'border-box',
        gap: '0'
    });

    const header = $C('div', { className: 'grmp-mv-header' }, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        boxSizing: 'border-box',
        padding: '6px 8px',
        background: 'rgba(0,0,0,0.6)',
        color: '#fff',
        borderRadius: '6px',
        gap: '8px'
    });

    const title = $C('div', { innerText: 'Multi View' }, {
        fontSize: '14px',
        fontWeight: '600',
        whiteSpace: 'nowrap'
    });

    const settings = $C('div', {}, {
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
    });

    const splitInput = $C('input', {
        type: 'number',
        min: '1',
        max: '20',
        step: '1',
        value: String(splitCount),
        title: '分割数'
    }, {
        width: '55px',
        padding: '5px',
        boxSizing: 'border-box',
        border: '1px solid #aaa',
        borderRadius: '5px'
    });

    const saveBtn = $C('button', {
        type: 'button',
        innerText: 'Save'
    }, {
        background: '#fff',
        color: '#111',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 8px',
        cursor: 'pointer',
        fontSize: '13px'
    });

    const closeBtn = $C('button', {
        className: 'grmp-mv-close',
        type: 'button',
        title: 'Close',
        innerText: 'Close'
    }, {
        background: '#fff',
        color: '#111',
        border: 'none',
        borderRadius: '6px',
        padding: '6px 8px',
        cursor: 'pointer',
        fontSize: '13px'
    });

    settings.appendChild(splitInput);
    settings.appendChild(saveBtn);
    header.appendChild(title);
    header.appendChild(settings);
    header.appendChild(closeBtn);

    main.before(container);
    container.appendChild(header);

    function getPanValue(index) {
        if (splitCount !== 2) return 0;
        if (index === 0) return -100;
        if (index === 1) return 100;
        return 0;
    }

    function resizeItems(updatePan = false) {
        const r = main.getBoundingClientRect();

        container.style.left = (r.left + window.scrollX) + 'px';

        const newMainWidth = Math.max(
            1,
            Math.floor(r.width || main.clientWidth || window.innerWidth)
        );

        const newIframeWidth = Math.floor(newMainWidth / splitCount);
        const newIframeHeight = Math.floor(newIframeWidth * 9 / 16);

        Array.from(container.querySelectorAll('.grmp-mv-item')).forEach((item, index) => {
            item.style.width = newIframeWidth + 'px';
            item.style.height = newIframeHeight + 'px';

            const iframe = item.querySelector('iframe');
            if (!iframe) return;

            iframe.width = String(newIframeWidth);
            iframe.height = String(newIframeHeight);

            if (updatePan) {
                const url = new URL(iframe.src);
                url.searchParams.set('grmpPan', String(getPanValue(index)));
                iframe.src = url.href;
            }
        });
    }

    links.forEach((raw, index) => {
        try {
            const cleaned = raw.split('?')[0].split('#')[0].trim();
            const lastSlash = cleaned.lastIndexOf('/');
            if (lastSlash === -1) return;

            const channelName = cleaned.slice(lastSlash + 1);
            if (!channelName) return;

            const mainWidth = Math.max(
                1,
                Math.floor(rect.width || main.clientWidth || window.innerWidth)
            );

            const iframeWidth = Math.floor(mainWidth / splitCount);
            const iframeHeight = Math.floor(iframeWidth * 9 / 16);

            const wrapper = $C('div', { className: 'grmp-mv-item' }, {
                width: iframeWidth + 'px',
                height: iframeHeight + 'px',
                boxSizing: 'border-box',
                overflow: 'hidden',
                background: '#000',
                margin: '0'
            });

            const iframeUrl = new URL('https://player.twitch.tv/');
            iframeUrl.searchParams.set('channel', channelName);
            iframeUrl.searchParams.set('parent', location.hostname);
            iframeUrl.searchParams.set('grmpPan', String(getPanValue(index)));

            const iframe = $C('iframe', {
                src: iframeUrl.href,
                frameborder: '0',
                allowfullscreen: 'true',
                scrolling: 'no',
                width: String(iframeWidth),
                height: String(iframeHeight)
            }, {
                width: '100%',
                height: '100%',
                border: '0',
                display: 'block'
            });

            wrapper.appendChild(iframe);
            container.appendChild(wrapper);
        } catch (e) {
        }
    });

    const reposition = () => resizeItems();

    const onResize = () => reposition();
    const onScroll = () => reposition();

    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll);

    saveBtn.addEventListener('click', async ev => {
        ev.stopPropagation();

        const value = Math.floor(Number(splitInput.value));

        if (!Number.isFinite(value) || value < 1 || value > 20) {
            splitInput.value = String(splitCount);
            return;
        }

        splitCount = value;
        splitInput.value = String(splitCount);

        await GM.setValue('grmp-mv-split-count', splitCount);

        resizeItems(true);
    });

    splitInput.addEventListener('keydown', ev => {
        ev.stopPropagation();
        if (ev.key === 'Enter') saveBtn.click();
    });

    [splitInput, saveBtn].forEach(el => {
        ['mousedown', 'click', 'pointerdown'].forEach(type => {
            el.addEventListener(type, ev => ev.stopPropagation());
        });
    });

    closeBtn.addEventListener('click', ev => {
        ev.stopPropagation();
        container.remove();
        window.removeEventListener('resize', onResize);
        window.removeEventListener('scroll', onScroll);
    });

    resizeItems();
    return true;
}
// ==========================================
// Pan
// ==========================================
function pan() {
    const container = $S('.player-controls__left-control-group')
    if (!container) return;

    // avoid adding multiple controls
    if (container.querySelector('.grmp-pan-wrap')) return;
    // inject slider styles (only once)
    if (!$S('.grmp-pan-style')) {
        const st = $C('style', { className: 'grmp-pan-style' }, {});
        st.textContent = `
.grmp-pan-range {
  -webkit-appearance: none;
  appearance: none;
  background: rgba(255,255,255,0.25);
  height: 20px;
  margin: 0 6px;
  cursor: pointer;
  opacity: 0.95;
}

/* WebKit track (slightly darker, thin) */
.grmp-pan-range::-webkit-slider-runnable-track {
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 6px;
  border: none;
}

/* WebKit thumb (small, white with subtle shadow) */
.grmp-pan-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  margin-top: -6px; /* center thumb on track */
  box-shadow: 0 1px 2px rgba(0,0,0,0.25);
  border: 1px solid rgba(0,0,0,0.12);
}

/* Firefox track (slightly darker) */
.grmp-pan-range::-moz-range-track {
  height: 4px;
  background: rgba(255,255,255,0.25);
  border-radius: 6px;
  border: none;
}

/* Firefox thumb (white with subtle shadow) */
.grmp-pan-range::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  border: 1px solid rgba(0,0,0,0.12);
  box-shadow: 0 1px 2px rgba(0,0,0,0.25);
}

/* Remove focus outline but keep accessible focus ring via box-shadow on focus-visible */
.grmp-pan-range:focus {
  outline: none;
}
.grmp-pan-range:focus-visible::-webkit-slider-thumb {
  box-shadow: 0 0 0 4px rgba(0,120,212,0.12);
}
.grmp-pan-range:focus-visible::-moz-range-thumb {
  box-shadow: 0 0 0 4px rgba(0,120,212,0.12);
}
`;
        d.head.appendChild(st);
    }

    const wrap = $C('div', { className: 'grmp-pan-wrap' }, {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        marginLeft: '8px'
    });

    // Left label "L"
    const labelLeft = $C('label', { className: 'grmp-pan-label', innerText: 'L' }, {
        fontSize: '13px',
        color: 'inherit',
        userSelect: 'none'
    });

    const initialPan = new URLSearchParams(location.search).get('grmpPan');
    const range = $C('input', {
        className: 'grmp-pan-range',
        type: 'range',
        min: '-100',
        max: '100',
        value: initialPan === null ? '0' : String(
            Math.max(-100, Math.min(100, Number(initialPan) || 0))
        ),
    }, {
        width: '140px',
        height: '18px',
        background: 'transparent'
    });

    // Right label "R"
    const labelRight = $C('label', { className: 'grmp-pan-value', innerText: 'R' }, {
        minWidth: '30px',
        textAlign: 'center',
        fontSize: '13px',
        color: 'inherit',
        userSelect: 'none'
    });

    // prevent control interactions from closing dropbox or interfering with drag/drop
    ['mousedown','mouseup','click','pointerdown','pointerup'].forEach(ev => {
        wrap.addEventListener(ev, e => e.stopPropagation());
    });

    wrap.appendChild(labelLeft);
    wrap.appendChild(range);
    wrap.appendChild(labelRight);
    container.appendChild(wrap);

    // Map to keep audio nodes per media element
    const audioMap = new WeakMap();

    // helper: ensure audio graph for a media element
    function ensurePannerForMedia(mediaEl) {
        try {
            if (!mediaEl || !(mediaEl instanceof HTMLMediaElement)) return null;
            if (audioMap.has(mediaEl)) return audioMap.get(mediaEl);

            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;

            const ctx = new AudioCtx();
            if (ctx.state === 'suspended') {
                const resume = () => {
                    ctx.resume().catch(()=>{});
                    window.removeEventListener('pointerdown', resume);
                    window.removeEventListener('keydown', resume);
                };
                window.addEventListener('pointerdown', resume, { once: true });
                window.addEventListener('keydown', resume, { once: true });
            }

            const source = ctx.createMediaElementSource(mediaEl);
            const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
            if (panner) {
                source.connect(panner);
                panner.connect(ctx.destination);
            } else {
                source.connect(ctx.destination);
            }

            const entry = { ctx, source, panner, mediaEl };
            audioMap.set(mediaEl, entry);
            return entry;
        } catch (err) {
            return null;
        }
    }

    // set pan value (-1 .. 1) for a given media element if possible
    function setPanForMedia(mediaEl, panValue) {
        const entry = ensurePannerForMedia(mediaEl);
        if (!entry) return false;
        if (entry.panner && typeof entry.panner.pan !== 'undefined') {
            try {
                entry.panner.pan.value = panValue;
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    // find candidate media elements to apply pan to
    function findCandidateMediaElements() {
        const mv = $S('.grmp-multiview');
        let candidates = [];
        if (mv) {
            candidates = Array.from(mv.querySelectorAll('video, audio'));
        }
        if (!candidates.length) {
            candidates = Array.from(document.querySelectorAll('video, audio'));
        }
        candidates = candidates.filter(el => el.offsetParent !== null || el.getBoundingClientRect().width > 0 || el.getBoundingClientRect().height > 0);
        return candidates;
    }

    // apply to all found media elements
    async function applyPanToAll() {
        const raw = parseInt(range.value, 10) || 0;
        const panValue = Math.max(-1, Math.min(1, raw / 100));
        const candidates = findCandidateMediaElements();
        let applied = 0;
        for (const m of candidates) {
            try {
                const ok = setPanForMedia(m, panValue);
                if (ok) applied++;
            } catch (e) {
            }
        }
        return applied;
    }

    // live update while dragging: apply to visible players but do not close UI
    let liveTimeout = null;
    range.addEventListener('input', (ev) => {
        ev.stopPropagation();
        if (liveTimeout) clearTimeout(liveTimeout);
        liveTimeout = setTimeout(() => {
            applyPanToAll().catch(()=>{});
            liveTimeout = null;
        }, 120);
    });

    // initialize: apply default (0) so audio graph is created on first interaction

    applyPanToAll().catch(() => {});

    $SA('video, audio').forEach(mediaEl => {
        ['loadedmetadata', 'play'].forEach(eventName => {
            mediaEl.addEventListener(eventName, () => {
                const panValue = Math.max(
                    -1,
                    Math.min(1, (parseInt(range.value, 10) || 0) / 100)
                );

                const entry = ensurePannerForMedia(mediaEl);
                if (entry && entry.panner) {
                    entry.panner.pan.value = panValue;
                }
            });
        });
    });
}

const orig = Node.prototype.appendChild;
Node.prototype.appendChild = function(...args) {
    setTimeout(() => {
        const node = args[0];
        if (!node || node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('player-controls__left-control-group')) {
            pan();
        }
        if(node.classList && node.classList == "grmp-mv-item"){
            node.querySelector('iframe').addEventListener('load', () => {
                pan();
            });
        }
    }, 0);
    return orig.apply(this, args);
};
