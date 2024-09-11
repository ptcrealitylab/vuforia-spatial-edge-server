const https = require('https');

const proxyRequestHandler = (req, res) => {
    const input = req.params.proxyPath.join('/');
    if (!input.includes('://')) {
        const proxyURL = `https://spatial.ptc.io/${req.params[0]}`;
        const headers = req.headers;
        headers.Host = 'spatial.ptc.io';
        https.get(proxyURL, {headers}, proxyRes => {
            res.status(proxyRes.statusCode);
            for (let header in proxyRes.headers) {
                res.setHeader(header, proxyRes.headers[header]);
            }
            proxyRes.pipe(res);
        });
    } else {
        const proxyURL = req.params[0];
        const headers = req.headers;
        headers.Host = new URL(proxyURL).host;
        if (headers.host) {
            delete headers.host;
        }
        https.get(proxyURL, {headers}, proxyRes => {
            res.status(proxyRes.statusCode);
            for (let header in proxyRes.headers) {
                res.setHeader(header, proxyRes.headers[header]);
            }
            proxyRes.pipe(res);
        });
    }
};

module.exports = proxyRequestHandler;
