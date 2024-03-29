const express = require('express');
const MongoClient = require('mongodb').MongoClient;
const hbs = require('hbs');
const path = require('path');
require('./output/sanitizeHtml')(hbs);
require('./output/encodeURL')(hbs);

const ENV = process.env.NODE_ENV || 'development';
const isProduction = ENV.toLowerCase() === 'production';
const COOKIE_OPTIONS = {secure: isProduction, httpOnly: true, sameSite: 'lax'};
const DB = process.env.MONGODB_URI || 'mongodb://localhost:27017/node-security';
const JWT_SECRET = process.env.JWT_SECRET || 'jwtsecret';

const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const isAuthenticated = require('./middleware/authentication')(JWT_SECRET);
const userSession = require('./middleware/session');
const limiter = require('./middleware/rateLimit');
const csrf = require('csurf')();
const checkCsrf = require('./middleware/checkCsrf')(csrf);
const helmet = require('helmet');
const enforceSsl = require('express-enforces-ssl');
const csp = require('./middleware/csp');

const home = require('./routes/home');
const addPost = require('./routes/addPost');
const login = require('./routes/login');
const logout = require('./routes/logout');
const register = require('./routes/register');
const github = require('./routes/github');
const notFound = require('./errors/404');
const serverError = require('./errors/500');


module.exports = async function initApp({uuid, githubOauth}) {
    const connection = await MongoClient.connect(DB, {
        bufferMaxEntries: 0, useNewUrlParser: true
    });
    const db = connection.db();
    const users = db.collection('users');
    const posts = db.collection('posts');
    const {session, store} = userSession(COOKIE_OPTIONS, DB);
    const {auth, callback} = github({githubOauth, uuid});

    const app = express();
    app.set("views", path.join(__dirname, "views"));
    app.set("view engine", "hbs");

    if(isProduction) {
        app.set("trust proxy", true);
        app.use(enforceSsl());
    }
    app.use(helmet());
    app.use(csp);
    app.use(session);
    app.use(cookieParser());
    app.use(bodyParser.urlencoded({extended: false}));
    app.use(bodyParser.json());
    app.use(express.static(__dirname + '/public'));

    const renderListPage = home(posts);

    app.get('/', csrf, (req, res) => renderListPage(null, req, res));
    app.get('/register', (req, res) => res.render('register'));
    app.post('/register', register(users));
    app.get('/login', (req, res) => res.render('login'));
    app.post('/login', limiter(), login({users, uuid, jwtSecret: JWT_SECRET, cookieOptions: COOKIE_OPTIONS}));
    app.get('/logout', logout);
    app.post('/post', isAuthenticated, checkCsrf, addPost({posts, renderListPage}));
    app.get('/auth', auth);
    app.get('/callback', callback);

    app.use(notFound);
    app.use(serverError);

    app.findUser = async (username) => {
        return await users.findOne({username});
    };

    app.setup = async () => {
        return await users.createIndex({username: 1}, {unique: true});
    };
    app.clean = async () => {
        await db.dropDatabase();
        return await app.setup();
    };
    app.close = async () => {
        await store.close();
        await connection.close();
    };

    return app;
};

