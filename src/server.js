require('dotenv').config();
const uuid = require('uuid/v4');
const initApp = require('./app')({uuid});

const PORT = process.env.PORT || 3000;
(async function main() {
    const app = await initApp();
    await app.setup();
    app.listen(PORT, () => {
        console.log(`Listening on port ${PORT}`);
    });
}());

