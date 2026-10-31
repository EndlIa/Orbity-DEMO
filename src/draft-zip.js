// Uncompressed ZIP: keeps source bytes intact and requires no runtime dependency.
export function createDraftZip(files) {
  const encoder=new TextEncoder(), chunks=[], directory=[];
  let offset=0;
  const u16=(view,at,value)=>view.setUint16(at,value,true);
  const u32=(view,at,value)=>view.setUint32(at,value,true);
  for(const [name,content] of Object.entries(files)) {
    const path=encoder.encode(name),data=encoder.encode(content);
    let crc=0xffffffff;
    for(const byte of data){crc^=byte;for(let bit=0;bit<8;bit++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
    crc=(crc^0xffffffff)>>>0;
    const header=new Uint8Array(30+path.length),v=new DataView(header.buffer);
    u32(v,0,0x04034b50);u16(v,4,20);u16(v,6,0x800);u16(v,12,0x21);u32(v,14,crc);u32(v,18,data.length);u32(v,22,data.length);u16(v,26,path.length);header.set(path,30);
    const central=new Uint8Array(46+path.length),c=new DataView(central.buffer);
    u32(c,0,0x02014b50);u16(c,4,20);u16(c,6,20);u16(c,8,0x800);u16(c,14,0x21);u32(c,16,crc);u32(c,20,data.length);u32(c,24,data.length);u16(c,28,path.length);u32(c,42,offset);central.set(path,46);
    chunks.push(header,data);directory.push(central);offset+=header.length+data.length;
  }
  const directorySize=directory.reduce((sum,item)=>sum+item.length,0),end=new Uint8Array(22),e=new DataView(end.buffer);
  u32(e,0,0x06054b50);u16(e,8,directory.length);u16(e,10,directory.length);u32(e,12,directorySize);u32(e,16,offset);
  const result=new Uint8Array(offset+directorySize+end.length);let cursor=0;
  for(const chunk of [...chunks,...directory,end]){result.set(chunk,cursor);cursor+=chunk.length;}
  return result;
}
