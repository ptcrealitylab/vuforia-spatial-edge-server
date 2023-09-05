/* copied from interfaces/digitalThread/public/interaction.js */

const machines = document.getElementById('machine-results');
const apps = document.getElementById('search-results');
const docs = document.getElementById('next-results');
const loading = spinner();
loading.parentElement.removeChild(loading);
let auto_results = [];
let selectedPath = {
    machine: null,
    application: null
}

//Search Route
function postResults(machineName, appName) {
    if (machineName) machineName = machineName.toLowerCase();
    if (appName) appName = appName.toLowerCase();
    if (appName === 'servicemax') {
        appName = "serviceMax"
    }
    docs.appendChild(loading)
    let postURL = `${getBaseURL()}/search`
    let params = {
        // "serialNo":924929,
        "machineName": machineName,
        "appName": appName
    }
    return fetch(postURL, {
        method: "POST",
        body: JSON.stringify(params),
        headers: {
            "Content-Type": "application/json"
        },
    }).then( async (res) => {
        try {
            let data = await res.json()
            console.log('postResults', data)
            docs.removeChild(loading)
            return data;
        } catch(err) {
            console.error(err);
        }
    })
}
//Autocomplete Route
function post_autocomplete() {
    machines.appendChild(loading);

    let searchString = '';
    if (document.getElementById('searchbar-input')) {
        searchString = document.getElementById('searchbar-input').value;
    }
    console.log('searchString = ' + searchString);

    let postURL = `${getBaseURL()}/autocomplete`;

    let postInfo = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        }
    };

    if (searchString && searchString.length > 0) {
        postInfo.body = JSON.stringify({
            searchString: searchString
        });
    }

    console.log('postInfo', postInfo);

    let res = fetch(postURL, postInfo).then(async (res) => {
        try {
            let query_results = await res.json()
            console.log('postAutocomplete', query_results)
            if (query_results.data.length > 0) {
                machines.removeChild(loading)
            } else {
                setTimeout(() => {
                    if (loading.parentElement) {
                        loading.parentElement.appendChild(noResultsDiv("No Results Found"));
                        loading.parentElement.removeChild(loading);
                    }
                    // machines.removeChild(loading)
                }, 100);
            }
            return query_results;
        } catch(err) {
            console.error(err);
        }
    })

    return res;
}

//Display machines associated with search query - autocomplete
async function showMachines() {
    const input = document.getElementById("searchbar-input");
    let query = input.value.toLowerCase();

    selectedPath.machine = null;
    selectedPath.application = null;

    auto_results = [];
    clearAll();

    if (query.length === 0) return;

    // } else {
        let query_results = await post_autocomplete();

        console.log(query_results);

        if (!query_results) return;
        
        while (machines.childElementCount > 0) {
            machines.removeChild(machines.firstChild);
        }
        
        if (query_results.data.length === 0) {
            machines.appendChild(loading);
        }

        query_results.data.forEach((machine) => {
            // if(machine.fullName.toLowerCase().includes(query[0])) {
            auto_results.push(machine)
            let item = addMachine(machine.fullName);
            machines.appendChild(item);
            // }
        });
        machines.classList.add("show");
        if (window.searchView) {
            window.searchView.addResultListeners(showDocuments);
        }
    // }

    // if (auto_results && query.length > 1) {
    //     auto_results.map((machine, idx) => {
    //         let item = document.getElementById(machine.fullName);
    //         if(!machine.fullName.toLowerCase().includes(query)) {
    //             auto_results.splice(idx, 1)
    //             return machines.removeChild(item);
    //         }
    //     })
    // }
}

