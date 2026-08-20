import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const bridge = fs.readFileSync('admin/js/analytics-growth-ga4-config.js', 'utf8');

test('GA4 Data API 403 gets an exact Google Cloud recovery control', () => {
  assert.match(bridge, /dataApiConsoleUrl/);
  assert.match(bridge, /console\.cloud\.google\.com\/apis\/library\/\$\{DATA_SERVICE\}/);
  assert.match(bridge, /Enable Google Analytics Data API/);
  assert.match(bridge, /Reconnect Google Data/);
  assert.match(bridge, /Google Cloud project \$\{blockedProjectNumber\}/);
});

test('GA4 recovery does not fake a successful report', () => {
  assert.match(bridge, /status: 403/);
  assert.match(bridge, /status\.dataset\.state = "error"/);
  assert.match(bridge, /CCG GA4 property \$\{PROPERTY_ID\} is configured correctly/);
  assert.match(bridge, /Verify that exact project shows the Google Analytics Data API as Enabled/);
  assert.match(bridge, /allow Google's service activation to propagate and retry/);
});
