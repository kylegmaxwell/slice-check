'use-strict';

/**
 * App - Application entry point
 */
function App() {
    this.loader = new THREE.STLLoader();
    this.scene = new THREE.Scene();
    this.meshesObj = new THREE.Object3D();
    this.scene.add(this.meshesObj);
    this.slicesObj = new THREE.Object3D();
    this.scene.add(this.slicesObj);
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.currentSlice = -1;
    this.sortedSlices = [];
    this.globalPlanes = [
        new THREE.Plane( new THREE.Vector3( 0, 0, 1 ), 140 ),
        new THREE.Plane( new THREE.Vector3( 0, 0, -1 ), -120 )
    ];
    this.noClip = Object.freeze( [] );
}


/**
 * Turn on or off global clipping planes to trim mesh to slice
 * @param {Boolean} active  Whether clipping is on or off
 * @param {Number} minDist Minimum distance from origin in slice direction to render
 * @param {Number} maxDist Maximum distance from origin in slice direction to render
 *
 * @return {type} Description
 */
App.prototype.setClipping = function(active, minDist, maxDist) {
    if (!active) {
        this.renderer.clippingPlanes = this.noClip;
        return;
    }
    if (minDist !== undefined)
        this.globalPlanes[0].constant = -1 * minDist;
    if (maxDist !== undefined)
        this.globalPlanes[1].constant = maxDist;
    this.renderer.clippingPlanes = this.globalPlanes; // Later set it to globalPlanes
};

/**
 * Add an object and prepare it for rendering
 *
 * @param {THREE.Object3D} obj    The new object
 * @param {THREE.Object3D} parent The container
 */
App.prototype.addObj = function(obj, parent) {
    if (obj.geometry) {
        obj.geometry.computeBoundingSphere(); // needed for focus
    }
    parent.add( obj );
    // THREE.EditorControls is buggy in determining the center point, so focus is disabled here
    // TODO set center point manually
    // this.controls.focus(parent, true);
    this.render();
};


/**
 * Change the visible slice based on the percentage selection
 * @param {Number} value Value of slider from 0 to 100
 */
App.prototype.changeSlice = function(value, doCrop, ctx) {
    var i = this.currentSlice;
    if (i === -1) return;
    this.sortedSlices[this.currentSlice].mesh.visible = false;
    var slices = this.sortedSlices;
    slices[i].mesh.visible = false;
    i = Math.floor(((100-value)*0.01)*(slices.length-1));
    this.currentSlice = i;
    slices[i].mesh.visible = true;
    var pos = slices[i].mesh.position;
    this.setClipping(doCrop, pos.z - 20, pos.z + 20);
    ctx.putImageData(slices[i].imgData,0,0);
    this.render();
};

/**
 * Load a dicom texture and create a quad to render it in 3D
 *
 * @param {String} imgUrl   Path to image data that can render on a canvas
 * @param {Object} metadata DICOM header converted to human readable properties
 *
 * @return {type} Description
 */
App.prototype.loadTexture = function(imgUrl, imgData, metadata) {
	var textureLoader = new THREE.TextureLoader();
    var _this = this;
	var texture1 = textureLoader.load( imgUrl, function () {
        _this.render();
    } );
    var width = 512;
    var height = 512;
    var pixelWidth = 1.0;
    var pixelHeight = 1.0;

    var offset = [0,0,0];
    if (metadata) {
        width = metadata.columns ? metadata.columns : width;
        height = metadata.rows ? metadata.rows : height;
        if (metadata.pixelSpacing) {
            var dims = metadata.pixelSpacing.split('\\');
            pixelWidth = parseFloat(dims[0]);
            pixelHeight = parseFloat(dims[1]);
            width = Math.floor(width*pixelWidth);
            height = Math.floor(height*pixelHeight);
        }
        offset[0] += metadata.imagePositionPatient[0];
        offset[1] += metadata.imagePositionPatient[1];
        offset[2] += metadata.imagePositionPatient[2];

    }

    // Texture card geometry
	var material = new THREE.MeshBasicMaterial( {
        color: 0xffffff,
        map: texture1,
        side: THREE.DoubleSide
     } );
    var geometry = new THREE.PlaneBufferGeometry( width, height, 1, 1 );
    var mesh = new THREE.Mesh( geometry, material );
    // Still figuring this out, perhaps the uv's should go 0 to 1-pixel?
    var OFFSET_HACK = 2;
    mesh.position.x += OFFSET_HACK + offset[0] * pixelWidth;
    mesh.position.y -= offset[1] + height / 2;
    mesh.position.z += offset[2];

    //TODO this should use imageOrientationPatient
    mesh.rotation.y = Math.PI;

    if (this.currentSlice !== -1) {
        this.sortedSlices[this.currentSlice].mesh.visible = false;
    }
    this.addObj(mesh, this.slicesObj);
    this.currentSlice = this.insertSortedSlice({
        imgUrl: imgUrl,
        imgData: imgData,
        metadata: metadata,
        mesh: mesh,
        z: metadata.imagePositionPatient[2]
    });
};

