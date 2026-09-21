import * as THREE from 'three';

// A drawing facade: no native context, canvas, images, or pixel reads cross this API.
export function createTextureHost({maxSize=2048,maxPixels=4194304,canvasFactory=()=>document.createElement('canvas')}={}) {
  let pixels=0,closed=false;
  const owned=new Set();
  return Object.freeze({
    createTexture({width,height},draw) {
      if(closed)throw Error('Texture host is disposed');
      if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width>maxSize||height>maxSize||pixels+width*height>maxPixels)throw Error('Texture budget exceeded');
      if(typeof draw!=='function')throw TypeError('A drawing callback is required');
      const canvas=canvasFactory();canvas.width=width;canvas.height=height;
      const ctx=canvas.getContext('2d');if(!ctx)throw Error('2D drawing is unavailable');
      let active=true,operations=0;
      const check=()=>{if(!active)throw Error('Drawing session ended');if(++operations>20000)throw Error('Drawing operation budget exceeded');};
      const finite=args=>{if(!args.every(Number.isFinite))throw TypeError('Coordinates must be finite');};
      const drawing={};
      for(const name of ['clearRect','strokeRect'])drawing[name]=(...args)=>{check();finite(args);ctx[name](...args)};
      drawing.arc=(x,y,radius,start,end,counterclockwise=false)=>{check();finite([x,y,radius,start,end]);if(radius<0||typeof counterclockwise!=='boolean')throw TypeError('Invalid arc');ctx.arc(x,y,radius,start,end,counterclockwise)};
      for(const name of ['beginPath','stroke'])drawing[name]=()=>{check();ctx[name]()};
      drawing.fillText=(text,x,y)=>{check();finite([x,y]);if(typeof text!=='string'||text.length>4096)throw Error('Text limit exceeded');ctx.fillText(text,x,y)};
      drawing.measureText=text=>{check();if(typeof text!=='string'||text.length>4096)throw Error('Text limit exceeded');return Object.freeze({width:ctx.measureText(text).width})};
      for(const name of ['fillStyle','strokeStyle','font','textAlign','textBaseline'])Object.defineProperty(drawing,name,{set(value){check();if(typeof value!=='string'||value.length>256)throw TypeError('Invalid drawing style');ctx[name]=value}});
      Object.defineProperty(drawing,'lineWidth',{set(value){check();if(!Number.isFinite(value)||value<=0||value>256)throw TypeError('Invalid line width');ctx.lineWidth=value}});
      try{const result=draw(Object.freeze(drawing),width,height);if(result?.then)throw TypeError('Drawing must be synchronous')}finally{active=false}
      const image=ctx.getImageData(0,0,width,height);
      const texture=new THREE.DataTexture(new Uint8Array(image.data),width,height);texture.flipY=true;texture.generateMipmaps=true;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.needsUpdate=true;texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;pixels+=width*height;owned.add(texture);
      texture.addEventListener('dispose',()=>{if(owned.delete(texture))pixels-=width*height});
      return texture;
    },
    dispose(){if(closed)return;closed=true;for(const texture of [...owned])texture.dispose();}
  });
}
