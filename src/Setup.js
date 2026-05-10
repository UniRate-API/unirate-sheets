/**
 * Menu, sidebar, and Workspace add-on (Card) entry points for UniRate.
 *
 * Custom-function execution is in Code.js. This file is everything that
 * runs when the user opens the spreadsheet, picks the menu, or launches
 * the add-on from the Workspace side panel.
 */

/**
 * Editor add-on `onOpen` simple trigger.
 * Adds the UniRate menu when the spreadsheet is opened.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createAddonMenu()
    .addItem('Set API key…', 'showSidebar')
    .addItem('Test connection', 'testConnection')
    .addSeparator()
    .addItem('Clear API key', 'confirmClearKey')
    .addItem('Help / docs', 'openHelp')
    .addToUi();
}

/**
 * Editor add-on `onInstall` simple trigger.
 * Required so the menu is available immediately after install without
 * requiring a sheet reload.
 */
function onInstall(e) {
  onOpen(e);
}

/** Open the API-key sidebar from the menu. */
function showSidebar() {
  var html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('UniRate — API key')
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

/** Sidebar template helper to keep includes one-line. */
function include_(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

/**
 * Save the API key entered in the sidebar to document properties and run
 * a /api/currencies probe so the user gets immediate feedback.
 *
 * @param {string} key API key value.
 * @return {{ok: boolean, message: string, currencyCount: (number|undefined)}}
 */
function saveApiKey(key) {
  var trimmed = (key || '').trim();
  if (!trimmed) {
    return { ok: false, message: 'API key cannot be empty.' };
  }
  setApiKey_(trimmed);
  try {
    var currencies = fetchCurrencies_();
    return {
      ok: true,
      message: 'Connected. ' + currencies.length + ' currencies available.',
      currencyCount: currencies.length
    };
  } catch (e) {
    return { ok: false, message: stripPrefix_(e && e.message) };
  }
}

/** Sidebar "Test only" — probe /api/currencies with whatever's already stored. */
function testStoredKey() {
  var key = getApiKey_();
  if (!key) return { ok: false, message: 'No key set yet — paste one above and click Save & test.' };
  try {
    var currencies = fetchCurrencies_();
    return { ok: true, message: 'Connected. ' + currencies.length + ' currencies available.' };
  } catch (e) {
    return { ok: false, message: stripPrefix_(e && e.message) };
  }
}

/** Sidebar status check — does the doc already have a key? */
function getKeyStatus() {
  var key = getApiKey_();
  if (!key) return { hasKey: false };
  return {
    hasKey: true,
    masked: maskKey_(key)
  };
}

/** Wipe the document key from the sidebar. */
function deleteApiKey() {
  clearApiKey_();
  return { ok: true };
}

/** Confirm-before-clear from the menu (sidebar has its own button). */
function confirmClearKey() {
  var ui = SpreadsheetApp.getUi();
  var resp = ui.alert(
    'Clear UniRate API key?',
    'The key will be removed from this spreadsheet. You can re-enter it any time.',
    ui.ButtonSet.OK_CANCEL
  );
  if (resp === ui.Button.OK) {
    clearApiKey_();
    ui.alert('UniRate', 'API key cleared.', ui.ButtonSet.OK);
  }
}

/** Menu shortcut: probe /api/currencies and show a toast. */
function testConnection() {
  var key = getApiKey_();
  if (!key) {
    SpreadsheetApp.getUi().alert('UniRate', ERR_NO_KEY, SpreadsheetApp.getUi().ButtonSet.OK);
    return;
  }
  try {
    var currencies = fetchCurrencies_();
    SpreadsheetApp.getActive().toast(
      'UniRate connected — ' + currencies.length + ' currencies available.',
      'UniRate', 5
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('UniRate', stripPrefix_(e && e.message), SpreadsheetApp.getUi().ButtonSet.OK);
  }
}

/** Menu shortcut: open the README in a new tab. */
function openHelp() {
  var html = HtmlService.createHtmlOutput(
    '<script>window.open("https://github.com/UniRate-API/unirate-sheets#readme","_blank");google.script.host.close();</script>'
  ).setWidth(10).setHeight(10);
  SpreadsheetApp.getUi().showModalDialog(html, 'Opening UniRate help…');
}

/**
 * Workspace add-on Card entry point — used when the user opens UniRate
 * from the right-hand add-on rail.
 */
function onHomepage(e) {
  if (typeof CardService === 'undefined' || !CardService) return null;
  var hasKey = !!getApiKey_();
  var statusText = hasKey
    ? 'API key set for this spreadsheet.'
    : 'No API key set. Add one to start using =UNIRATE().';
  var card = CardService.newCardBuilder()
    .setHeader(CardService.newCardHeader()
      .setTitle('UniRate — Currency Rates')
      .setSubtitle(statusText)
      .setImageUrl('https://raw.githubusercontent.com/UniRate-API/unirate-sheets/main/marketplace/icon-128.png'));

  var section = CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText(
      'Use <b>=UNIRATE("USD","EUR")</b> in any cell to fetch a live rate. ' +
      'For historical data, pass a YYYY-MM-DD date as the fourth argument.'
    ))
    .addWidget(CardService.newTextButton()
      .setText(hasKey ? 'Replace API key' : 'Set API key')
      .setOnClickAction(CardService.newAction().setFunctionName('showSidebar')))
    .addWidget(CardService.newTextButton()
      .setText('Open docs')
      .setOpenLink(CardService.newOpenLink()
        .setUrl('https://github.com/UniRate-API/unirate-sheets#readme')));
  card.addSection(section);
  return card.build();
}

function maskKey_(key) {
  if (!key) return '';
  if (key.length <= 8) return '****';
  return key.slice(0, 4) + '…' + key.slice(-4);
}

function stripPrefix_(msg) {
  if (!msg) return 'Unknown error.';
  var s = String(msg);
  return s.indexOf('UniRate: ') === 0 ? s.slice('UniRate: '.length) : s;
}
