/*!
 * pdf-paginate.js — measured pagination for the portfolio report PDF.
 *
 * Why this exists: html2pdf renders one long flow and slices it every 1123px,
 * so blocks get cut in half. `page-break-inside: avoid` cannot save a block
 * that is taller than what is left on the page, and it does nothing for an
 * orphaned section header. Instead we build explicit fixed-size <div class="page">
 * elements and distribute the content into them by *measuring the live DOM*,
 * so every block is either fully on a page or moved whole to the next one.
 *
 * See references/pdf-document.md §1 Page model and §2 Pagination engine.
 *
 * Usage:
 *   await BPPdfPaginate.ready(document);              // fonts + images first
 *   const r = BPPdfPaginate.run({
 *     flow:  document.getElementById('flow'),         // blocks in reading order
 *     mount: document.getElementById('doc'),          // receives the pages
 *     strings: { continues:'continúa', continued:'continuación' },
 *     chrome: (page, n, total, section) => {  }       // stamp header/footer
 *   });
 *   r.warnings  // [] when the document is clean — QA gate item 1
 *
 * Per-block contract (attributes on the direct children of `flow`):
 *   (none)                  atom — never split, moves whole
 *   data-flow="split"       container splittable at its children (cloned per page)
 *   data-flow="table"       table splittable at <tbody> rows (thead repeated)
 *   data-keep-with-next     binds to the following block (section headers)
 *   data-break="page"       force a new page before this block
 *   data-min-space="220"    only start here if >= N px remain
 *   data-page="bleed"       the block IS a full-bleed page (cover, openers)
 *   data-section="IV · …"   updates the running header from here on
 */
