THREE.STLExport = function (scene) {

var vector = new THREE.Vector3();
var normalMatrixWorld = new THREE.Matrix3();

	var output = '';
	output += 'solid exported\n';
	scene.updateMatrixWorld();

	if(window.camera == undefined) {
		scene.traverse(function(object) {
			if(object instanceof THREE.PerspectiveCamera) {
				window.camera = object;
			}
		});
	}

	scene.traverse( function ( object ) {
		if ( object instanceof THREE.Mesh ) {

			// if object is hidden - exit
			if(object.visible == false) return; 

			var geometry = object.geometry;
			var matrixWorld = object.matrixWorld;
			var mesh = object;
			object.updateMatrixWorld();

			if(geometry instanceof THREE.BufferGeometry)
				geometry = new THREE.Geometry().fromBufferGeometry(geometry)

			if ( geometry instanceof THREE.Geometry) {

				var vertices = geometry.vertices;
				var faces = geometry.faces;
				normalMatrixWorld.getNormalMatrix( matrixWorld );

				if(typeof faces != 'undefined'){
					for ( var i = 0, l = faces.length; i < l; i ++ ) {
						var face = faces[ i ];

						vector.copy( face.normal ).applyMatrix3( normalMatrixWorld ).normalize();

						output += '\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
						output += '\t\touter loop\n';

						var indices = [ face.a, face.b, face.c ];


						for ( var j = 0; j < 3; j ++ ) {
							var vertexIndex = indices[ j ];
							if (typeof geometry.skinIndices !== 'undefined' && geometry.skinIndices.length == 0) {
								vector.copy( vertices[ vertexIndex ] );

								output += '\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
							} else {
								vector.copy( vertices[ vertexIndex ] );
								
								var boneIndices = [
									geometry.skinIndices[vertexIndex].x,
									geometry.skinIndices[vertexIndex].y,
									geometry.skinIndices[vertexIndex].z,
									geometry.skinIndices[vertexIndex].w
								];
								
								var weights = [
									geometry.skinWeights[vertexIndex].x,
									geometry.skinWeights[vertexIndex].y,
									geometry.skinWeights[vertexIndex].z,
									geometry.skinWeights[vertexIndex].w
								];
								
								var inverses = [
									skeleton.boneInverses[ boneIndices[0] ],
									skeleton.boneInverses[ boneIndices[1] ],
									skeleton.boneInverses[ boneIndices[2] ],
									skeleton.boneInverses[ boneIndices[3] ]
								];

								var skinMatrices = [
									skeleton.bones[ boneIndices[0] ].matrixWorld,
									skeleton.bones[ boneIndices[1] ].matrixWorld,
									skeleton.bones[ boneIndices[2] ].matrixWorld,
									skeleton.bones[ boneIndices[3] ].matrixWorld
								];

								//this checks to see if the mesh has any morphTargets
								if (geometry.morphTargets !== 'undefined') {										
									var morphMatricesX = [];
									var morphMatricesY = [];
									var morphMatricesZ = [];
									var morphMatricesInfluence = [];

									for (var mt = 0; mt < geometry.morphTargets.length; mt++) {
										//collect the needed vertex info
										morphMatricesX[mt] = geometry.morphTargets[mt].vertices[vertexIndex].x;
										morphMatricesY[mt] = geometry.morphTargets[mt].vertices[vertexIndex].y;
										morphMatricesZ[mt] = geometry.morphTargets[mt].vertices[vertexIndex].z;
										morphMatricesInfluence[mt] = morphTargetInfluences[mt];
									}
								}
								
								var finalVector = new THREE.Vector4();

								if (mesh.geometry.morphTargets !== 'undefined') {

									var morphVector = new THREE.Vector4(vector.x, vector.y, vector.z);

									for (var mt = 0; mt < geometry.morphTargets.length; mt++) {
										morphVector.lerp(new THREE.Vector4(morphMatricesX[mt], morphMatricesY[mt], morphMatricesZ[mt], 1), morphMatricesInfluence[mt]);
									}

								}

								for (var k = 0; k < 4; k++) {

									var tempVector = new THREE.Vector4(vector.x, vector.y, vector.z);
									tempVector.multiplyScalar(weights[k]);
									tempVector.applyMatrix4(inverses[k])
									.applyMatrix4(skinMatrices[k]);
									finalVector.add(tempVector);

								}

								output += '\t\t\tvertex ' + finalVector.x + ' ' + finalVector.y + ' ' + finalVector.z + '\n';
							}
						}
						output += '\t\tendloop\n';
						output += '\tendfacet\n';
					}
				}
			}
		}

	} );

	output += 'endsolid exported\n';

	return output;
};

