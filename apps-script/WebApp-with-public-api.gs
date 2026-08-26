/**
 * RestBr Google Sheets bridge for the public GitHub Pages menu.
 *
 * Replace the current WebApp.gs content with this file, save, then create a
 * new Web App deployment (or update the existing deployment) and keep using
 * the /exec URL.
 */

function doGet(e) {
  if (e && e.parameter && e.parameter.api === 'menu') {
    return servePublicMenuApi_(e);
  }

  const template = HtmlService.createTemplateFromFile('Index');

  template.initialTableNumber =
    e && e.parameter && e.parameter.table
      ? cleanText_(e.parameter.table, 50)
      : '';

  return template
    .evaluate()
    .setTitle(APP_NAME)
    .setXFrameOptionsMode(
      HtmlService.XFrameOptionsMode.ALLOWALL
    )
    .addMetaTag(
      'viewport',
      'width=device-width, initial-scale=1, viewport-fit=cover'
    );
}


function include_(filename) {
  return HtmlService
    .createHtmlOutputFromFile(filename)
    .getContent();
}


function publicHealthCheck() {
  try {
    return {
      success: true,
      message: 'OK',
      data: {
        appName: APP_NAME,
        version: APP_VERSION,
        timestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    return {
      success: false,
      message: 'Health check failed.',
      data: null
    };
  }
}


/**
 * JSONP is intentional here: GitHub Pages is a different origin and Apps
 * Script ContentService does not let us reliably set arbitrary CORS headers.
 * A script tag can load this safely without exposing edit access to Sheets.
 */
function servePublicMenuApi_(e) {
  const callback = sanitizeJsonpCallback_(
    e && e.parameter
      ? e.parameter.callback
      : ''
  );

  const payload = getMenuData();

  const body =
    callback +
    '(' +
    JSON.stringify(payload) +
    ');';

  return ContentService
    .createTextOutput(body)
    .setMimeType(
      ContentService.MimeType.JAVASCRIPT
    );
}


function sanitizeJsonpCallback_(value) {
  const text = String(value || '').trim();

  if (
    /^[A-Za-z_$][A-Za-z0-9_$]{0,120}$/.test(text)
  ) {
    return text;
  }

  return '__restbrSheetsCallback';
}
