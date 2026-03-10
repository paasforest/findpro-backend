require('dotenv').config();
const app = require('./src/app');
const { ensureAdminExists } = require('./src/utils/ensureAdmin');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`FindPro API running on port ${PORT}`);
  ensureAdminExists().catch((err) => console.error('Admin bootstrap:', err.message));
});