/**
 * Insert a new slice into the sorted list
 * @param {Object} newSlice JSON object map containing slice info
 * @return {Number} The position in the list where it was inserted
 */
App.prototype.insertSortedSlice = function(newSlice) {
    // Check if the new slice can simply go on the end
    if (this.sortedSlices.length === 0 || newSlice.z >= this.sortedSlices[this.sortedSlices.length-1].z) {
        this.sortedSlices.push(newSlice);
        return this.sortedSlices.length-1;
    }
    //TODO binary search
    for (var i=0;i<this.sortedSlices.length;i++) {
        var slice = this.sortedSlices[i];
        if (newSlice.z < slice.z) {
             this.sortedSlices.splice(i, 0, newSlice);
             console.log(i, newSlice.z);
             return i;
        }
    }
};

/**
 * loadStl - Function to load an stl file for rendering as a mesh
 * @param {String} stlUrl The url of the mesh file
 * @param {Function} cb Callback function to indicate completion
 */
App.prototype.loadStl = function(stlUrl, cb) {
    var _this = this;
    this.loader.load( stlUrl, function ( geometry ) {
		var material = new THREE.MeshPhysicalMaterial( {
            color: 0xff5533,
            roughness: 0.7,
            metalness: 0.6,
            side: THREE.DoubleSide
        } );
		var mesh = new THREE.Mesh( geometry, material );
        _this.addObj(mesh, _this.meshesObj);
        _this.controls.focus(mesh, true);
        cb();
	} );
};

/**
 * initThree - Setup three.js scene
 *
 * @param {Element} container DOM element to contain the render canvas
 */
App.prototype.initThree = function(container) {
    var width = container.clientWidth;
    var height = container.clientHeight;
	this.camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 10000 );
	this.renderer = new THREE.WebGLRenderer({
        antialias:true
    });
    this.renderer.sortObjects = false;
    this.renderer.setClearColor( 0xcccccc );
	this.renderer.setSize( width, height );
    this.setClipping(false);
	container.appendChild( this.renderer.domElement );
    this.camera.position.x = 300;
    this.camera.position.y = 300;
	this.camera.position.z = 300;
    this.controls = new THREE.EditorControls( this.camera, container );

    var _this = this;
    this.controls.addEventListener('change', function () {
        _this.render();
    });

    // Keep a separate scene so that this doesnt affect focusing of controls
    var axisHelper = new THREE.AxisHelper( 100 );
    this.scene.add( axisHelper );

    this.addLights();
	this.render();
};

/**
 * addLights - Add some lights to the three.js scene
 */
App.prototype.addLights = function() {
    var directionalLight1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight1.position.set( 1, -1, 0 );
    this.scene.add( directionalLight1 );

    var directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.8 );
    directionalLight2.position.set( 0, 1, 0 );
    this.scene.add( directionalLight2 );

    var directionalLight3 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight3.position.set( -1, -1, 1 );
    this.scene.add( directionalLight3 );

    var directionalLight4 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight4.position.set( 0, 0, -1 );
    this.scene.add( directionalLight4 );

    var light = new THREE.AmbientLight( 0x404040 ); // soft white light
    this.scene.add( light );
};

/**
 * render - Render the scene
 */
App.prototype.render = function() {
    this.renderer.render(this.scene, this.camera);
};

App.prototype.resize = function(container) {
    var width = Math.floor(container.clientWidth);
    var height = Math.floor(container.clientHeight);
    this.camera.aspect = width/height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( width, height );
    this.render();
};
