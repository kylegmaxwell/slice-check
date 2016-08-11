'use-strict';

// Appliation entry point for object oriented model
var app;

/**
 * Initialize the app when the page first loads
 */
function handleLoad() {
    var viewport = document.querySelector('#viewport');
    app = new App();
    app.initThree(viewport);
    initHeaderMap();
}
// Data structge for DICOM header offset hash to description mapping
var headerMap = {};
/**
 * Parse the header string webpage into a Javascript map
 */
function initHeaderMap() {
    var keys = headerKeys.split('\n');
    for (var i=0;i<keys.length;i++) {
        var key = keys[i];
        if (key[0]!=='(') continue;
        var id = 'x'+key.substr(1,4)+key.substr(6,4);
        headerMap[id] = key;
    }
}

/**
 * loadMesh - Load a stl mesh when the file is selected
 */
function loadMesh() {
    var selector = document.querySelector('#meshFile');
    var files = selector.files;
    for (var i=0;i<files.length;i++) {
        var file = files[i];
        if (file.name.indexOf('.stl')!==-1) {
            loadStlFile(file);
        } else if (file.name.indexOf('.dcm')!==-1) {
            loadDcmFile(file);
        } else {
            console.log('Unknown file',file);
        }
    }
}

/**
 * loadFile - Load an stl file to render
 * @param {File} file Handle to a local file on the user's computer
 */
function loadStlFile(file) {
    var reader  = new FileReader();
    reader.addEventListener("load", function () {
        app.loadStl(reader.result);
    }, false);
    if (file) {
        reader.readAsDataURL(file);
    }
}

/**
 * loadDcmFile - Use cornerstoneWADOImageLoader to load the DICOM image
 * Based on example project:
 * https://github.com/chafey/cornerstoneWADOImageLoader/tree/master/examples/dicomfile
 * @param {File} file Javascript file handle
 */
function loadDcmFile(file) {
    var imageId = cornerstoneWADOImageLoader.fileManager.add(file);
    loadAndViewImage(imageId);
}

var loaded = false;
function loadAndViewImage(imageId) {
    var element = $('#dicomImage').get(0);
    if (!loaded) {
        cornerstone.enable(element);
    }
    var start = new Date().getTime();
    cornerstone.loadImage(imageId).then(function(image) {
        var viewport = cornerstone.getDefaultViewportForImage(element, image);
        var metadata = {};
        metadata.toggleModalityLUT = viewport.modalityLUT !== undefined;
        metadata.toggleVOILUT = viewport.voiLUT !== undefined;
        cornerstone.displayImage(element, image, viewport);
        if(loaded === false) {
            cornerstoneTools.mouseInput.enable(element);
            cornerstoneTools.mouseWheelInput.enable(element);
            cornerstoneTools.wwwc.activate(element, 1); // ww/wc is the default tool for left mouse button
            cornerstoneTools.pan.activate(element, 2); // pan is the default tool for middle mouse button
            cornerstoneTools.zoom.activate(element, 4); // zoom is the default tool for right mouse button
            cornerstoneTools.zoomWheel.activate(element); // zoom is the default tool for middle mouse wheel
            loaded = true;
        }

        function getTransferSyntax() {
            var value = image.data.string('x00020010');
            return value + ' [' + uids[value] + ']';
        }

        function getSopClass() {
            var value = image.data.string('x00080016');
            return value + ' [' + uids[value] + ']';
        }

        function getPixelRepresentation() {
            var value = image.data.uint16('x00280103');
            if(value === undefined) {
                return;
            }
            return value + (value === 0 ? ' (unsigned)' : ' (signed)');
        }

        function getPlanarConfiguration() {
            var value = image.data.uint16('x00280006');
            if(value === undefined) {
                return;
            }
            return value + (value === 0 ? ' (pixel)' : ' (plane)');
        }

        function getImagePositionPatient() {
            var xyz = image.data.string('x00200032').split('\\');
            var pos = [parseFloat(xyz[0]),parseFloat(xyz[1]),parseFloat(xyz[2])];
            return pos;
        }

        function getImageOrientationPatient() {
            var xyz = image.data.string('x00200037').split('\\');
            return [
                [parseFloat(xyz[0]),parseFloat(xyz[1]),parseFloat(xyz[2])],
                [parseFloat(xyz[3]),parseFloat(xyz[4]),parseFloat(xyz[5])]
            ];
        }

        metadata.transferSyntax = getTransferSyntax();
        metadata.sopClass = getSopClass();
        metadata.samplesPerPixel = image.data.uint16('x00280002');
        metadata.photometricInterpretation = image.data.string('x00280004');
        metadata.numberOfFrames = image.data.string('x00280008');
        metadata.planarConfiguration = getPlanarConfiguration();
        metadata.rows = image.data.uint16('x00280010');
        metadata.columns = image.data.uint16('x00280011');
        metadata.pixelSpacing = image.data.string('x00280030');
        metadata.pixelSpacingSequence = image.data.string('x004008D8');
        metadata.bitsAllocated = image.data.uint16('x00280100');
        metadata.bitsStored = image.data.uint16('x00280101');
        metadata.highBit = image.data.uint16('x00280102');
        metadata.pixelRepresentation = getPixelRepresentation();
        metadata.windowCenter = image.data.string('x00281050');
        metadata.windowWidth = image.data.string('x00281051');
        metadata.windowExplanation = image.data.string('x00281055');
        metadata.rescaleIntercept = image.data.string('x00281052');
        metadata.rescaleSlope = image.data.string('x00281053');
        metadata.basicOffsetTable = image.data.elements.x7fe00010.basicOffsetTable ? image.data.elements.x7fe00010.basicOffsetTable.length : '';
        metadata.fragments = image.data.elements.x7fe00010.fragments ? image.data.elements.x7fe00010.fragments.length : '';
        metadata.minStoredPixelValue = image.minPixelValue;
        metadata.maxStoredPixelValue = image.maxPixelValue;
        metadata.physicalUnitsX = image.data.string('x00186024');
        metadata.referencePixelX0 = image.data.string('x00186020');
        metadata.imagePositionPatient = getImagePositionPatient();
        metadata.imageOrientationPatient = getImageOrientationPatient();
        console.log(metadata.imagePositionPatient);
        console.log(JSON.stringify(metadata.imageOrientationPatient));
        var end = new Date().getTime();
        var time = end - start;
        metadata.loadTime = time+'ms';
        app.loadTexture(element.querySelector('canvas').toDataURL(), metadata);
        // printData(image);
    }, function(err) {
        console.error(err);
    });
}


/**
 * Print all the header data in various formats for debugging
 *
 * @param {cornerstone image} image Loaded from DICOM
 */
function printData(image) {
    var keys = Object.keys(image.data.elements);
    for (var i=0;i<keys.length;i++) {
        var key = keys[i];
        console.log(headerMap[key]+key);
        console.log('string: '+image.data.string(key));
        console.log('intString: '+image.data.intString(key));
        console.log('float: '+image.data.float(key));
    }
}
