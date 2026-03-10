const slugifyLib = require('slugify');

function slugify(text) {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    remove: /[*+~.()'"!:@]/g,
  });
}

module.exports = { slugify };
