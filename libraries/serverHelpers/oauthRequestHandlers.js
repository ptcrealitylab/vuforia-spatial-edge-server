const fetch = require('node-fetch');
const querystring = require('querystring');
const { getFrameSecrets } = require('../../server');

const oauthRefreshRequestHandler = (req, res) => {
    const frameName = req.body.frameName;
    if (!frameName) {
        res.status(400).send({error: 'Missing frameName parameter'});
        return;
    }
    let secrets;
    try {
        secrets = getFrameSecrets(frameName);
    } catch (e) {
        res.status(400).send({error: `Invalid frameName "${frameName}"`});
        return;
    }
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
        if (response.status !== 200) {
            response.json().then(responseData => { // Data is an error object sent by the OAuth server
                res.status(response.status).send(responseData);
            }).catch(_error => {});
        } else {
            response.json().then(responseData => {
                res.send(responseData);
            }).catch(_error => {});
        }
    }).catch(error => {
        res.status(400).send(error);
    });
};

const oauthAcquireRequestHandler = (req, res) => {
    const frameName = req.body.frameName;
    if (!frameName) {
        res.status(400).send({error: 'Missing frameName parameter'});
        return;
    }
    let secrets;
    try {
        secrets = getFrameSecrets(frameName);
    } catch (e) {
        res.status(400).send({error: `Invalid frameName "${frameName}"`});
        return;
    }
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
        if (response.status !== 200) {
            response.json().then(responseData => { // Data is an error object sent by the OAuth server
                res.status(response.status).send(responseData);
            }).catch(_error => {});
        } else {
            response.json().then(responseData => {
                res.send(responseData);
            }).catch(_error => {});
        }
    }).catch(error => {
        res.status(400).send(error);
    });
};

module.exports = {
    oauthRefreshRequestHandler,
    oauthAcquireRequestHandler
};
