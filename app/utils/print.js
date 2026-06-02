(function (global) {
  'use strict';
  var XekhoApp = global.XekhoApp = global.XekhoApp || {};
  XekhoApp.utils = XekhoApp.utils || {};

  function buildStandaloneBillPrintHtml(printableMarkup) {
    return '<!DOCTYPE html>\n' +
      '<html lang="vi">\n' +
      '<head>\n' +
      '  <meta charset="UTF-8">\n' +
      '  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">\n' +
      '  <title>In bill</title>\n' +
      '  <style>\n' +
      '    @page { size: A4 portrait; margin: 12mm; }\n' +
      '    html, body {\n' +
      '      margin: 0;\n' +
      '      padding: 0;\n' +
      '      background: #fff;\n' +
      '      color: #000;\n' +
      '      font-family: "Times New Roman", Georgia, serif;\n' +
      '      font-size: 12pt;\n' +
      '    }\n' +
      '    body { padding: 0; }\n' +
      '    .bill-container {\n' +
      '      background: #fff;\n' +
      '      color: #000;\n' +
      '      padding: 0;\n' +
      '      border-radius: 0;\n' +
      '      font-family: "Times New Roman", Georgia, serif;\n' +
      '      font-size: 12pt;\n' +
      '      width: 100%;\n' +
      '      max-width: none;\n' +
      '      page-break-inside: avoid;\n' +
      '      -webkit-print-color-adjust: exact;\n' +
      '      print-color-adjust: exact;\n' +
      '    }\n' +
      '    .bill-header { text-align: center; margin-bottom: 16px; }\n' +
      '    .bill-logo { font-size: 24pt; font-weight: 900; color: #000; display: block; }\n' +
      '    .bill-sub { font-size: 11pt; color: #333; margin-top: 4px; line-height: 1.5; }\n' +
      '    .bill-divider { border: none; border-top: 1px solid #000; margin: 12px 0; }\n' +
      '    .bill-info { font-size: 11pt; margin-bottom: 10px; line-height: 1.6; }\n' +
      '    .bill-info span { font-weight: 700; }\n' +
      '    .bill-items { width: 100%; font-size: 11pt; border-collapse: collapse; }\n' +
      '    .bill-items th {\n' +
      '      text-align: left;\n' +
      '      border-bottom: 1px solid #000;\n' +
      '      padding: 7px 0;\n' +
      '      font-size: 10pt;\n' +
      '      color: #000;\n' +
      '    }\n' +
      '    .bill-items td { padding: 7px 0; vertical-align: top; color: #000; }\n' +
      '    .bill-items .amount { text-align: right; font-weight: 700; }\n' +
      '    .bill-total {\n' +
      '      display: flex;\n' +
      '      justify-content: space-between;\n' +
      '      font-size: 18pt;\n' +
      '      font-weight: 900;\n' +
      '      margin-top: 14px;\n' +
      '      border-top: 2px solid #000;\n' +
      '      padding-top: 12px;\n' +
      '      color: #000;\n' +
      '    }\n' +
      '    .bill-qr {\n' +
      '      text-align: center;\n' +
      '      margin-top: 16px;\n' +
      '      page-break-inside: avoid;\n' +
      '      background: #f9f9f9;\n' +
      '      border-radius: 12px;\n' +
      '      padding: 16px;\n' +
      '    }\n' +
      '    .bill-qr img {\n' +
      '      width: 220px;\n' +
      '      height: 220px;\n' +
      '      object-fit: contain;\n' +
      '      display: block;\n' +
      '      margin: 10px auto;\n' +
      '      -webkit-print-color-adjust: exact;\n' +
      '      print-color-adjust: exact;\n' +
      '    }\n' +
      '    .bill-qr-label, .bill-qr-bank { font-size: 11pt; color: #333; }\n' +
      '    .bill-qr-amount { font-size: 16pt; font-weight: 900; color: #E55A25; }\n' +
      '    .bill-thanks {\n' +
      '      text-align: center;\n' +
      '      font-size: 11pt;\n' +
      '      color: #333;\n' +
      '      margin-top: 12px;\n' +
      '      padding-bottom: 4px;\n' +
      '    }\n' +
      '    .bill-photo-page { margin-top: 12px; page-break-before: auto; }\n' +
      '    .bill-photo-page img { width: 100%; max-width: 100%; height: auto; display: block; }\n' +
      '  </style>\n' +
      '</head>\n' +
      '<body>\n' +
      '  ' + printableMarkup + '\n' +
      '  <script>\n' +
      '    window.addEventListener("load", function () {\n' +
      '      setTimeout(function () {\n' +
      '        try { window.focus(); } catch (e) {}\n' +
      '        try { window.print(); } catch (e) {}\n' +
      '      }, 250);\n' +
      '    });\n' +
      '    window.onafterprint = function () {\n' +
      '      setTimeout(function () {\n' +
      '        try { window.close(); } catch (e) {}\n' +
      '      }, 150);\n' +
      '    };\n' +
      '  </' + 'script>\n' +
      '</body>\n' +
      '</html>';
  }

  XekhoApp.utils.print = {
    buildStandaloneBillPrintHtml: buildStandaloneBillPrintHtml,
  };

  if (typeof global.buildStandaloneBillPrintHtml !== 'function') {
    global.buildStandaloneBillPrintHtml = buildStandaloneBillPrintHtml;
  }

})(typeof window !== 'undefined' ? window : globalThis);
