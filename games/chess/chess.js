import * as THREE from 'three';
import { placeModels, Model, CustomScene, SnapNode, SnapNodes } from 'gameengine';


function makeChessBoard(lightColor = "#CD853F", darkColor = "#8B4513", borderColor = "#D2B48C", size = 2, border = "size",
                   baseThickness = 0.75, thickness = 0.25){
    border = (border === "size") ? size: border;
    let tileColors = [lightColor, darkColor];

    let squares = [...Array(8).keys()].map((row) => {
        return [...Array(8).keys()].map((column) => {
            let color = tileColors[((row + column) % 2)];
            let position = {x: (column - 4) * size, y: baseThickness, z: (row - 4) * size - 0.25};

            return {
                src: {"top": color, dimensions: {height: thickness, width: size, depth: size}},
                position: position
            };
        });
    })
    let listOfSquares = squares.flat();
    let elements = listOfSquares.reduce((acc, square, index) => {
        let columnLetter = String.fromCharCode((index % 8) + 65);
        let rowNumber = Math.floor(index / 8) + 1;

        acc[`${columnLetter}${rowNumber}`] = square;
        return acc;
    }, {});


    elements.base = {src: {"top": borderColor, dimensions: {height: baseThickness, width: 20, depth: 20}}, position: {x: -10, y: 0, z: -10}};
    elements.label = {src: {text: "Pieces by Asif Mahmud", size: 0.25, color: darkColor}, position: {x: -9, y: 0.6, z: 9}};
    elements.link = {src: {text: "https://grabcad.com/library/chess-pieces-23", size: 0.25, color: darkColor}, position: {x: -9, y: 0.6, z: 9.5}};
    elements.label2 = {src: {text: "Game by Torin Halsted", size: 0.25, color: darkColor}, position: {x: 5.5, y: 0.6, z: 9}};
    elements.link2 = {src: {text: " https://modularizer.github.io/gameboard/games/chess/chess.html", size: 0.25, color: darkColor}, position: {x: 1, y: 0.6, z: 9.5}};

    let chessboardPieces = placeModels(elements);
    let chessboard = new THREE.Group();
    Object.values(chessboardPieces).map((piece) => {chessboard.add(piece)});
    chessboard.snapNodes = new SnapNodes(listOfSquares.map((square) => {new SnapNode(square.position.x, square.position.y, square.position.z)}));
    return chessboard;
}


function makeChessPieces(white = 0xe0e0e0, black = 0x000000, size = 2){
    const srcs = {
        pawn: "./assets/pawn.obj",
        rook: "./assets/rook.obj",
        knight: "./assets/knight.obj",
        bishop: "./assets/bishop.obj",
        queen: "./assets/queen.obj",
        king: "./assets/king.obj",
    }
    const y = 1;
    const chessPieceLocations = {
        whiteRook1: {src: srcs.rook, position: {x: -4 * size, y: y, z: -4 * size}},
        whiteKnight1: {src: srcs.knight, position: {x: -3 * size, y: y, z: -4 * size}},
        whiteBishop1: {src: srcs.bishop, position: {x: -2 * size, y: y, z: -4 * size}},
        whiteQueen: {src: srcs.queen, position: {x: -1 * size, y: y, z: -4 * size}},
        whiteKing: {src: srcs.king, position: {x: 0 * size, y: y, z: -4 * size}},
        whiteBishop2: {src: srcs.bishop, position: {x: 1 * size, y: y, z: -4 * size}},
        whiteKnight2: {src: srcs.knight, position: {x: 2 * size, y: y, z: -4 * size}},
        whiteRook2: {src: srcs.rook, position: {x: 3 * size, y: y, z: -4 * size}},
    }
    for (let [k, v] of Object.entries(chessPieceLocations)){
        chessPieceLocations[k.replace("white", "black")] = {src: v.src, position: {x: v.position.x, y: 1, z: 3 * size}};
    }
    for (let i = 0; i < 8; i++){
        chessPieceLocations[`whitePawn${i + 1}`] = {src: srcs.pawn, position: {x: (i - 4) * size, y: y, z: -3 * size}};
        chessPieceLocations[`blackPawn${i + 1}`] = {src: srcs.pawn, position: {x: (i - 4) * size, y: y, z: 2 * size}};
    }
    var pieces = placeModels(chessPieceLocations);
    for (let [name, model] of Object.entries(pieces)){
        if (name.startsWith("black")){
            model.pivot.rotation.set(0, Math.PI, 0);
        }
    }


    console.warn({pieces});
    for (let [name, model] of Object.entries(pieces)){
        if (name.startsWith("white")){
            model.setColor(white);
        } else if (name.startsWith("black")){
            model.setColor(black);
        }
        model.setSnapController(y, 2, new THREE.Vector3(0.25, 0, 0));
    }
    return pieces;
}


function makeChessSet(lightColor = "#CD853F", darkColor = "#8B4513", borderColor = "#D2B48C", white = 0xe0e0e0, black = 0x404040,
                      size = 2, border = "size", baseThickness = 0.75, thickness = 0.25){
    let chessboard = makeChessBoard(lightColor, darkColor, borderColor, size, border, baseThickness, thickness);
    let chessPieces = makeChessPieces(white, black, size);

    let chessSet = {board: chessboard, pieces: chessPieces};
    chessSet.addToScene = (scene) => {
        scene.add(chessboard);
        for (let [name, model] of Object.entries(chessPieces)){
            scene.addItem(model);
        }
    }
    window.addEventListener('load', ()=>{
        let setSnaps = ()=>{
            console.log("setting snap controllers");
            Object.values(chessSet.pieces).forEach(piece => {piece.setSnapController(1, 2, new THREE.Vector3(0.25, 0, 0));piece.snap();});
        }
        setTimeout(setSnaps, 3000);
        setTimeout(setSnaps, 6000);
    })
    return chessSet;
}

export {makeChessBoard, makeChessPieces, makeChessSet}