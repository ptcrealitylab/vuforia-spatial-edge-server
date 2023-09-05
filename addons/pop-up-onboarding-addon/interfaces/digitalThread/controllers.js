const fetch = require('node-fetch');

function searchController (req, res) {
    let promise =  new Promise(async (resolve, reject) => {
        try {
            const resp = await fetch(`${process.env.API_BASE_URL}/${process.env.SEARCH_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(req.body)
            });
            const text = await resp.text();
            if (resp.ok) {
                resolve({ contentType: resp.headers.get('Content-Type'), data: text });
            } else {
                reject(text);
            }
        } catch (err) {
            reject(err);
        }
    });
    promise.then(
        function(value) {
            res.json(value)
        },
        function(error) {
            res.status(500).send(error);
        }
    )
}

function autocompleteController(req, res) {
    let promise =  new Promise(async (resolve, reject) => {
        try {
            const resp = await fetch(`${process.env.API_BASE_URL}/${process.env.AUTOCOMPLETE_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
            });
            const text = await resp.text();
            if (resp.ok) {
                resolve({ contentType: resp.headers.get('Content-Type'), data: text });
            } else {
                reject(text);
            }
        } catch (err) {
            reject(err);
        }
    });
   promise.then(
        function(value) {
            res.json(value)
        },
        function(error) {
            res.status(500).send(error);
        }
    )
}

module.exports = {
    searchController,
    autocompleteController
}
