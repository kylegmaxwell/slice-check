'use-strict';
console.log("main");

var app;
function handleLoad() {
    var viewport = document.querySelector('#viewport');
    app = new App();
    app.initThree(viewport);
}

/**
 * loadMesh - Load a stl mesh when the file is selected
 */
function loadMesh() {
    var selector = document.querySelector('#meshFile');
    var files = selector.files;
    for (var i=0;i<files.length;i++) {
        if (files[i].indexOf('.stl')!==-1) {
            loadFile(files[i]);
        } else {
            console.log('Unknown file',files[i]);
        }
    }
}


/**
 * loadFile - Load an stl file to render
 * @param {File} file Handle to a local file on the user's computer
 */
function loadFile(file) {
    var reader  = new FileReader();
    reader.addEventListener("load", function () {
        app.loadStl(reader.result);
    }, false);
    if (file) {
        reader.readAsDataURL(file);
    }
}
