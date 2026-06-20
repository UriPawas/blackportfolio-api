// Adapter: expose a QRCode.toDataURL(text, opts, cb) API backed by the
// standalone qrcode-generator library (global `qrcode`). Lets the existing
// 2FA setup code render QR codes without depending on a runtime CDN.
(function () {
  if (typeof window.qrcode !== "function") return;
  window.QRCode = window.QRCode || {};
  window.QRCode.toDataURL = function (text, opts, cb) {
    if (typeof opts === "function") { cb = opts; opts = {}; }
    opts = opts || {};
    try {
      var qr = qrcode(0, "M"); // type 0 = auto-fit, error correction level M
      qr.addData(text);
      qr.make();
      var margin = opts.margin != null ? opts.margin : 4;
      // cellSize is fixed; the <img> is scaled to its CSS size (180px).
      var url = qr.createDataURL(6, margin);
      cb(null, url);
    } catch (e) {
      cb(e);
    }
  };
})();
