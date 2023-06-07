require.config({paths: {'vs': '/libraries/monaco-editor/min/vs'}});
var container = document.getElementById('editor-container');
var previewFrame = document.getElementById('preview-frame');

var xhr = new XMLHttpRequest();

var saveTimeout = null;
var editor = null;

xhr.open('GET', path);

xhr.onload = function() {
    if (editor) {
        editor.setValue(xhr.responseText);
    }
};

require(['vs/editor/editor.main']);

previewFrame.addEventListener('load', function() {
    var data = {
        pos: 'fake',
        obj: 'also fake'
    };
    previewFrame.contentWindow.postMessage(JSON.stringify(data), '*');
});

window.addEventListener('message', function(e) {
    var data = JSON.parse(e.data);
    previewFrame.width = data.width;
    previewFrame.height = data.height;
});

xhr.send();
