Tetris = function()
{
	Game.App.call(this);
}

Tetris.prototype = new Game.App();

Tetris.prototype.init = function(param)
{
	this.boardWidth = 5;
	this.boardHeight = 12;

	Game.App.prototype.init.call(this, param);

	// one light above
	this.toplight = new THREE.DirectionalLight( 0xffffff, 1);
	this.toplight.position.set(0, 1, 0);
	this.scene.add(this.toplight);		

	this.frontlight = new THREE.DirectionalLight( 0xffffff, 1);
	this.frontlight.position.set(0, 0, 1);
	this.scene.add(this.frontlight);

	// ambient light
	this.ambient = new THREE.AmbientLight( 0x0f0f0f, 1);
	this.scene.add(this.ambient);

	this.createCameraControls();

	this.createEnvironment();

	// initialize blocks
	this.tetrisPieces = new Array();
	this.currentPiece = this.getNewBlock();

	this.timeSinceLastMovement = 0;
	this.timeToMove = 0.001;

	this.focus();
}

Tetris.prototype.getNewBlock = function(){
	var block = new Block();
	block.init({position: new THREE.Vector3(0,Math.floor(this.boardHeight/2),0),
				boardWidth: this.boardWidth,
				boardDepth: this.boardWidth,
				boardHeight: this.boardHeight,
				wireframe: true
			});
	this.addObject(block);
	return block;
}

Tetris.prototype.testCollision = function()
{
	if ( !this.game_over){
		// get AABB of piece
		var aabb = this.currentPiece.getAABB();
		var h = Math.floor(this.boardWidth/2);
		// did the piece hit a wall or bottom?
		if ( 
			aabb.ymin < -Math.floor(this.boardHeight/2) ||
			aabb.xmax > h ||
			aabb.xmin < -h ||
			aabb.zmax > h ||
			aabb.zmin < -h
			){
			return true;
		}

		// did it hit another block?
		for(var i = 0; i < this.tetrisPieces.length; i++){
			if( this.tetrisPieces[i].collides(this.currentPiece)){
				return true;
			}
		}
	}
	return false;
}

Tetris.prototype.createEnvironment = function()
{
	/*
	Draw wireframe grid
	*/
	var wireFrameMaterial = new THREE.LineDashedMaterial({
		color: 0xaaffff
	});

	var geometry = this.square(1);
	var cube;
	for(var i = 0; i < this.boardWidth; i++){
		for(var j = 0; j < this.boardWidth; j++){

			for(var k = 0; k < 2; k++){
				cube = new THREE.Line(geometry, wireFrameMaterial);
				cube.position.x = i - Math.floor(this.boardWidth/2);
				cube.position.z = j - Math.floor(this.boardWidth/2);
				cube.position.y = this.boardHeight*k - Math.floor(this.boardHeight/2);
				this.scene.add(cube);
			}
		}
	}
}

Tetris.prototype.square = function( size ){
	var h = size * 0.5 ;

	var geometry = new THREE.Geometry();
	geometry.vertices.push( new THREE.Vector3( -h, -h, -h) );
	geometry.vertices.push( new THREE.Vector3(  h, -h, -h) );
	geometry.vertices.push( new THREE.Vector3(  h, -h,  h) );
	geometry.vertices.push( new THREE.Vector3( -h, -h,  h) );
	geometry.vertices.push( new THREE.Vector3( -h, -h, -h) );
	return geometry;
}


Tetris.prototype.createCameraControls = function()
{
	// move the camera back a bit
	this.camera.position.z = 20;

	var controls = new THREE.OrbitControls( this.camera );
	//controls.addEventListener('change', function(){});
	// controls.movementSpeed = 13;
	// controls.lookSpeed = 0.1;

	// controls.lookVertical = false;
	this.controls = controls;

	this.clock = new THREE.Clock();
}

Tetris.prototype.update = function()
{
	this.controls.update(this.clock.getDelta());

	// handle any keyboard events
	this.processUserInput();

	this.timeSinceLastMovement += this.clock.getDelta();
	if ( this.timeSinceLastMovement > this.timeToMove ) {
		this.timeSinceLastMovement = 0;
		this.currentPiece.move({axis: 'y', amount: -1});

		if ( this.testCollision()){
			this.currentPiece.move({axis: 'y', amount: +1});

			// petrify block, determine if game over
			var blocks = this.currentPiece.petrify();
			this.removeObject(this.currentPiece);
			for (var i = 0; i < blocks.length; i++){
				this.addObject(blocks[i]);
			}
			this.tetrisPieces = this.tetrisPieces.concat(blocks);

			// test if we have filled up a level


			this.currentPiece = this.getNewBlock();
			//this.game_over = true;
		}

	}

	Game.App.prototype.update.call(this);
}


/**
This is called during the update method to handle all pressed key events.
*/
Tetris.prototype.processUserInput = function(){
	if ( this.currentPiece && !this.game_over){
		for(var i = 0; i < MOVEMENT_KEYS.length; i++){
			var key = MOVEMENT_KEYS[i];
			if( Game.Key._pressed[key.code]){
				this.currentPiece.move({'axis': key.axis, 'amount': key.amount});

				// if a collision occurs due to this movement, undo the movement
				if (this.testCollision()){
					this.currentPiece.move({'axis': key.axis, 'amount': -1*key.amount});
				}
			}

		}

		for(var i = 0; i < ROTATION_KEYS.length; i++){
			var key = ROTATION_KEYS[i];
			if (Game.Key._pressed[key.code]){
				this.currentPiece.rotate({'axis': key.axis, 'amount': key.amount});

				if (this.testCollision()){
					this.currentPiece.rotate({'axis': key.axis, 'amount': -1*key.amount});
				}
			}
		}
		Game.Key._pressed = {};
	}
}


Tetris.prototype.handleKeyDown = function(keycode, charcode)
{
	if ( this.currentPiece ){
		Game.Key._pressed[keycode] = true;
	}
}

MOVEMENT_KEYS = [
	{code: Game.KeyCodes.KEY_UP, name: "KEY_UP", axis: 'z', amount: -1},
	{code: Game.KeyCodes.KEY_DOWN, name: "KEY_DOWN", axis: 'z', amount: 1},
	{code: Game.KeyCodes.KEY_LEFT, name: "KEY_LEFT", axis: 'x', amount: -1},
	{code: Game.KeyCodes.KEY_RIGHT, name: "KEY_RIGHT", axis: 'x', amount: 1},
	{code: Game.KeyCodes.KEY_SPACE, name: "KEY_SPACE", axis: 'y', amount: -1 }
	];

ROTATION_KEYS = [
	{code: Game.KeyCodes.KEY_Q, name: "KEY_Q", axis: 'x', amount: -1},
	{code: Game.KeyCodes.KEY_A, name: "KEY_A", axis: 'x', amount:  1},
	{code: Game.KeyCodes.KEY_W, name: "KEY_W", axis: 'y', amount: -1},
	{code: Game.KeyCodes.KEY_S, name: "KEY_S", axis: 'y', amount:  1},
	{code: Game.KeyCodes.KEY_E, name: "KEY_E", axis: 'z', amount: -1},
	{code: Game.KeyCodes.KEY_D, name: "KEY_D", axis: 'z', amount:  1}

];