//Append machine to search result list
function addMachine(searchResult) {
    const item = document.createElement("li");
    const title = document.createElement("h3");
    const img = document.createElement("img");
    const arrow = document.createElement("img");

    item.className = "result-row";
    title.className = "result-text";
    img.className = "logo";
    arrow.className = "arrow";

    item.setAttribute("id", `${searchResult}`);
    item.setAttribute("name", "machine")
    title.textContent =`${searchResult}`;
    img.src = `${getBaseURL()}/machine.png`;
    arrow.src = `${getBaseURL()}/arrow.png`;

    item.appendChild(img);
    item.appendChild(title);
    item.appendChild(arrow);

    item.addEventListener("click", showApps);

    return item;
}

//Display apps associated with search query
function showApps(evt) {
    document.getElementById('searchbar-input').focus();

    const machineDiv = evt.currentTarget;
    removeMachines();

    let id = machineDiv.id;
    let name = machineDiv.attributes.name.value;

    selectedPath.machine = id;

    while (apps.childElementCount > 0) {
        apps.removeChild(apps.firstChild);
    }

    let header = setHeader(id, name)
    apps.classList.add("show");

    apps.appendChild(header);

    let numResults = 0;

    auto_results.filter(machine => {
        return machine.fullName === id;
    }).forEach(machine => {
        console.log('adding apps for ' + machine.fullName);
        machine.applications.forEach((app) => {
            numResults++;
            let item = addApplication(app.name, machineDiv.id);
            return apps.appendChild(item);
        });
    });

    if (numResults === 0) {
        apps.appendChild(noResultsDiv("No Data Found"));
    }

    if (window.searchView) {
        window.searchView.addResultListeners(showDocuments);
    }
}

//No results text
function noResultsDiv(message) {
    const noResultsDiv = document.createElement("li");
    const title = document.createElement("h3");

    noResultsDiv.className = "spinner-div";
    // noResultsDiv.setAttribute("id", "no-results");
    title.className = "result-text";
    title.innerText = message;

    noResultsDiv.appendChild(title);
    return noResultsDiv;
}

//Append app to search results list
function addApplication(name) {
    const item = document.createElement("li");
    const title = document.createElement("h3");
    const img = document.createElement("img");
    const arrow = document.createElement("img");

    item.className = "result-row";
    title.className = "result-text";
    img.className = "logo";
    arrow.className = "arrow";

    item.setAttribute("id", `${name}`);
    item.setAttribute("name", "app")
    title.textContent =`${capitalizeName(name)}`;
    img.src = `${getBaseURL()}/logo-${name}.png`;
    arrow.src = `${getBaseURL()}/arrow.png`;

    item.appendChild(img);
    item.appendChild(title);
    item.appendChild(arrow);

    // item.addEventListener("click", showDocuments);

    return item;
}

window.selectedAppIconSrc = null;

//Display documents/files associated with application
async function showDocuments(evt) {
    document.getElementById('searchbar-input').focus();

    const el = evt.currentTarget;

    let img = el.querySelector('.logo');
    window.selectedAppIconSrc = img.src.replace('.png', '-white.png');
    console.log(window.selectedAppIconSrc);

    removeApps();

    while (apps.childElementCount > 0) {
        apps.removeChild(apps.firstChild);
    }

    while (docs.childElementCount > 0) {
        docs.removeChild(docs.firstChild);
    }

    let id = el.id;
    let name = el.attributes.name.value;
    let header = setHeader(id, name);

    selectedPath.application = id;

    docs.classList.add("show");
    docs.appendChild(header);
    
    // let appName = el.id.toLowerCase();
    // let machineSerialNo = '';

    let res = await postResults(selectedPath.machine, selectedPath.application);
    let app_docs;
    const OFFLINE_MODE = true;
    if (!OFFLINE_MODE) {
        app_docs = JSON.parse(res.data).flowResponse;
        handleOnlineResults(id, app_docs);
    } else {
        app_docs = res.app_items;
        handleOfflineResults(app_docs);
    }

    if (window.searchView) {
        window.searchView.addResultListeners(showDocuments);
    }
}

function sendFileData(data) {
    //delete console.log after data is being passed correctly
    console.log(data)
    return data;
}

