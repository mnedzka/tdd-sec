const validator = require('validator');
const estimatePasswordStrength = require('zxcvbn');

function validateCredentials({username, password}) {
    if (!validator.isEmail(String(username))) {
        return {error: "Username is invalid", hint: "Please use email address"};
    }
    const passwordStrength = estimatePasswordStrength(password);
    if (passwordStrength.score <= 1) {
        return {error: "Password too weak", hint: passwordStrength.feedback.suggestions.join(' ')};
    }
}

module.exports = validateCredentials;