const userErrorPage = require('../errors/userErrorPage');
const {CONFLICT, BAD_REQUEST} = require('../statusCodes');
const validateCredentials = require('../input/validateCredentials');
const debug = require('debug')('node-security');
const bcrypt = require('bcryptjs');
const HASHING_ROUNDS = Number(process.env.BCRYPT_ROUNDS) || 1;
const estimatePasswordStrength = require('zxcvbn');

const register = users => async (req, res) => {
    const {username, password} = req.body;

    const error = validateCredentials({username, password});
    if (error) return userErrorPage('register', res.status(BAD_REQUEST), error);

    const passwordStrength = estimatePasswordStrength(password);
    if (passwordStrength.score <= 1) {
        const error = {error: "Password too weak", hint: passwordStrength.feedback.suggestions.join(' ')};
        return userErrorPage('register', res.status(BAD_REQUEST), error);
    }

    try {
        const hashedPassword = await bcrypt.hash(password, HASHING_ROUNDS);
        await users.insertOne({username, password: hashedPassword});
    } catch(e) {
        debug(e);
        return userErrorPage('register', res.status(CONFLICT), {error: "User already exists"});
    }
    res.format({
        'text/html'() {
            res.redirect('/login');
        },
        'application/json'() {
            res.json('Registered');
        }
    });
};

module.exports = register;