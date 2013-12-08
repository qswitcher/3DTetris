Block = function()
{
	Game.Object.call(this);
}

Block.prototype = new Game.Object();

Block.prototype.init = function(param)
{
	param = param || {boardWidth: 5, boardDepth: 5, boardHeight: 10};
	this.boardWidth = param.boardWidth;
	this.boardDepth = param.boardDepth;
	this.boardHeight = param.boardHeight;

	// set the shape, do a deep copy
	var index = (param.cube) ? 0 : Math.floor(Math.random()*Block.Shapes.length);
	var chosenShape = Block.Shapes[index];
	this.shape = new Array();
	for (var i = 0; i < chosenShape.length; i++){
		this.shape.push(chosenShape[i].slice());
	}

    var color = (param.wireframe || false)? 'white' : Block.COLORS[Math.abs(param.position.y) % Block.COLORS.length];
    var material = new THREE.MeshPhongMaterial({
     color: color,
     wireframe: param.wireframe || false,
     ambient: color
 	});

    // Create the cube geometry
    var geometry = new THREE.CubeGeometry(1, 1, 1);
	var group = new THREE.Object3D();

    // And put the geometry and material together into a mesh
    for (var i = 0; i < this.shape.length; i++){
	    var cube = new THREE.Mesh(geometry, material);
		cube.position.x = this.shape[i][0];
		cube.position.y = this.shape[i][1];
		cube.position.z = this.shape[i][2];
	    group.add(cube);
	}

	// set position
	if ( param.position){
		group.position = param.position;
	}

    this.setObject3D(group);
}

Block.prototype.petrify = function(){
	/**
	Return list of equivalent blocks?
	**/
	var cubes = new Array();
	for (var i = 0; i < this.shape.length; i++){
		var position = new THREE.Vector3();
		position.copy(this.object3D.position);
		var shape_block = this.shape[i];
		position.add(new THREE.Vector3(shape_block[0], 
									   shape_block[1],
									   shape_block[2]));
		var block = new Block();
		block.init({
			position: position,
			boardWidth: this.boardWidth,
			boardDepth: this.boardDepth,
			boardHeight: this.boardHeight,
			cube: true,
			wireframe: false,
		});
		cubes.push(block);
	}
	return cubes;
}

/**
Returns true if this block collides with another block
**/
Block.prototype.collides = function(other){
	// do fine grained detection
	for(var i = 0; i < this.shape.length; i++){
		for(var j = 0; j < other.shape.length; j++){
			var thisx = Math.floor(this.shape[i][0] + this.object3D.position.x);			
			var otherx = Math.floor(other.shape[j][0] + other.object3D.position.x);

			var thisy = Math.floor(this.shape[i][1] + this.object3D.position.y);			
			var othery = Math.floor(other.shape[j][1] + other.object3D.position.y);

			var thisz = Math.floor(this.shape[i][2] + this.object3D.position.z);			
			var otherz = Math.floor(other.shape[j][2] + other.object3D.position.z);

			if ( 
				((thisx === otherx) && (thisy === othery) && (thisz === otherz)) 
				){
				return true;
			}
		}
	}
	return false;
}

Block.prototype.update = function()
{
	Game.Object.prototype.update.call(this);
}

Block.prototype.move = function(params){
	var amount = params.amount || 1;
	var axis =  params.axis;
	this.object3D.position[axis] += +amount;
}

