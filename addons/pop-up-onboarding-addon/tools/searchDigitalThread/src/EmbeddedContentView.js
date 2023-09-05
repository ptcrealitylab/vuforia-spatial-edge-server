class EmbeddedContentView {
    constructor(rootElement, spatialInterface) {
        this.rootElement = rootElement;
        if (spatialInterface) {
            this.spatialInterface = spatialInterface;
        }
        this.createDomElements();
        this.setupPersistentData();
    }
    createDomElements() {
        this.dom = this.rootElement;

        this.header = document.getElementById('contentHeader');
        this.headerText = document.getElementById('contentHeaderText');
        if (window.innerWidth < 1200) {
            this.header.style.paddingTop = '50px';
            this.headerText.style.overflow = 'hidden';
            this.headerText.style.lineHeight = '55px';
        }
        this.contentWindow = document.getElementById('contentWindow');
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
    show(wait) {
        let delay = wait ? 300 : 10;
        this.getDom().style.display = '';
        setTimeout(function() {
            this.dom.style.opacity = 1;
        }.bind(this), delay);
    }
    hide() {
        this.dom.style.opacity = 0;
        setTimeout(function() {
            this.getDom().style.display = 'none';
        }.bind(this), 50);
    }
    getDom() {
        return this.dom;
    }
    loadResult(titleText, fileData) {
        console.log('load result');
        console.log(titleText, fileData);

        this.headerText.innerText = titleText;
        if (window.innerWidth < 1200 && titleText.length > 25) {
            this.headerText.style.paddingLeft = '85px';
            this.headerText.style.width = 'calc(100% - 90px)';
        }

        this.contentWindow.innerHTML = '';

        // custom function to parse PLM results
        if (fileData && fileData.serviceParts) {
            let partListDiv = document.createElement('div');
            partListDiv.id = 'partListDiv';
            this.contentWindow.appendChild(partListDiv);

            partListDiv.innerHTML += '<h2>Service Parts</h2>'
            fileData.serviceParts.forEach((partName) => {
                partListDiv.innerHTML += `
                <p>${partName}</p>`;
            });

            // loads PDFs into the view using PDF.js to render it
        } else if (fileData && fileData.path && fileData.path.includes('.pdf')) {
            // this.loadPDFInIframe(titleText, fileData.path);
            this.loadPDFViewer(titleText, fileData.path);
        } else if (fileData && fileData.path && (fileData.path.includes('.png') || fileData.path.includes('.jpg'))) {
            this.loadImage(titleText, fileData.path);
        } else {
            console.warn('File data invalid for EmbeddedContentView', fileData);
        }
    }

    // use the PDF.js viewer from the hardware interface to view the PDF with thumbnails, scrolling, pages, etc.
    loadPDFViewer(titleText, relativePath) {
        if (!this.pdfIframe) {
            this.pdfIframe = document.createElement('iframe');
            this.pdfIframe.id = 'pdfCanvas';
            this.contentWindow.appendChild(this.pdfIframe);
        }

        if (!relativePath) return;
        let fullPath = `${getBaseURL()}/${relativePath}`; // 'http://192.168.0.14:8080/obj/testBen/frames/test/hp-page-1.pdf'; // 
        if (!fullPath) return;

        let pdfjsPath = `${getBaseURL()}/pdfjs/web/viewer.html?file=${fullPath}`; // `/thirdParty/web/viewer.html?file=${fullPath}`;
        console.log(pdfjsPath);

        this.pdfIframe.setAttribute('src', pdfjsPath);
    }

    // use this method to load the iframe using the browser's built-in PDF viewer. works well in Chrome, not in Mobile Safari.
    loadPDFInIframe(titleText, relativePath) {
        if (!this.pdfIframe) {
            this.pdfIframe = document.createElement('iframe');
            this.pdfIframe.id = 'pdfCanvas';
            this.contentWindow.appendChild(this.pdfIframe);

            let container = document.createElement('div');
            let loader = document.createElement('div');
            container.classList.add('loaderContainer');
            loader.classList.add('loader');
            container.appendChild(loader);
            this.contentWindow.appendChild(container);
        }

        // let relativePath = (typeof path !== 'undefined') ? path : urlLookup[titleText];
        if (!relativePath) return;
        let fullPath = `${getBaseURL()}/${relativePath}`; // 'http://192.168.0.14:8080/obj/testBen/frames/test/hp-page-1.pdf'; // 
        if (!fullPath) return;

        this.pdfIframe.setAttribute('src', fullPath);
        this.pdfIframe.style.border = 'none';

        setTimeout(() => {
            let loaderContainer = document.querySelector('.loaderContainer');
            if (loaderContainer) {
                loaderContainer.parentElement.removeChild(loaderContainer);
            }
        }, 1000);
    }

    // loads a simple image into the view
    loadImage(titleText, relativePath) {
        if (!this.image) {
            this.image = document.createElement('img');
            this.image.id = 'embeddedImage';
            this.contentWindow.appendChild(this.image);
        }

        if (!relativePath) return;
        let fullPath = `${getBaseURL()}/${relativePath}`;
        if (!fullPath) return;

        this.image.setAttribute('src', fullPath);
    }

    setupPersistentData() {
        window.storage.listen('resultTitle', function(titleText) {
            console.log('conversation view got title ' + titleText);
        }.bind(this));
        window.storage.listen('fileData', function(fileData) {
            console.log('conversation view got fileData ', fileData);
        }.bind(this));
        window.storage.load();
    }
}