function handleOfflineResults(app_docs) {
    app_docs.forEach(doc => {
        let displayName = doc.name;
        const HIDE_IMAGE_EXTENSIONS = true;
        if (HIDE_IMAGE_EXTENSIONS) {
            if (displayName.includes('.png') || displayName.includes('.jpg')) {
                displayName = displayName.split('.')[0];
            }
        }
        
        let moduleFile = addDocument(displayName);
        moduleFile.addEventListener("click", () => sendFileData(doc))
        moduleFile.setAttribute('fileData', JSON.stringify(doc));
        docs.appendChild(moduleFile);
    });
}

function handleOnlineResults(id, app_docs) {
    switch(id) {
    case "windchill":
        let moduleFile = addDocument(app_docs.moduleName);
        moduleFile.addEventListener("click", () => sendFileData(app_docs))
        moduleFile.setAttribute('fileData', JSON.stringify(app_docs));
        docs.appendChild(moduleFile);
        break;
    case "vuforia":
        app_docs[0].app_items.map((item) => {
            let file = addDocument(item.name);
            file.addEventListener("click", () => sendFileData(item))
            file.setAttribute('fileData', JSON.stringify(item));
            docs.appendChild(file);
        });
        break;
    case "thingworx":
        app_docs.map((item) => {
            let file = addDocument(item.name);
            file.addEventListener("click", () => sendFileData(item))
            file.setAttribute('fileData', JSON.stringify(item));
            docs.appendChild(file);
        });
        break;
    case "creo":
        app_docs[0].app_items.map((item) => {
            let file = addDocument(item.name);
            file.addEventListener("click", () => sendFileData(item))
            file.setAttribute('fileData', JSON.stringify(item));
            docs.appendChild(file);
        });
        break;
    case "serviceMax":
        let file = addDocument(app_docs.productInfo.Product_Name);
        file.addEventListener("click", () => sendFileData(app_docs))
        file.setAttribute('fileData', JSON.stringify(app_docs));
        docs.appendChild(file);
        break;
    default:
        let msg = addDocument("No Files Available")
        docs.appendChild(msg);
    }
}

//Set Header for document list
function setHeader(header_id, header_name) {
    const item = document.createElement("li");
    const title = document.createElement("h3");
    const img = document.createElement("img");

    item.className = "result-row-header";
    title.className = "result-text";
    img.className = "logo";

    title.textContent =`${capitalizeName(header_id)}`

    if (header_name === 'machine') {
        img.src = `${getBaseURL()}/machine.png`;
    } else {
        img.src = `${getBaseURL()}/logo-${header_id}.png`
    }

    item.appendChild(img);
    item.appendChild(title);

    return item;
}

//Append documents/files associated with application
function addDocument(name) {
    const item = document.createElement("li");
    const title = document.createElement("h3");
    const img = document.createElement("img");

    item.className = "result-row";
    title.className = "result-text";
    img.className = "logo";

    item.classList.add('result-leaf');

    title.textContent =`${name}`;
    img.src = `${getBaseURL()}/file.png`;

    item.appendChild(img);
    item.appendChild(title);

    return item;
}

//Get loading spinner
function spinner() {
    const loading_div = document.createElement("div");
    const spinner = document.createElement("div");

    loading_div.className = "spinner-div";
    spinner.className = "spinner";

    loading_div.appendChild(spinner);
    docs.appendChild(loading_div);
    return loading_div;
}

//Capitalize
const capitalizeName = (app_name) => {
    return app_name.charAt(0).toUpperCase() + app_name.slice(1);
};

//Hide machines
function removeMachines() {
    machines.classList.remove("show");
}

//Hide apps
function removeApps() {
    apps.classList.remove("show");
}

//Hide documents
function removeFiles() {
    docs.classList.remove("show");
}

//Clear all apps and documents
function clearAll() {
    removeApps();
    removeFiles();
    removeMachines();
    machines.replaceChildren();
    apps.replaceChildren();
    docs.replaceChildren();
}