(function (global) {
  'use strict';

  var DEF = { width: 794, height: 1123, top: 58, right: 48, bottom: 65, left: 48 };

  /* ── readiness: measuring before fonts/images settle produces wrong pages ── */

  function ready(doc, timeoutMs) {
    doc = doc || document;
    var limit = timeoutMs == null ? 8000 : timeoutMs;
    var fonts = doc.fonts && doc.fonts.ready ? doc.fonts.ready : Promise.resolve();
    var imgs = [].slice.call(doc.images || []).map(function (img) {
      if (img.complete && img.naturalWidth) return Promise.resolve();
      if (img.decode) return img.decode().catch(function () {});
      return new Promise(function (res) { img.onload = img.onerror = res; });
    });
    var all = Promise.all([fonts].concat(imgs));
    return Promise.race([all, new Promise(function (res) { setTimeout(res, limit); })]);
  }

  /* ── pagination ─────────────────────────────────────────────────────────── */

  function run(opts) {
    opts = opts || {};
    var cfg = {}, k;
    for (k in DEF) cfg[k] = DEF[k];
    for (k in (opts.page || {})) cfg[k] = opts.page[k];

    var flow = opts.flow, mount = opts.mount;
    var STR = opts.strings || {};
    var contentH = cfg.height - cfg.top - cfg.bottom;
    var pages = [], warnings = [], body = null, curSection = '';

    function warn(msg, node) {
      warnings.push(msg);
      if (node && node.setAttribute) node.setAttribute('data-oversize', '1');
    }

    function newPage() {
      var p = document.createElement('div');
      p.className = 'page';
      p.setAttribute('data-section', curSection);
      var b = document.createElement('div');
      b.className = 'page-body';
      p.appendChild(b);
      mount.appendChild(p);
      pages.push(p);
      body = b;
      return b;
    }

    // Height actually consumed, margins included. `scrollHeight` drops the last
    // child's bottom margin in some engines, which is exactly the 5px that makes
    // a block look like it fits when it does not.
    function used() {
      var last = body.lastElementChild;
      if (!last) return 0;
      var mb = parseFloat(getComputedStyle(last).marginBottom) || 0;
      return last.getBoundingClientRect().bottom + mb - body.getBoundingClientRect().top;
    }
    function fits() { return used() <= contentH + 0.5; }

    // Section headers and their block travel together.
    function pullKeepWithNext() {
      var out = [];
      while (body.childElementCount > 1 && out.length < 2) {
        var last = body.lastElementChild;
        if (!last.hasAttribute('data-keep-with-next')) break;
        body.removeChild(last);
        out.unshift(last);
      }
      return out;
    }

    function tableOf(blk) {
      return blk.matches && blk.matches('table') ? blk : blk.querySelector && blk.querySelector('table');
    }

    function splitTable(blk) {
      var table = tableOf(blk);
      var tbody = table && table.tBodies[0];
      if (!tbody || tbody.rows.length < 4) return false;
      var isTable = blk === table;                       // a bare <table> can't hold the caption

      // The "continúa" caption must be in the DOM *before* measuring: adding it
      // afterwards is worth ~15px and pushes the page back into overflow.
      var tail = null;
      if (STR.continues && !isTable) { tail = note('tbl-cont', STR.continues); blk.appendChild(tail); }

      var moved = [];
      while (tbody.rows.length > 2 && !fits()) {
        var r = tbody.rows[tbody.rows.length - 1];
        tbody.removeChild(r);
        moved.unshift(r);
      }
      if (!fits() || !moved.length) {                    // even 2 rows don't fit here
        moved.forEach(function (row) { tbody.appendChild(row); });
        if (tail) blk.removeChild(tail);
        return false;
      }

      var cont = blk.cloneNode(true);
      if (tail) cont.removeChild(cont.querySelector('.tbl-cont'));
      var ctb = tableOf(cont).tBodies[0];
      while (ctb.rows.length) ctb.deleteRow(-1);
      moved.forEach(function (row) { ctb.appendChild(row); });

      // Anything after the table (a caption, a footnote) belongs to the LAST
      // chunk only — cloning it onto every chunk prints the same footnote twice.
      if (!isTable) {
        var afterOriginal = [], seen = false;
        [].slice.call(blk.children).forEach(function (kid) {
          if (kid === table || kid.contains(table)) { seen = true; return; }
          if (seen && kid !== tail) afterOriginal.push(kid);
        });
        afterOriginal.forEach(function (kid) { blk.removeChild(kid); });
      }
      cont.setAttribute('data-flow', 'table');
      cont.setAttribute('data-continued', '1');
      if (STR.continued && !isTable) cont.insertBefore(note('tbl-cont-head', STR.continued), cont.firstChild);

      newPage();
      place(cont);
      return true;
    }

    function note(cls, text) {
      var n = document.createElement('div');
      n.className = cls;
      n.textContent = text;
      return n;
    }

    function splitContainer(blk) {
      var kids = [].slice.call(blk.children);
      if (kids.length < 2) return false;
      kids.forEach(function (kid) { blk.removeChild(kid); });

      var cur = blk;
      for (var i = 0; i < kids.length; i++) {
        cur.appendChild(kids[i]);
        if (fits()) continue;

        if (cur.childElementCount > 1) {                 // close this chunk, continue on a new page
          cur.removeChild(kids[i]);
          cur = cur.cloneNode(false);
          cur.setAttribute('data-continued', '1');
          newPage();
          body.appendChild(cur);
          cur.appendChild(kids[i]);
          if (!fits()) warn('oversize child in ' + (blk.className || blk.tagName), kids[i]);
        } else if (body.childElementCount > 1) {         // alone but the page had content: retry fresh
          body.removeChild(cur);
          newPage();
          body.appendChild(cur);
          if (!fits()) warn('oversize child in ' + (blk.className || blk.tagName), kids[i]);
        } else {
          warn('oversize child in ' + (blk.className || blk.tagName), kids[i]);
        }
      }
      return true;
    }

    function place(blk) {
      var mode = blk.getAttribute('data-flow');
      var minSpace = parseFloat(blk.getAttribute('data-min-space')) || 0;

      if (body.childElementCount && minSpace && (contentH - used()) < minSpace) newPage();

      body.appendChild(blk);
      if (fits()) return;

      if (mode === 'table' && splitTable(blk)) return;
      if (mode === 'split' && splitContainer(blk)) return;

      if (body.childElementCount > 1) {                  // atom: move it (and its header) along
        body.removeChild(blk);
        var pulled = pullKeepWithNext();
        newPage();
        pulled.forEach(function (n) { body.appendChild(n); });
        body.appendChild(blk);
        if (fits()) return;
        if (mode === 'table' && splitTable(blk)) return;
        if (mode === 'split' && splitContainer(blk)) return;
      }
      warn('block taller than the content box (' + Math.round(used()) + 'px > ' + contentH + 'px): ' +
           (blk.className || blk.tagName), blk);
    }

    /* ── main loop ────────────────────────────────────────────────────────── */

    var blocks = [].slice.call(flow.children);
    newPage();

    blocks.forEach(function (blk) {
      if (blk.getAttribute('data-section')) {
        curSection = blk.getAttribute('data-section');
        if (body.childElementCount <= 1) pages[pages.length - 1].setAttribute('data-section', curSection);
      }

      if (blk.getAttribute('data-page') === 'bleed') {   // the block IS its own page
        if (!body.childElementCount) { mount.removeChild(pages.pop()); }
        blk.classList.add('page', 'bleed');
        mount.appendChild(blk);
        pages.push(blk);
        newPage();
        return;
      }

      if (blk.getAttribute('data-break') === 'page' && body.childElementCount) newPage();
      place(blk);
    });

    // Trailing empty page (a forced break or a bleed page at the very end).
    while (pages.length) {
      var last = pages[pages.length - 1];
      var lb = last.querySelector(':scope > .page-body');
      if (lb && !lb.childElementCount) { mount.removeChild(last); pages.pop(); } else break;
    }

    // QA gate item 1 — assert instead of eyeballing. Horizontal overflow matters
    // just as much: a grid track that refuses to shrink prints clipped at the
    // page edge and no amount of vertical pagination will reveal it.
    var contentW = cfg.width - cfg.left - cfg.right;
    pages.forEach(function (p) {
      var b = p.querySelector(':scope > .page-body');
      if (!b) return;
      var i = pages.indexOf(p) + 1;
      if (b.scrollHeight > contentH + 1) {
        warnings.push('page ' + i + ' overflows by ' + Math.round(b.scrollHeight - contentH) + 'px');
        p.setAttribute('data-overflow', '1');
      }
      [].slice.call(b.children).forEach(function (kid) {
        if (kid.scrollWidth > contentW + 1) {
          warnings.push('page ' + i + ': "' + (kid.className || kid.tagName) + '" is ' +
                        Math.round(kid.scrollWidth) + 'px wide (max ' + contentW + ')');
          kid.setAttribute('data-oversize', '1');
        }
      });
    });

    if (typeof opts.chrome === 'function') {
      pages.forEach(function (p, i) {
        opts.chrome(p, i + 1, pages.length, p.getAttribute('data-section') || '');
      });
    }

    if (flow.parentNode && opts.removeFlow !== false) flow.parentNode.removeChild(flow);

    return { pages: pages, warnings: warnings, contentHeight: contentH };
  }

  global.BPPdfPaginate = { ready: ready, run: run, defaults: DEF };
})(window);
