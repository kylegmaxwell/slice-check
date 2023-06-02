'use-strict';

import { App } from "./App.js";

// Appliation entry point for object oriented model
var app;
var loadCount = 0;
/**
 * Initialize the app when the page first loads
 */
function handleLoad() {
    // Enable button now that callbacks are available
    var loading = document.querySelector('#loading');
    loading.setAttribute('hidden', '');

    var welcome = document.querySelector('#welcome');
    welcome.removeAttribute('hidden');

    var viewport = document.querySelector('#viewport');
    app = new App();
    initHeaderMap();
    window.addEventListener('resize', handleResize);
    var sliceRange = document.querySelector('#sliceRange');
    attachListeners(sliceRange);
}

function setStatus(msg) {
    var status = document.querySelector('#status');
    if (msg !== '') {
        status.textContent = msg;
        status.removeAttribute('hidden');
    } else {
        status.setAttribute('hidden', true);
    }
}

var mainLoaded = false;
/**
 * Setup the main view for the application after the welcome screen
 */
function initMain(count) {

    var main = document.querySelector('#main');
    var meshFile = document.querySelector('#meshFile');
    main.appendChild(meshFile);

    loadCount = count;
    setStatus('Loading geometry...');
    if (mainLoaded) return;
    mainLoaded = true;
    welcome.setAttribute('hidden', true);
    main.removeAttribute('hidden');
    app.initThree(viewport);
}

/**
 * Load a sample mesh and slices for demonstration purposes
 * Source: http://www.osirix-viewer.com/datasets/
 * And I created the mesh using https://www.slicer.org/
 */
export function loadSampleData() {
    var welcome = document.querySelector('#welcome');
    var main = document.querySelector('#main');
    app.loadStl('data/sample/tissue.stl', loaded);
    for (var i = 381; i < 461; i += 10) {
        fetchDcmFile('data/sample/IM-0001-0' + i + '.dcm');
    }
    initMain(9);
}

/**
 * Set up listeners so that slider updates on drag
 * @param {DOMElement} range Range object
 */
function attachListeners(range) {
    var mousedown = false;
    var requested = false;
    range.addEventListener('mousemove', (e) => {
        // Mouse button 1 is down (aka dragging)
        if (e.buttons === 1 && !requested) {
            requested = true;
            window.requestAnimationFrame(() => {
                requested = false;
                changeSlice();
            });
        }
    });

}
/**
 * Resize render canvas when window changes
 */
function handleResize() {
    var viewport = document.querySelector('#viewport');
    if (app.renderer) {
        app.resize(viewport);
    }
}


/**
 * Update slice render, side effect of also update crop
 */
function changeCrop(check) {
    changeSlice();
}

// Data structge for DICOM header offset hash to description mapping
var headerMap = {};
/**
 * Parse the header string webpage into a Javascript map
 */
function initHeaderMap() {
    var keys = headerKeys.split('\n');
    for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (key[0] !== '(') continue;
        var id = 'x' + key.substr(1, 4) + key.substr(6, 4);
        headerMap[id] = key;
    }
}


/**
 * Change the displayed texture slice in the 3D view
 */
function changeSlice() {
    var sliceRange = document.querySelector('#sliceRange');
    var checkbox = document.querySelector('#checkboxCrop');
    app.changeSlice(sliceRange.value, checkbox.checked, app.imageCtx);
}

function loaded() {
    loadCount--;
    if (loadCount === 0) {
        setStatus('');
        changeSlice();
    }
}
/**
 * loadMesh - Load a stl mesh or dcm image when the file is selected
 */
function loadFiles() {
    var selector = document.querySelector('#meshFile');
    var files = selector.files;
    var count = 0;
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        if (file.name.indexOf('.stl') !== -1) {
            count++;
            loadStlFile(file);
        } else if (file.name.indexOf('.dcm') !== -1) {
            count++;
            loadDcmFile(file);
        } else {
            console.log('Unknown file', file);
        }
    }
    initMain(count);
}

/**
 * loadFile - Load an stl file to render
 * @param {File} file Handle to a local file on the user's computer
 */
function loadStlFile(file) {
    var reader = new FileReader();
    reader.addEventListener("load", () => {
        app.loadStl(reader.result, loaded);
    }, false);
    if (file) {
        reader.readAsDataURL(file);
    }
}


/**
 * Fetch an image url and then hand off the blob to be loaded
 * @param {String} url The resource location (path)
 */
function fetchDcmFile(url) {
    fetch(new Request(url)).then((response) => {
        return response.blob();
    }).then((blob) => {
        loadDcmFile(blob);
    });
}

/**
 * loadDcmFile - Use cornerstoneWADOImageLoader to load the DICOM image
 * Based on example project:
 * https://github.com/chafey/cornerstoneWADOImageLoader/tree/master/examples/dicomfile
 * @param {File} file Javascript file handle
 */
function loadDcmFile(file) {
    var imageId = cornerstoneWADOImageLoader.fileManager.add(file);
    // Timeout to wait for the welcome page to hide so that the canvas can be created with non zero
    setTimeout(() => {
        new DicomLoader().loadAndViewImage(imageId, false, loaded, app);
    });
}


// SETUP DOM HOOKS

document.getElementById('sampleButton').addEventListener('click', () => {
    loadSampleData();
})
document.getElementById('sliceRange').addEventListener('change', () => {
    changeSlice();
})
document.getElementById('checkboxCrop').addEventListener('change', () => {
    changeCrop();
})


handleLoad();