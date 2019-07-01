const bcrypt = require('bcryptjs');
const userErrorPage = require('../errors/userErrorPage');
const {UNAUTHORIZED, BAD_REQUEST} = require('../statusCodes');
const validateCredentials = require('../input/validateCredentials');
const jwt = require('jsonwebtoken');

const login = ({users, jwtSecret, cookieOptions}) => async (req, res) => {
    const {username, password} = req.body;

    const error = validateCredentials({username, password});
    if (error) return userErrorPage('login', res.status(BAD_REQUEST), error);

    const user = await users.findOne({username});

    if (user && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({username}, jwtSecret, {expiresIn: '1h'});
        res.cookie('jwt', token, {...cookieOptions, maxAge: 1 * 60 * 1000});

        req.session.regenerate(function(err) {
            req.session.user = {username: username.split('@')[0]};
            res.format({
                'text/html'() {
                    res.redirect('/');
                },
                'application/json'() {
                    res.json('Success');
                }
            });
        });
    } else {
        userErrorPage('login', res.status(UNAUTHORIZED), {error: 'Invalid credentials'});
    }
};

module.exports = login;