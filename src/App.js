'use-strict';

/**
 * App - Application entry point
 */
function App() {
    this.loader = new THREE.STLLoader();
    this.currentSlice = -1;
}


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
    // this.controls.focus(parent, true);
    this.render();
};


/**
 * Change the visible slice based on the percentage selection
 * @param {Number} value Value of slider from 0 to 100
 */
App.prototype.changeSlice = function(value) {
    var children = this.slicesObj.children;
    children[this.currentSlice].visible = false;
    this.currentSlice = Math.floor((value*0.01)*(children.length-1));
    children[this.currentSlice].visible = true;
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
App.prototype.loadTexture = function(imgUrl, metadata) {
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
	var material = new THREE.MeshStandardMaterial( {
        emissive: 0xffffff,
        emissiveMap: texture1,
        metalness: 0,
        roughness: 0.6,
        side: THREE.DoubleSide
     } );
    var geometry = new THREE.PlaneBufferGeometry( width, height, 1, 1 );
    var mesh = new THREE.Mesh( geometry, material );
    // Still figuring this out, perhaps the uv's should go 0 to 1-pixel?
    var OFFSET_HACK = 2;
    mesh.position.x += OFFSET_HACK + offset[0] * pixelWidth;
    mesh.position.y -= offset[1] + height / 2;
    mesh.position.z += offset[2];

    mesh.rotation.y = Math.PI;

    if (this.currentSlice !== -1) {
        this.slicesObj.children[this.currentSlice].visible = false;
    }
    this.currentSlice = this.slicesObj.children.length;
    this.addObj(mesh, this.slicesObj);
};

/**
 * loadStl - Function to load an stl file for rendering as a mesh
 */
App.prototype.loadStl = function(stlUrl) {
    var _this = this;
    this.loader.load( stlUrl, function ( geometry ) {
		var material = new THREE.MeshPhysicalMaterial( {
            color: 0xff5533,
            transparent: true,
            opacity: 0.9,
            roughness: 0.7,
            metalness: 0.6
        } );
		var mesh = new THREE.Mesh( geometry, material );
        _this.addObj(mesh, _this.meshesObj);
        _this.controls.focus(mesh, true);

	} );
};

/**
 * initThree - Setup three.js scene
 *
 * @param {Element} container DOM element to contain the render canvas
 */
App.prototype.initThree = function(container) {
    this.scene = new THREE.Scene();
    this.meshesObj = new THREE.Scene();
    this.scene.add(this.meshesObj);
    this.slicesObj = new THREE.Scene();
    this.scene.add(this.slicesObj);
    var width = container.clientWidth;
    var height = container.clientHeight;
	this.camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 10000 );
	this.renderer = new THREE.WebGLRenderer({
        antialias:true
    });
    this.renderer.sortObjects = false;
    this.renderer.setClearColor( 0x000000 );
	this.renderer.setSize( width, height );
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
    this.loadStl('data/tissue.stl');
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

    var width = container.clientWidth;
    var height = container.clientHeight;
    this.camera.aspect = width/height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize( width, height );
    this.render();
};
