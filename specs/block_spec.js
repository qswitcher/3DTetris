/**
 * Created with IntelliJ IDEA.
 * User: jrussom
 * Date: 12/18/13
 * Time: 11:55 PM
 * To change this template use File | Settings | File Templates.
 */

describe("Block", function(){
    it("foo", function(){
        var boardWidth = 3;
        var boardHeight = 12;

        var block = new Block();
        block.init({position: new THREE.Vector3(0,Math.floor(boardHeight/2),0),
                   boardWidth: boardWidth,
                   boardDepth: boardWidth,
                   boardHeight: boardHeight,
                   wireframe: true
               });

    });

});