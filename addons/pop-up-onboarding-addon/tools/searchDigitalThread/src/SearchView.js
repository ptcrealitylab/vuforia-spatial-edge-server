class SearchView {
    constructor(spatialInterface, onSearchResultPicked) {
        this.spatialInterface = spatialInterface;
        this.textfieldSubmitCallbacks = {};
        this.textfieldChangeCallbacks = {};
        this.textfieldWriteFunctions = {};
        this.onSearchResultPicked = onSearchResultPicked;
        this.initializeDomElements();
        this.setupPersistentData();
        this.setupToolboxEvents();
    }
    initializeDomElements() {
        // allow user to type into search bar
        let searchField = document.querySelector('.searchbar-input');
        if (searchField) {
            this.setupTextfield(searchField, 'Search', (e) => {
                console.log('onchange callback');
                // this.showResults();
                showMachines();
            }, (e) => {
                console.log('onsubmit callback');
            });
        }

        // this.setupButtonVisualFeedback(document.querySelector('.searchbar-label'));
    }
    addResultListeners(nextResults) {
        // when tapping on a search result, show the result
        document.querySelectorAll('.result-row').forEach(rowDiv => {
            if (rowDiv.classList.contains('result-processed')) return;
            rowDiv.classList.add('result-processed');
            this.setupButtonVisualFeedback(rowDiv);
            let isApp = rowDiv.getAttribute('name') === 'app';
            // item.setAttribute("name", "app")
            let isLeaf = rowDiv.classList.contains('result-leaf'); //false; // !(rowDiv.classList.contains('top-level-result'));
            rowDiv.addEventListener('pointerup', (e) => {
                let resultText = rowDiv.querySelector('.result-text').innerText;
                if (isLeaf) {
                    if (this.onSearchResultPicked) {
                        console.log(JSON.parse(rowDiv.getAttribute('filedata')).path);
                        this.onSearchResultPicked(rowDiv, resultText);
                    }
                } else if (isApp) {
                    showDocuments(e);
                } else {
                    showApps(e);
                    // if (nextResults) {
                    //     nextResults(e);
                    // }
                    // this.nextResults(resultText);
                }
            });
        });
    }
    setupButtonVisualFeedback(buttonElement) {
        buttonElement.addEventListener('pointerdown', function() {
            buttonElement.classList.add('buttonActive');
        });
        buttonElement.addEventListener('pointerup', function() {
            buttonElement.classList.remove('buttonActive');
        });
        buttonElement.addEventListener('pointercancel', function() {
            buttonElement.classList.remove('buttonActive');
        });
    }
    setupTextfield(element, defaultText, changeCallback, submitCallback, customWriteFunction) {
        if (!this.registeredTextboxIds) {
            this.registeredTextboxIds = [];
        }
        this.registeredTextboxIds.push(element.id);
        element.addEventListener('pointerup', function(e) {
            if (element.innerText === defaultText) {
                element.innerText = '';
            }
        }.bind(this));

        if (submitCallback) {
            this.textfieldSubmitCallbacks[element.id] = submitCallback;
        }

        if (changeCallback) {
            this.textfieldChangeCallbacks[element.id] = changeCallback;
        }

        if (customWriteFunction) {
            this.textfieldWriteFunctions[element.id] = customWriteFunction;
        }
    }
    setupToolboxEvents() {
        window.addEventListener('message', (e) => {
            if (!e.data) {
                return;
            }
            let msg;
            try {
                msg = JSON.parse(e.data);
            } catch (_) {
                return;
            }

            if (msg.hasOwnProperty('getCommunicationUserId')) {
                this.userId = msg.getCommunicationUserId;
            }
        });

        window.parent.postMessage(JSON.stringify({
            version: spatialObject.version,
            node: spatialObject.node,
            frame: spatialObject.frame,
            object: spatialObject.object,
            getCommunicationUserId: true,
        }), '*');
    }
    setupPersistentData() {
        window.storage.listen('resultTitle', function(titleText) {
            console.log('search view got title ' + titleText);
            // this.loadResult(titleText);
        }.bind(this));
        window.storage.listen('fileData', function(fileData) {
            console.log('search view got fileData ' + fileData);
            // this.loadResult(titleText);
        }.bind(this));
        window.storage.load();
    }
    showResults() {
        let input = document.getElementById("searchbar-input");
        let query = input.value.toLowerCase();
        let results = document.getElementById('search-results')
        if (searchTree.query.toLowerCase().includes(query)) {
            results.classList.add("show");
        }
        if (!query) {
            this.removeResults();
            document.getElementById('next-results').classList.remove("show");
        }
    }
    nextResults() {
        document.getElementById("next-results").classList.add("show")
        this.removeResults();
    }
    removeResults() {
        document.getElementById('search-results').classList.remove("show");
    }
}
