import * as THREE from 'three';
import { placeModels, Model, CustomScene, SnapNode, SnapNodes } from 'gameengine';

class ChessBoard {
    constructor(scene, config) {
        this.scene = scene;
        this.config = Object.assign({}, this.config, config);
        this.chessboard = new THREE.Group();
        this.scene.add(this.chessboard);
        this.addBase();
        this.addTiles();
    }
    config = {
        lightColor: "#CD853F",
        darkColor: "#8B4513",
        borderColor: "#D2B48C",
        size: 2,
        border: 2,
        baseThickness: 0.75,
        thickness: 0.25
    }
    addBase(){
        let base = {
            base: {src: {top: this.config.borderColor, dimensions: {height: this.config.baseThickness, width: 20, depth: 20}}, position: {x: -10, y: 0, z: -10}},
            label: {src: {text: "Pieces by Asif Mahmud", size: 0.25, color: 0x000000}, position: {x: -9, y: 0.6, z: 9}},
            link: {src: {text: "https://grabcad.com/library/chess-pieces-23", size: 0.25, color: 0x000000}, position: {x: -9, y: 0.6, z: 9.5}},
            label2: {src: {text: "Game by Torin Halsted", size: 0.25, color: 0x000000}, position: {x: 5.5, y: 0.6, z: 9.5}},
        }
        base = placeModels(base);
        Object.values(base).forEach((item) => this.chessboard.add(item));
    }
    addTiles() {
        let tiles = {};
        for (let x = 0; x < 8; x++){
            for (let z = 0; z < 8; z++){
                let name = `tile${x}${z}`;
                let color = (x + z) % 2 ? this.config.lightColor : this.config.darkColor;
                tiles[name] = {
                    src: {top: color, dimensions: {height: this.config.thickness, width: this.config.size, depth: this.config.size}},
                    position: {x: (x - 4) * this.config.size, y: this.config.baseThickness, z: (z - 4) * this.config.size - 0.25}
                }
            }
        }
        tiles = placeModels(tiles);
        Object.values(tiles).forEach((item) => this.chessboard.add(item));
    }
}

class ChessPieces {
    constructor(scene, config) {
        this.scene = scene;
        this.config = Object.assign({}, this.config, config);
        this.pieces = {};
        this.addPieces();
        window.p = this.pieces;
    }
    config = {
        lightColor: 0xe0e0e0,
        darkColor: 0x000000,
        size: 2,
        srcs: {
            pawn: "./assets/rook.obj",
            rook: "./assets/rook.obj",
            knight: "./assets/knight.obj",
            bishop: "./assets/bishop.obj",
            queen: "./assets/queen.obj",
            king: "./assets/king.obj",
        }
    }
    addPieces() {
        let originalPieces = Object.fromEntries(Object.entries(this.config.srcs).map(([name, src]) => [name, new Model(src)]));
        let backRow = ["rook", "knight", "bishop", "queen", "king", "bishop", "knight", "rook"]
        let usedNames = [];
        let specs = {};
        for (let [i, name] of backRow.entries()){
            for (let colorName of ["white", "black"]){
                let incPawn = 1*usedNames.includes(colorName + "pawn");
                specs[`${colorName}pawn${i}`] = {
                    id: `${colorName}pawn${i}`,
                    name: "pawn",
                    inc: incPawn,
                    src: this.config.srcs["pawn"],
                    x: (i - 4) * this.config.size,
                    z: (colorName == "white" ? 2: -3) * this.config.size,
                    color: colorName == "white" ? this.config.lightColor : this.config.darkColor,
                };

                let inc = 1*usedNames.includes(colorName + name);
                console.log(name, colorName, inc, i)
                specs[`${colorName}${name}${inc}`] = {
                    id: `${colorName}${name}${inc}`,
                    name: name,
                    inc: inc,
                    src: this.config.srcs[name],
                    x: (i - 4) * this.config.size,
                    z: (colorName == "white" ? 3 : -4) * this.config.size,
                    ry: colorName == "white" ? Math.PI : 0,
                    color: colorName == "white" ? this.config.lightColor : this.config.darkColor,
                }

                if (!inc){usedNames.push(colorName + name)}
                if (!incPawn){usedNames.push(colorName + "pawn")}
            }
        }
        console.log(specs, originalPieces)
        // Create an array of promises
        let modelPromises = Object.values(originalPieces).map(piece => piece.loadPromise);

        // Wait for all models to load
        Promise.all(modelPromises).then(() => {
            for (let [name, spec] of Object.entries(specs)){
                console.log(name, spec.name, originalPieces[spec.name].loaded)
                this.addPiece(spec);
            }
        });
        window.originalPieces = originalPieces;
    }
    addPiece(spec){
        let piece = new Model("./assets/rook.obj");
        piece.setColor(spec.color);
        piece.position.set(spec.x, 5, spec.z);
        piece.pivot.rotation.y = spec.ry;
//                piece.setSnapController(1, this.config.size, new THREE.Vector3(0.25, 0, 0));
//                piece.snap()
        this.pieces[spec.id] = piece;

//        this.scene.addModel(piece);
    }
}

class ChessSet {
    constructor(scene, boardParams, pieceParams) {
        this.scene = scene;
        boardParams = boardParams || {};
        pieceParams = pieceParams || {};
        this.board = new ChessBoard(this.scene, boardParams);
        this.pieces = new ChessPieces(this.scene, pieceParams);
    }
}

export { ChessBoard, ChessPieces, ChessSet };