Block.prototype.rotate = function(params){
	/*
	Only 90 degree rotations are around, because of this,
	amount is an integer number of 90 degree rotations. e.g.
	1 -> 90 degree positive rotation, -1 -> 90 degree negative rotation
	*/
	var amount = params.amount || 1;
	var axis = params.axis;

	// rotate the object 3D
	var a = (axis === 'x') ? 1.0 : 0.0;
	var b = (axis === 'y') ? 1.0 : 0.0;
	var c = (axis === 'z') ? 1.0 : 0.0;
	var position = this.object3D.position;

	var T = new THREE.Matrix4();
	T.makeTranslation(-1*position.x, -1*position.y, -1*position.z);
	var Tr = new THREE.Matrix4();
	Tr.makeTranslation(position.x, position.y, position.z);
	var rotationMatrix = new THREE.Matrix4();
	rotationMatrix.makeRotationAxis(new THREE.Vector3(a,b,c), amount*Math.PI/2);

	var M = new THREE.Matrix4();
	M.multiplyMatrices(Tr,rotationMatrix);
	M.multiply(T);
	this.object3D.applyMatrix(M);

	// now we have to transform the 
	var prefix = (amount < 0) ? 'n' : 'p';
	var matrix = Block['R' + prefix + axis];
	var temp = 0;
	var result = [0,0,0];
	for (var i = 0; i < this.shape.length; i++){
		// do matrix multiplication
		for(var k = 0; k < 3; k++){
			temp = 0;
			for(var j = 0; j < 3; j++){
				temp += matrix[k][j]*this.shape[i][j];
			}
			result[k] = temp;
		}
		this.shape[i] = result.slice();
	}
	var message = "New coordiantes: [";
	for(var i = 0; i < this.shape.length; i++){
		message += "(" + this.shape[i] + "),";
	}
	console.log(message + "]");
}

/**
* Computes and returns an axis-aligned bounding box for collision detection purposes. 
*/
Block.prototype.getAABB = function(){
	aabb = {
		xmin: this.shape[0][0] + this.object3D.position.x,
		xmax: this.shape[0][0] + this.object3D.position.x,
		ymin: this.shape[0][1] + this.object3D.position.y,
		ymax: this.shape[0][1] + this.object3D.position.y,
		zmin: this.shape[0][2] + this.object3D.position.z,
		zmax: this.shape[0][2] + this.object3D.position.z
	};
	for(var i = 1; i < this.shape.length; i++){
		aabb.xmin = (aabb.xmin > this.shape[i][0] + this.object3D.position.x ) ? this.shape[i][0] + this.object3D.position.x : aabb.xmin;
		aabb.xmax = (aabb.xmax < this.shape[i][0] + this.object3D.position.x ) ? this.shape[i][0] + this.object3D.position.x : aabb.xmax;
		aabb.ymin = (aabb.ymin > this.shape[i][1] + this.object3D.position.y ) ? this.shape[i][1] + this.object3D.position.y : aabb.ymin;
		aabb.ymax = (aabb.ymax < this.shape[i][1] + this.object3D.position.y ) ? this.shape[i][1] + this.object3D.position.y : aabb.ymax;
		aabb.zmin = (aabb.zmin > this.shape[i][2] + this.object3D.position.z ) ? this.shape[i][2] + this.object3D.position.z : aabb.zmin;
		aabb.zmax = (aabb.zmax < this.shape[i][2] + this.object3D.position.z ) ? this.shape[i][2] + this.object3D.position.z : aabb.zmax;
	}
	return aabb;
}

Block.prototype.getPosition = function(){
	return this.object3D.position;
}

Block.Shapes = [
	[[0,0,0]],							// x  (single square)

	[[0,1,0],[0,0,0],[1,0,0],[2,0,0]],	// x--
										// xxx

	[[0,0,0],[1,0,0],[0,1,0],[1,1,0]],	// xx
										// xx

	[[-1,0,0],[0,0,0],[0,1,0],[1,1,0]],	// -xx
										// xx-

	[[-1,0,0],[0,0,0],[1,0,0],[2,0,0]],	// xxxx

	[[-1,0,0],[0,0,0],[0,1,0],[1,0,0]] 	// -x-
										// xxx


];
// TODO put shapes here

Block.COLORS = [
	0xff0000, //red
	0xffff00, //yellow
	0xff00ff, //magenta
	0x0000ff, //blue
	0x00ffff, //cyan
	0x99ff00, //lime
	0xffa500 //orange
]

Block.Rpx = [
	[1, 0, 0],
	[0, 0, -1],
	[0, 1, 0]
];
Block.Rnx = [
	[1, 0, 0],
	[0, 0, 1],
	[0, -1, 0]
];
Block.Rpy = [
	[0, 0, 1],
	[0, 1, 0],
	[-1,0, 0]
];
Block.Rny = [
	[0, 0, -1],
	[0, 1, 0],
	[1, 0, 0]
];
Block.Rpz = [
	[0, -1, 0],
	[1, 0, 0],
	[0, 0, 1]
];
Block.Rnz = [

	[0, 1, 0],
	[-1, 0, 0],
	[0, 0, 1]
];