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

require(['vs/editor/editor.main'], function() {
    var value = '';
    if (xhr.readyState === 4) { // if xhr is done
        value = xhr.responseText;
    }

    editor = monaco.editor.create(container, {
        value: value,
        language: 'html'
    });

    editor.addListener('contentChanged', updatePreview);

    function updatePreview() {
        var value = editor.getValue();
        if (saveTimeout) {
            window.clearTimeout(saveTimeout);
        }
        saveTimeout = window.setTimeout(save, 250);
    }

    function save() {
        var saveXhr = new XMLHttpRequest();
        saveXhr.open('PUT', document.location);
        saveXhr.onload = function() {
            previewFrame.src = previewFrame.src;
        };
        var formData = new FormData();
        formData.append('content', editor.getValue());
        saveXhr.setRequestHeader('Content-Type', 'application/json');
        saveXhr.send(JSON.stringify({content: editor.getValue()}));
        saveTimeout = null;
    }
});

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
