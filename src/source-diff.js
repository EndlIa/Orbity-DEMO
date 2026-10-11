// Bounded line diff for reviewed adapter recipes. Large arbitrary files are not diffed.
export function diffSource(before,after){
 const a=before.split('\n'),b=after.split('\n');
 if(a.length*b.length>2000000)throw Error('源码过大，无法生成逐行差异。');
 const width=b.length+1,table=new Uint32Array((a.length+1)*width);
 for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--)table[i*width+j]=a[i]===b[j]?1+table[(i+1)*width+j+1]:Math.max(table[(i+1)*width+j],table[i*width+j+1]);
 const rows=[];let i=0,j=0;
 while(i<a.length||j<b.length){
  if(i<a.length&&j<b.length&&a[i]===b[j]){rows.push({kind:'context',before:i+1,after:j+1,text:a[i]});i++;j++;}
  else if(j<b.length&&(i===a.length||table[i*width+j+1]>=table[(i+1)*width+j])){rows.push({kind:'add',before:null,after:j+1,text:b[j]});j++;}
  else{rows.push({kind:'remove',before:i+1,after:null,text:a[i]});i++;}
 }
 return rows;
}
export function unifiedPatch(before,after,oldPath,newPath){
 const oldLines=before.endsWith('\n')?before.slice(0,-1):before,newLines=after.endsWith('\n')?after.slice(0,-1):after;
 const rows=diffSource(oldLines,newLines);
 let patch=`--- a/${oldPath}\n+++ b/${newPath}\n@@ -1,${oldLines.split('\n').length} +1,${newLines.split('\n').length} @@\n`;
 for(const row of rows){patch+=`${row.kind==='add'?'+':row.kind==='remove'?'-':' '}${row.text}\n`;if((row.kind!=='add'&&row.before===oldLines.split('\n').length&&!before.endsWith('\n'))||(row.kind!=='remove'&&row.after===newLines.split('\n').length&&!after.endsWith('\n')))patch+='\\ No newline at end of file\n';}
 return patch;
}