THREE.STLExportObject = function (object) {
console.log('exporting', object);
var vector = new THREE.Vector3();
var normalMatrixWorld = new THREE.Matrix3();

	var output = '';
	output += 'solid exported\n';
	object.updateMatrixWorld();
	
		object.traverse( function ( object ) {
		if ( object instanceof THREE.Mesh ) {

			// if object is hidden - exit
			if(object.visible == false) return; 

			var geometry = object.geometry;
			var matrixWorld = object.matrixWorld;
			var mesh = object;
			object.updateMatrixWorld();

			if(geometry instanceof THREE.BufferGeometry)
				geometry = new THREE.Geometry().fromBufferGeometry(geometry)

			if ( geometry instanceof THREE.Geometry) {

				var vertices = geometry.vertices;
				var faces = geometry.faces;
				normalMatrixWorld.getNormalMatrix( matrixWorld );

				if(typeof faces != 'undefined'){
					for ( var i = 0, l = faces.length; i < l; i ++ ) {
						var face = faces[ i ];

						vector.copy( face.normal ).applyMatrix3( normalMatrixWorld ).normalize();

						output += '\tfacet normal ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
						output += '\t\touter loop\n';

						var indices = [ face.a, face.b, face.c ];


						for ( var j = 0; j < 3; j ++ ) {
							var vertexIndex = indices[ j ];
							if (typeof geometry.skinIndices !== 'undefined' && geometry.skinIndices.length == 0) {
								vector.copy( vertices[ vertexIndex ] );

								output += '\t\t\tvertex ' + vector.x + ' ' + vector.y + ' ' + vector.z + '\n';
							} else {
								vector.copy( vertices[ vertexIndex ] );
								
								var boneIndices = [
									geometry.skinIndices[vertexIndex].x,
									geometry.skinIndices[vertexIndex].y,
									geometry.skinIndices[vertexIndex].z,
									geometry.skinIndices[vertexIndex].w
								];
								
								var weights = [
									geometry.skinWeights[vertexIndex].x,
									geometry.skinWeights[vertexIndex].y,
									geometry.skinWeights[vertexIndex].z,
									geometry.skinWeights[vertexIndex].w
								];
								
								var inverses = [
									skeleton.boneInverses[ boneIndices[0] ],
									skeleton.boneInverses[ boneIndices[1] ],
									skeleton.boneInverses[ boneIndices[2] ],
									skeleton.boneInverses[ boneIndices[3] ]
								];

								var skinMatrices = [
									skeleton.bones[ boneIndices[0] ].matrixWorld,
									skeleton.bones[ boneIndices[1] ].matrixWorld,
									skeleton.bones[ boneIndices[2] ].matrixWorld,
									skeleton.bones[ boneIndices[3] ].matrixWorld
								];

								//this checks to see if the mesh has any morphTargets
								if (geometry.morphTargets !== 'undefined') {										
									var morphMatricesX = [];
									var morphMatricesY = [];
									var morphMatricesZ = [];
									var morphMatricesInfluence = [];

									for (var mt = 0; mt < geometry.morphTargets.length; mt++) {
										//collect the needed vertex info
										morphMatricesX[mt] = geometry.morphTargets[mt].vertices[vertexIndex].x;
										morphMatricesY[mt] = geometry.morphTargets[mt].vertices[vertexIndex].y;
										morphMatricesZ[mt] = geometry.morphTargets[mt].vertices[vertexIndex].z;
										morphMatricesInfluence[mt] = morphTargetInfluences[mt];
									}
								}
								
								var finalVector = new THREE.Vector4();

								if (mesh.geometry.morphTargets !== 'undefined') {

									var morphVector = new THREE.Vector4(vector.x, vector.y, vector.z);

									for (var mt = 0; mt < geometry.morphTargets.length; mt++) {
										morphVector.lerp(new THREE.Vector4(morphMatricesX[mt], morphMatricesY[mt], morphMatricesZ[mt], 1), morphMatricesInfluence[mt]);
									}

								}

								for (var k = 0; k < 4; k++) {

									var tempVector = new THREE.Vector4(vector.x, vector.y, vector.z);
									tempVector.multiplyScalar(weights[k]);
									tempVector.applyMatrix4(inverses[k])
									.applyMatrix4(skinMatrices[k]);
									finalVector.add(tempVector);

								}

								output += '\t\t\tvertex ' + finalVector.x + ' ' + finalVector.y + ' ' + finalVector.z + '\n';
							}
						}
						output += '\t\tendloop\n';
						output += '\tendfacet\n';
					}
				}
			}
		}

	} );

	output += 'endsolid exported\n';

	return output;
};
