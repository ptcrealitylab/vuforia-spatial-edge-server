const { database } = require('./offlineDatabase.js')

function searchController (req, res) {
    console.log('searching offline');
    let searchResults = JSON.parse(JSON.stringify(database)); // array of results
    
    let machineName = null;
    let appName = null;
    if (req.body.machineName) {
        machineName = req.body.machineName.toLowerCase();
    }
    if (req.body.appName) {
        appName = req.body.appName.toLowerCase();
    }
    if (!appName || !machineName) {
        res.status(400).send('Client must specify a machineName and appName');
        return;
    }
    
    try {
        let matchingMachines = searchResults.filter(result => {
            return result.fullName.toLowerCase() === machineName;
        });
        let matchingApps = matchingMachines.map(machine => {
            return machine.applications;
        }).flat().filter(application => {
            return application.name.toLowerCase() === appName;
        });
        let matchingDocs = matchingApps.map(application => {
            return application.app_items;
        }).flat();

        res.status(200).json({
            app_items: matchingDocs
        });
    } catch (e) {
        res.status(500).send('Error searching the offline database');
    }
}

function autocompleteController(req, res) {
    console.log('autocomplete offline');
    let autocompleteResults = {data: JSON.parse(JSON.stringify(database))};
    console.log(autocompleteResults);
    
    let searchString = null;
    if (req.body.searchString) {
        searchString = req.body.searchString.toLowerCase();
    }
    
    if (searchString) {
        // filter down the autocomplete results
        autocompleteResults.data = autocompleteResults.data.filter(entry => {
            let fullNameMatch = entry.fullName && entry.fullName.toLowerCase().includes(searchString);
            let commonNameMatch = entry.commonName && entry.commonName.toLowerCase().includes(searchString);
            let applicationsMatch = entry.applications && entry.applications.some(app => {
                return app.name.toLowerCase().includes(searchString);
            });
            let filenamesMatch = entry.applications && entry.applications.some(app => {
                return app.app_items && app.app_items.some(item => {
                    return item.name.toLowerCase().includes(searchString);
                });
            });
            let serialNoMatch = entry.serialNo && entry.serialNo.toString().includes(searchString);

            return fullNameMatch || commonNameMatch || applicationsMatch || filenamesMatch || serialNoMatch;
        });
    }

    res.status(200).json(autocompleteResults);
}

module.exports = {
    searchController,
    autocompleteController
}
