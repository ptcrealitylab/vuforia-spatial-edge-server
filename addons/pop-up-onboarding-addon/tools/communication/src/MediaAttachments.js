export class MediaAttachments {
    constructor(spatialInterface) {
        this.spatialInterface = spatialInterface;
        this.isVideoRecording = false;
    }
    startVideoRecording(timeoutInMs, timeoutCompletionCallback) {
        if (!this.isVideoRecording) {
            this.spatialInterface.startVideoRecording();
            this.isVideoRecording = true;
            setTimeout(function() {
                if (this.isVideoRecording) {
                    this.spatialInterface.stopVideoRecording(function(videoFilePath) {
                        timeoutCompletionCallback(videoFilePath);
                        this.isVideoRecording = false;
                    }.bind(this));
                }
            }.bind(this), timeoutInMs);
        }
    }
    stopVideoRecording(completionCallback) {
        if (this.isVideoRecording) {
            this.spatialInterface.stopVideoRecording(function(videoFilePath) {
                completionCallback(videoFilePath);
                this.isVideoRecording = false;
            }.bind(this));
        }
    }
    takeScreenshot(completionCallback) {
        this.spatialInterface.getScreenshotBase64(function(screenshotBase64) {
            completionCallback(this.decodeBase64JpgToBlobUrl(screenshotBase64)); // TODO: upload to server, load from URL
        }.bind(this));
    }
    /**
     * Decodes an image/jpeg encoded as a base64 string, into a blobUrl that can be loaded as an img src
     * https://stackoverflow.com/questions/7650587/using-javascript-to-display-blob
     * @param {string} base64String - a Base64 encoded string representation of a jpg image
     * @return {string}
     */
    decodeBase64JpgToBlobUrl(base64String) {
        var blob = this.b64toBlob(base64String, 'image/jpeg');
        return URL.createObjectURL(blob);
    }
    /**
     * https://stackoverflow.com/questions/16245767/creating-a-blob-from-a-base64-string-in-javascript
     * @param {string} b64Data - a Base64 encoded string
     * @param {string} contentType - the MIME type, e.g. 'image/jpeg', 'video/mp4', or 'text/plain' (
     * @param {number|undefined} sliceSize - number of bytes to process at a time (default 512). Affects performance.
     * @return {Blob}
     */
    b64toBlob(b64Data, contentType, sliceSize) {
        contentType = contentType || '';
        sliceSize = sliceSize || 512;

        var byteCharacters = atob(b64Data);
        var byteArrays = [];

        for (var offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            var slice = byteCharacters.slice(offset, offset + sliceSize);

            var byteNumbers = new Array(slice.length);
            for (var i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }

            var byteArray = new Uint8Array(byteNumbers);

            byteArrays.push(byteArray);
        }

        return new Blob(byteArrays, {type: contentType});
    };

    uploadFilesToServer(files, callback) {
        // Create a new FormData object.
        var formData = new FormData();

        let isVideo = false;
        
        // Loop through each of the selected files.
        for (var i = 0; i < files.length; i++) {
            var file = files[i];

            // Check the file type.
            if (!file.type.match('image.*') && !file.type.match('video.*')) {
                continue;
            }
            
            if (file.type.match('video.*')) {
                isVideo = true;
            }

            // Add the file to the request.
            formData.append('photos[]', file, file.name);
        }

        // Set up the request.
        var xhr = new XMLHttpRequest();
        
        let postUrl = 'http://' + spatialObject.serverIp + ':' + spatialObject.serverPort + '/object/' + spatialObject.object + '/uploadMediaFile';

        // Open the connection.
        xhr.open('POST', postUrl, true);

        // Set up a handler for when the request finishes.
        xhr.onload = function () {
            if (xhr.status === 200) {
                // File(s) uploaded.
                // newIconSubmitButton.innerHTML = 'Upload';
                console.log('successful upload');
                // setTimeout(function() {

                    // var customSrc = getSrcForCustomIcon();
                    // customIconImage.src = customSrc;// + '?' + new Date().getTime();
                    // customIconImage.style.display = 'inline';

                    // useIconCustom();
                    // postIconToParent();

                    console.log('useCustomIcon()');
                    console.log('postIconToParent()');
                    
                    let mediaUuid = JSON.parse(xhr.responseText).mediaUuid;

                    let extension = isVideo ? '.mov' : '.jpg';
                    let filepath = 'http://' + spatialObject.serverIp + ':' + spatialObject.serverPort + '/mediaFile/' + spatialObject.object + '/' + mediaUuid + extension;
                    callback(filepath);

                // }, 1000);

            } else {
                console.log('error uploading');
            }
        };

        // // hide the existing image
        // customIconImage.style.display = 'none';

        // Send the Data.
        xhr.send(formData);
    }
}
