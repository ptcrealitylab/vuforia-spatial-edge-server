require.config({paths: {'vs': '/libraries/monaco-editor/min/vs'}});
var container = document.getElementById('editor-container');

var xhr = new XMLHttpRequest();

var saveTimeout = null;

xhr.open('GET', path);

xhr.onload = function() {
    require(['vs/editor/editor.main'], function() {
        var editor = monaco.editor.create(container, {
            value: xhr.responseText,
            language: 'html'
        });

        editor.addListener('contentChanged', updatePreview);
        var previewFrame = document.getElementById('preview-frame');

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
};

xhr.send();
