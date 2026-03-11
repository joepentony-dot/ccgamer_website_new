const fs = require('fs');

function applyTemplate(template, values) {
  return Object.entries(values).reduce((html, [key, value]) => {
    return html.replaceAll(`{{${key}}}`, value == null ? '' : String(value));
  }, template);
}

function readTemplate(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

module.exports = {
  applyTemplate,
  readTemplate
};
