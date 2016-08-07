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
    cornerstone.enable(element);
    //try {
    var start = new Date().getTime();
    cornerstone.loadImage(imageId).then(function(image) {
        console.log(image);
        var viewport = cornerstone.getDefaultViewportForImage(element, image);
        // $('#toggleModalityLUT').attr("checked",viewport.modalityLUT !== undefined);
        // $('#toggleVOILUT').attr("checked",viewport.voiLUT !== undefined);
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

        // $('#transferSyntax').text(getTransferSyntax());
        // $('#sopClass').text(getSopClass());
        // $('#samplesPerPixel').text(image.data.uint16('x00280002'));
        // $('#photometricInterpretation').text(image.data.string('x00280004'));
        // $('#numberOfFrames').text(image.data.string('x00280008'));
        // $('#planarConfiguration').text(getPlanarConfiguration());
        // $('#rows').text(image.data.uint16('x00280010'));
        // $('#columns').text(image.data.uint16('x00280011'));
        // $('#pixelSpacing').text(image.data.string('x00280030'));
        // $('#bitsAllocated').text(image.data.uint16('x00280100'));
        // $('#bitsStored').text(image.data.uint16('x00280101'));
        // $('#highBit').text(image.data.uint16('x00280102'));
        // $('#pixelRepresentation').text(getPixelRepresentation());
        // $('#windowCenter').text(image.data.string('x00281050'));
        // $('#windowWidth').text(image.data.string('x00281051'));
        // $('#rescaleIntercept').text(image.data.string('x00281052'));
        // $('#rescaleSlope').text(image.data.string('x00281053'));
        // $('#basicOffsetTable').text(image.data.elements.x7fe00010.basicOffsetTable ? image.data.elements.x7fe00010.basicOffsetTable.length : '');
        // $('#fragments').text(image.data.elements.x7fe00010.fragments ? image.data.elements.x7fe00010.fragments.length : '');
        // $('#minStoredPixelValue').text(image.minPixelValue);
        // $('#maxStoredPixelValue').text(image.maxPixelValue);
        var end = new Date().getTime();
        var time = end - start;
        console.log('load time',time+'ms');
        // $('#loadTime').text(time + "ms");
    }, function(err) {
        console.error(err);
    });
}
