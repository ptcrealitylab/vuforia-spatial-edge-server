const https = require('https');

const toolboxEdgeProxyRequestHandler = (req, res) => {
    const proxyURL = `https://toolboxedge.net/${req.params[0]}`;
    const headers = req.headers;
    headers.Host = "toolboxedge.net";
    https.get(proxyURL, {headers}, proxyRes => {
        for (let header in proxyRes.headers) {
            res.setHeader(header, proxyRes.headers[header]);
        }
        proxyRes.pipe(res);
    });
};

module.exports = toolboxEdgeProxyRequestHandler;
