'use-strict';

// reference to static dom element
var imageCanvas;

/**
 * @class DicomLoader
 * Purely static class to reduce global namespace pollution.
 * Contains utility functions to simplify DICOM loading.
 */
class DicomLoader {

    static loaded = false;
    static enabled = false;

    /**
     * Load a dicom image using cornerstone and then display in 2D and 3D
     * @param {String} imageId     Cornerstone assigned unique id
     * @param {Boolean} addControls Whether to add mouse controls to the image div
     * @param {Function} cb          Callback to indicate completion
     */
    loadAndViewImage(imageId, addControls, cb, app) {
        var element = $('#dicomImage').get(0);
        if (!this.enabled) {
            cornerstone.enable(element);
            this.enabled = true;
        }
        var start = new Date().getTime();
        cornerstone.loadImage(imageId).then((image) => {
            var viewport = cornerstone.getDefaultViewportForImage(element, image);
            var metadata = {};
            metadata.toggleModalityLUT = viewport.modalityLUT !== undefined;
            metadata.toggleVOILUT = viewport.voiLUT !== undefined;
            cornerstone.displayImage(element, image, viewport);
            if (this.loaded === false && addControls) {
                cornerstoneTools.mouseInput.enable(element);
                cornerstoneTools.mouseWheelInput.enable(element);
                cornerstoneTools.wwwc.activate(element, 1); // ww/wc is the default tool for left mouse button
                cornerstoneTools.pan.activate(element, 2); // pan is the default tool for middle mouse button
                cornerstoneTools.zoom.activate(element, 4); // zoom is the default tool for right mouse button
                cornerstoneTools.zoomWheel.activate(element); // zoom is the default tool for middle mouse wheel
                this.loaded = true;
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
                if (value === undefined) {
                    return;
                }
                return value + (value === 0 ? ' (unsigned)' : ' (signed)');
            }

            function getPlanarConfiguration() {
                var value = image.data.uint16('x00280006');
                if (value === undefined) {
                    return;
                }
                return value + (value === 0 ? ' (pixel)' : ' (plane)');
            }

            function getImagePositionPatient() {
                var xyz = image.data.string('x00200032').split('\\');
                var pos = [parseFloat(xyz[0]), parseFloat(xyz[1]), parseFloat(xyz[2])];
                return pos;
            }

            function getImageOrientationPatient() {
                var xyz = image.data.string('x00200037').split('\\');
                return [
                    [parseFloat(xyz[0]), parseFloat(xyz[1]), parseFloat(xyz[2])],
                    [parseFloat(xyz[3]), parseFloat(xyz[4]), parseFloat(xyz[5])]
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
            metadata.acquisitionNumber = image.data.string('x00200012');
            metadata.instanceNumber = image.data.string('x00200013');
            console.log('loaded', imageId, metadata.instanceNumber);

            var end = new Date().getTime();
            var time = end - start;
            metadata.loadTime = time + 'ms';
            this.loadTexture(element, metadata, app);
            // this.printData(image);
            cb();
        }, (err) => {
            console.error(err);
        });
    }

    loadTexture(element, metadata, app) {
        if (!imageCanvas || !app.imageCtx) {
            imageCanvas = element.querySelector('canvas');
            app.imageCtx = imageCanvas.getContext('2d');
        }
        app.loadTexture(imageCanvas.toDataURL(), app.imageCtx.getImageData(0, 0, imageCanvas.width, imageCanvas.height), metadata);
    };

    /**
     * Print all the header data in various formats for debugging
     *
     * @param {cornerstone image} image Loaded from DICOM
     */
    printData(image) {
        var keys = Object.keys(image.data.elements);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            console.log(headerMap[key] + key);
            console.log('string: ' + image.data.string(key));
            console.log('intString: ' + image.data.intString(key));
            console.log('float: ' + image.data.float(key));
        }
    }
}
