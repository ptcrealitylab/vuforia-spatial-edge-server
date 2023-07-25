const fetch = require('node-fetch');
const querystring = require('querystring');
const { getFrameSecrets } = require('../../server');

const oauthRefreshRequestHandler = (req, res) => {
    const frameName = req.body.frameName;
    const secrets = getFrameSecrets(frameName);
    const refreshUrl = secrets["refreshUrl"];
    const clientId = secrets["clientId"];
    const clientSecret = secrets["clientSecret"];
    const data = {
        'grant_type': 'refresh_token',
        'refresh_token': req.body.refresh_token,
        'client_id': clientId,
        'client_secret': clientSecret,
    };
    fetch(refreshUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify(data)
    }).then(response => {
        return response.json();
    }).then(data => {
        res.send(data);
    }).catch(error => {
        res.send(error);
    });
};

const oauthAcquireRequestHandler = (req, res) => {
    const frameName = req.body.frameName;
    const secrets = getFrameSecrets(frameName);
    const acquireUrl = secrets["acquireUrl"];
    const clientId = secrets["clientId"];
    const clientSecret = secrets["clientSecret"];
    const data = {
        'grant_type': 'authorization_code',
        'code': req.body.code,
        'redirect_uri': req.body.redirect_uri,
        'client_id': clientId,
        'client_secret': clientSecret,
    };
    fetch(acquireUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: querystring.stringify(data)
    }).then(response => {
        return response.json();
    }).then(data => {
        res.send(data);
    }).catch(error => {
        res.send(error);
    });
};

module.exports = {
    oauthRefreshRequestHandler,
    oauthAcquireRequestHandler
};
