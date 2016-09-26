function MeshCut() {
}

/**
 * Generate a new geometry that only contains the triangles which intersect the z=0 plane
 * @param {THREE.BufferGeometry} geometry Source geometry
 * @return {THREE.BufferGeometry}  Resulting geometry
 */
MeshCut.trimMeshToPlane = function(geometry) {
    console.log('trim');
    var pos = geometry.attributes.position.array;
    var posArr = [];
    for (var i=0;i<pos.length;i+=9) {
        var above = false;
        var below = false;
        above = pos[i+2] > 0 || pos[i+5] > 0 || pos[i+8] > 0;
        //TODO equal check for z = 0
        below = pos[i+2] < 0 || pos[i+5] < 0 || pos[i+8] < 0;
        if (above && below) {
            for (var j=0;j<9;j++) {
                posArr.push(pos[i+j]);
            }
        }
    }

    var cutGeometry = new THREE.BufferGeometry();
    var vertices = new Float32Array( posArr );
    cutGeometry.addAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );
    cutGeometry.computeBoundingSphere();
    return cutGeometry;
};


/**
 * In non degenerate cases there will always be two edges of the triange
 * that cross the plane when they are intersecting.
 * @param {[Number,Number,Number]} z The three z coordinates of the triangle points
 * @return {[Number,Number]} Two crossing point indexes
 */
MeshCut.findCrossingOffsets = function(z) {
    var crossings = [];
    for (var i=0;i<3;i++) {
        if (Math.sign(z[i]) != Math.sign(z[(i+1)%3])) {
            crossings.push(i);
        }
    }
    if (crossings.length != 2) {
        return null;
    } else {
        return crossings;
    }
};


/**
 * Find the point on the edge where it crosses the image plane.
 *
 * @param {Number} offset Offset to the point index within the triangle
 * @param {Float32Array} pos    Position array from mesh
 * @param {Number} i      Current index in pos array (start of the triangle)
 * @param {Number} width  Width of the image
 * @param {Number} height Height of the image
 * @return {[Number,Number]} Coordinates of crossing point (z is 0)
 */
MeshCut.findCrossingPoint = function(offset, pos, i, width, height) {

    var offsetMap = [
        [0, 3],
        [3, 6],
        [6, 0]
    ];
    var posOffset = 0.5;
    var z0 = pos[i+offsetMap[offset][0]+2];
    var z1 = pos[i+offsetMap[offset][1]+2];
    var t = (0-z0)/(z1-z0);

    var px0 = pos[i+offsetMap[offset][0]];
    var px1 = pos[i+offsetMap[offset][1]];
    var x0 = (posOffset + px0) * width;
    var x1 = (posOffset + px1) * width;
    var dx = x1 - x0;

    var py0 = pos[i+offsetMap[offset][0]+1];
    var py1 = pos[i+offsetMap[offset][1]+1];
    var y0 = (1-(posOffset + py0)) * height;
    var y1 = (1-(posOffset + py1)) * height;
    var dy = y1 - y0;

    return [x0 + dx * t, y0 + dy * t];
};
