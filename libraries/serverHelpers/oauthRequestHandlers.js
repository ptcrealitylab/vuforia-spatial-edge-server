const fetch = require('node-fetch');
const querystring = require('querystring');

const oauthRefreshRequestHandler = (req, res) => {
    const refreshUrl = req.params[0]; // TODO: get this from the tool somehow to prevent leaking secret to any supplied url
    const data = {
        'grant_type': 'refresh_token',
        'refresh_token': req.body.refresh_token,
        'client_id': req.body.client_id,
        'client_secret': req.body.client_secret,
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
    const acquireUrl = req.params[0]; // TODO: get this from the addon somehow to prevent leaking secret to any client-supplied url (e.g. via postman)
    const data = {
        'grant_type': 'authorization_code',
        'code': req.body.code,
        'redirect_uri': req.body.redirect_uri,
        'client_id': req.body.client_id,
        'client_secret': req.body.client_secret,
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
