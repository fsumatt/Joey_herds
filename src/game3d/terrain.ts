import * as T from 'three';
import { HerdSimulation } from './simulation';
const mat=(color:number)=>new T.MeshStandardMaterial({color,roughness:.9});
export function addTerrainDetails(parent:T.Group,sim:HerdSimulation){
 const mesh=(g:T.BufferGeometry,m:T.Material,p:number[],s:number[])=>{const o=new T.Mesh(g,m);o.position.set(p[0],p[1],p[2]);o.scale.set(s[0],s[1],s[2]);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;};
 const orb=new T.SphereGeometry(1,16,10),cylinder=new T.CylinderGeometry(1,1,1,16);
 for(const p of sim.ponds){
  const bank=mesh(new T.CircleGeometry(1,64),mat(0xb6b28a),[p.x,.06,p.z],[p.rx+.15,p.rz+.15,1]);bank.rotation.x=-Math.PI/2;bank.castShadow=false;
  const water=mesh(new T.CircleGeometry(1,64),new T.MeshStandardMaterial({color:0x70adb0,roughness:.3,metalness:.12}),[p.x,.068,p.z],[p.rx,p.rz,1]);water.rotation.x=-Math.PI/2;water.castShadow=false;
  const shallows=mesh(new T.RingGeometry(.76,1,64),new T.MeshBasicMaterial({color:0xa9d0c2,transparent:true,opacity:.55}),[p.x,.071,p.z],[p.rx,p.rz,1]);shallows.rotation.x=-Math.PI/2;shallows.castShadow=false;
  for(let i=0;i<4;i++){const ripple=mesh(new T.TorusGeometry(.24+i*.075,.009,4,40,Math.PI*1.35),mat(0xc6e3d5),[p.x+.35,.078,p.z+.15],[1,1,1]);ripple.position.y=.078;ripple.rotation.x=-Math.PI/2;ripple.castShadow=false;}
  for(let i=0;i<9;i++){const a=2.2+i*.14,x=p.x+Math.cos(a)*(p.rx+.16),z=p.z+Math.sin(a)*(p.rz+.16);mesh(cylinder,mat(0x758958),[x,.22,z],[.018,.34,.018]);mesh(cylinder,mat(0x8b6b45),[x,.4,z],[.034,.13,.034]);}
 }
 for(const r of sim.rocks){
  if(r.kind==='tree'){
   mesh(orb,mat(0x8a9270),[r.x,.09,r.z],[r.radius,.15,r.radius]);
   const trunk=mesh(new T.CylinderGeometry(.65,1,1,9),mat(0x8c6b4d),[r.x,.6,r.z],[r.radius*.56,1.1,r.radius*.56]);trunk.rotation.z=.04;
   for(let i=0;i<5;i++){const a=i*2.4;const leaf=mesh(orb,mat([0x739653,0x87a85e,0x9ab36b][i%3]),[r.x+Math.sin(a)*.4,1.55+(i%2)*.22,r.z+Math.cos(a)*.38],[.63,.66,.63]);leaf.rotation.y=a;}
   for(let i=0;i<5;i++){const a=i*2.4;mesh(orb,mat(0xd1885b),[r.x+Math.sin(a)*.63,1.55+(i%2)*.22,r.z+Math.cos(a)*.6],[.072,.076,.072]);}
  }else if(r.kind==='hay'){
   const bale=mesh(cylinder,mat(0xc9a553),[r.x,r.radius*.66,r.z],[r.radius*.66,r.radius*1.75,r.radius*.66]);bale.rotation.z=Math.PI/2;
   for(const offset of [-.5,.5]){const band=mesh(new T.TorusGeometry(r.radius*.67,.024,5,28),mat(0x9e803f),[r.x+offset*r.radius,r.radius*.66,r.z],[1,1,1]);band.rotation.y=Math.PI/2;}
   const end=mesh(new T.TorusGeometry(r.radius*.36,.016,4,24,Math.PI*1.8),mat(0xe3c777),[r.x+r.radius*.88,r.radius*.66,r.z],[1,1,1]);end.rotation.y=Math.PI/2;
  }else mesh(new T.DodecahedronGeometry(1),mat(0x9aa094),[r.x,r.radius*.35,r.z],[r.radius,r.radius*.65,r.radius]);
 }
}
