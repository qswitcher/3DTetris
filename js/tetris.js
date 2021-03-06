Tetris = function()
{
    Game.App.call(this);
}

Tetris.prototype = new Game.App();


Tetris.prototype.init = function(param)
{
    // board dimensions
    this.boardWidth = 5;
    this.boardHeight = 12;
    this.blockBeginHeight = Math.floor(this.boardHeight/2);

    // sounds
    this.sounds = {}
    this.sounds["theme"] = document.getElementById("audio_theme");

    this.paused = false;
    this.started = false;
    this.game_over = false;

    this.container = param.container;

    // scoring
    this.setScore(0);
    this.setLines(0);

    Game.App.prototype.init.call(this, param);

    // lights
    // directional lights
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
    this.tetrisPieces = {};       // object holding all petrified tetris
                               // piece components

    this.timeSinceLastMovement = 0;
    this.timeToMove = 0.001;

    this.focus();

    this.sounds.theme.play();

}

/*
Toggles the theme music on/off
 */
Tetris.prototype.toggleMusic = function(){
    if (this.sounds.theme.paused == false) {
        this.sounds.theme.pause();
    } else {
        this.sounds.theme.play();
    }
}

/*
Resets game so that it can played again by called the 'start' method.
 */
Tetris.prototype.reset = function(){
    this.started = false;
    this.game_over = false;
    this.paused = false;

    // remove pieces from board
    for(var p in this.tetrisPieces){
        if(this.tetrisPieces.hasOwnProperty(p)){
            for(var i = 0; i < this.tetrisPieces[p].length; i++){
                this.removeObject(this.tetrisPieces[p][i]);
            }
        }
    }
    this.tetrisPieces = {}

    // remove current piece and get a new one
    this.removeObject(this.currentPiece);

    // reset scores and lines
    this.setScore(0);
    this.setLines(0);
}

Tetris.prototype.start = function(){
    this.currentPiece = this.getNewBlock();

    this.started = true;
}

Tetris.prototype.getNewBlock = function(){
    var block = new Block();
    block.init({position: new THREE.Vector3(0, this.blockBeginHeight, 0),
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
        for(var level in this.tetrisPieces){
            if(this.tetrisPieces.hasOwnProperty(level)){
                for (var i = 0; i < this.tetrisPieces[level].length; i++){
                    if( this.tetrisPieces[level][i].collides(this.currentPiece)){
                        return true;
                    }
                }
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

    /*
    Add star field
     */
    var stars = new THREE.Geometry();
    for (var i = 0; i<1000; i++) {
        var R = 5e2;
        var x = 1e3 * Math.random() - R;
        var y = 1e3 * Math.random() - R;
        var z = ((Math.round(Math.random()))*2 - 1)*Math.sqrt(R*R - x*x - y*y);
        stars.vertices.push(new THREE.Vector3(
                x, y, z
        ));
    }
    var star_stuff = new THREE.ParticleBasicMaterial();
    var star_system = new THREE.ParticleSystem(stars, star_stuff);
    this.scene.add(star_system);
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

    this.controls = new THREE.OrbitControls( this.camera, this.container );

    this.clock = new THREE.Clock();
}

Tetris.prototype.update = function()
{
    if (!this.game_over){

        if(!this.paused && this.started){
            this.controls.update(this.clock.getDelta());

            // handle any keyboard events
            this.processUserInput();

            this.timeSinceLastMovement += this.clock.getDelta();
            if ( this.timeSinceLastMovement > this.timeToMove ) {
                this.timeSinceLastMovement = 0;
                this.currentPiece.move({axis: 'y', amount: -1});

                var collision = this.testCollision();

                this.currentPiece.move({axis: 'y', amount: +1});

                if (collision){

                    // petrify block, determine if game over
                    var blocks = this.currentPiece.petrify();
                    this.removeObject(this.currentPiece);
                    for (var i = 0; i < blocks.length; i++){
                        this.addObject(blocks[i]);

                        var level = blocks[i].getPosition().y;
                        if(!this.tetrisPieces.hasOwnProperty(level)){
                            this.tetrisPieces[level] = [];
                        }
                        this.tetrisPieces[level].push(blocks[i]);

                        // increment score
                        this.addPoints(1);
                    }

                    // test if we have filled up a level
                    this.checkTetris();

                    // check for game over
                    if(this.checkGameOver()){
                        return;
                    }

                    this.currentPiece = this.getNewBlock();

                } else{
                    // else do the movement and animate
                    this.currentPiece.move({axis: 'y', amount: -1, animate: true});
                }

            }

            Game.App.prototype.update.call(this);

            TWEEN.update();
        }
    }
}

Tetris.prototype.addPoints = function(points){
    this.setScore(this.score + points);
}

Tetris.prototype.setScore = function(score){
    this.score = score;
    this.publish("SCORE_CHANGE", this.score);
}

Tetris.prototype.addLines = function(lines){
    this.setLines(this.lines + lines);
}

Tetris.prototype.setLines = function(lines){
    this.lines = lines;
    this.publish("LINE_CHANGE", this.lines);
}

/*
Checks for GAME OVER condition, returns 'true' if the game is over.
 */
Tetris.prototype.checkGameOver = function(){
    if (this.tetrisPieces.hasOwnProperty(this.blockBeginHeight)){
        this.game_over = true;
        this.publish("GAME_OVER");
        return true;
    }
    return false;
}

/*
Checks every row of board for a complete row and deletes
any complete row, awarding points.
*/
Tetris.prototype.checkTetris = function(){
    var fullLevelNum = this.boardWidth*this.boardWidth;
    for (var level in this.tetrisPieces){
        if (this.tetrisPieces.hasOwnProperty(level)){
            if (this.tetrisPieces[level].length === fullLevelNum){
                // we have a tetris, award points
                this.addPoints(100);
                this.addLines(1);

                // remove pieces
                for (var i = 0; i < this.tetrisPieces[level].length; i++){
                    this.removeObject(this.tetrisPieces[level][i]);
                }

                // reset array
                this.tetrisPieces[level] = [];

                // shift other blocks
                for (var level2 in this.tetrisPieces){
                    if(this.tetrisPieces.hasOwnProperty(level2)){
                        if (parseInt(level2, 10) > parseInt(level, 10)){
                            // lower this level
                            for(var i = 0; i < this.tetrisPieces[level2].length; i++){
                                this.tetrisPieces[level2][i].move({'axis': 'y', 'amount': -1})
                            }
                            this.tetrisPieces[level2 - 1] = this.tetrisPieces[level2];
                            this.tetrisPieces[level2] = [];
                        }
                    }
                }
            } else if(this.tetrisPieces[level].level > fullLevelNum){
                alert("Error occurred :(");
            }
        }
    }
}

/**
This is called during the update method to handle all pressed key events.
*/
Tetris.prototype.processUserInput = function(){
    if ( this.currentPiece && !this.game_over){
        for(var i = 0; i < MOVEMENT_KEYS.length; i++){
            var key = MOVEMENT_KEYS[i];
            if( Game.Key._pressed[key.code]){
                // move without animating
                this.currentPiece.move({'axis': key.axis, 'amount': key.amount});

                // test collision
                var collision = this.testCollision();

                // undo movement
                this.currentPiece.move({'axis': key.axis, 'amount': -1*key.amount});

                // if there was no collision, go ahead and do the movement with the animation.
                if (!collision){
                    this.currentPiece.move({'axis': key.axis, 'amount': key.amount, animate: true});
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
