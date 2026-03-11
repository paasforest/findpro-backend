require('dotenv').config();
const app = require('./src/app');
const { ensureAdminExists } = require('./src/utils/ensureAdmin');
const { ensureUnclaimedUser } = require('./src/utils/ensureUnclaimed');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FindPro API running on port ${PORT}`);
  ensureAdminExists().catch((err) => console.error('Admin bootstrap:', err.message));
  ensureUnclaimedUser().catch((err) => console.error('Unclaimed user bootstrap:', err.message));
});
