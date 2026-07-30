const crypto = require('crypto');
const Session = require('../models/Session');

const SESSION_MS = Number(process.env.SESSION_TTL_HOURS || 24) * 60 * 60 * 1000;
const hash = value => crypto.createHash('sha256').update(value).digest('hex');

function cookieOptions(httpOnly = true) {
    return {
        httpOnly,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: SESSION_MS,
        path: '/',
    };
}

async function createSession(userId) {
    const token = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await Session.create({ tokenHash: hash(token), csrfHash: hash(csrfToken), userId, expiresAt });
    return { token, csrfToken, expiresAt };
}

function setSessionCookies(res, session) {
    res.cookie('garq_session', session.token, cookieOptions(true));
    res.cookie('XSRF-TOKEN', session.csrfToken, cookieOptions(false));
}

function clearSessionCookies(res) {
    const base = { secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
    res.clearCookie('garq_session', { ...base, httpOnly: true });
    res.clearCookie('XSRF-TOKEN', { ...base, httpOnly: false });
}

module.exports = { createSession, setSessionCookies, clearSessionCookies, hash };
