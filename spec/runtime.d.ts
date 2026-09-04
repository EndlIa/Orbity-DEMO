import type {Object3D,Texture} from 'three';
export interface TextureDrawing {
 clearRect(x:number,y:number,width:number,height:number):void;
 strokeRect(x:number,y:number,width:number,height:number):void;
 arc(x:number,y:number,radius:number,start:number,end:number,counterclockwise?:boolean):void;
 beginPath():void;
 stroke():void;
 fillText(text:string,x:number,y:number):void;
 measureText(text:string):Readonly<{width:number}>;
 fillStyle:string;
 strokeStyle:string;
 font:string;
 textAlign:CanvasTextAlign;
 textBaseline:CanvasTextBaseline;
 lineWidth:number;
}
export interface OrbityHost {
 createTexture(size:{width:number;height:number},draw:(drawing:TextureDrawing,width:number,height:number)=>void):Texture;
}
export interface OrbityInstance {
 root:Object3D;
 tick?(dt:number):void;
 dispose():void;
}
