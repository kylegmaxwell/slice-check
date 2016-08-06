'use-strict';

/**
 * App - Application entry point
 */
function App() {
    this.loader = new THREE.STLLoader();
}

/**
 * loadStl - Function to load an stl file for rendering as a mesh
 */
App.prototype.loadStl = function() {
    var _this = this;
    this.loader.load( 'data/tissue.stl', function ( geometry ) {
        // var material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
		var material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
		var mesh = new THREE.Mesh( geometry, material );
		// mesh.castShadow = true;
		// mesh.receiveShadow = true;
		_this.scene.add( mesh );
        _this.render();
	} );
};

/**
 * initThree - Setup three.js scene
 *
 * @param {Element} container DOM element to contain the render canvas
 */
App.prototype.initThree = function(container) {
    this.scene = new THREE.Scene();
    var width = Math.max(window.innerWidth/2,600);
    var height = Math.max(window.innerHeight/2,600);
	this.camera = new THREE.PerspectiveCamera( 75, width/height, 0.1, 10000 );

	this.renderer = new THREE.WebGLRenderer();
    // this.renderer.setSize( window.innerWidth/2, window.innerHeight/2 );
	this.renderer.setSize( width, height );
	container.appendChild( this.renderer.domElement );
	this.camera.position.z = -300;
    this.camera.lookAt(new THREE.Vector3(-35.031795501708984, 197.1667938232422, -204.77346801757812));

    this.addLights();

    this.loadStl();
	this.render();
};


/**
 * addLights - Add some lights to the three.js scene
 */
App.prototype.addLights = function() {
    var directionalLight1 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight1.position.set( 1, -1, 0 );
    this.scene.add( directionalLight1 );
    var directionalLight2 = new THREE.DirectionalLight( 0xffffff, 0.5 );
    directionalLight2.position.set( 0, 1, 0 );
    this.scene.add( directionalLight2 );
    var light = new THREE.AmbientLight( 0x404040 ); // soft white light
    this.scene.add( light );
};


/**
 * render - Render the scene
 */
App.prototype.render = function() {
    this.renderer.render(this.scene, this.camera);
};
