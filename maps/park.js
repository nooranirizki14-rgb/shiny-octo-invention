function DDpark(n,t=!1){
let{L:e,box:s,slab:i,wallX:o,wallZ:a,stairs:l,rail:r,cyl:c,sphere:h,ring:d,spawn:f,sniper:g,pickup:v,planes:T,birds:q,prop:J,breakable:U,mesh:S,scene:N,addGeo:M,collider:C2}=n;
let bnd=70;
e.key="park";
e.playerStart.set(0,2,46);
e.bounds={minX:-bnd,maxX:bnd,minZ:-bnd,maxZ:bnd};
e.style={paper:[.93,.95,1],lines:0,inks:[[.05,.22,.72],[.85,.14,.22],[.22,.18,.20],[.96,.52,.08],[.08,.55,.42],[.92,.42,.58]]};
function pad(px,py,pz,pw,pd,ink){s(px,py,pz,pw,.8,pd,{ink:ink??k.BLUE});s(px,py-.5,pz,pw*.7,.5,pd*.7,{noCollide:!0,ink:k.BLACK})}
pad(0,0,46,6,6,k.BLUE);
pad(0,0,40,4,4);pad(0,0,34.5,3.5,3.5,k.GREEN);pad(2.5,.8,29.5,3,3);pad(-1,1.6,25,3,3,k.GREEN);
s(0,1.2,19.5,1.2,.5,7,{ink:k.ORANGE});
pad(0,2,14,4,4);pad(-3.5,2,9.5,2.6,2.6,k.GREEN);pad(-3.5,2,4.5,2.6,2.6);pad(0,2.6,.5,3,3);
s(4,2.2,-4,9,.5,1.2,{ink:k.ORANGE});
pad(9,3,-8,3.5,3.5,k.GREEN);pad(9,4,-13.5,3,3);pad(5.5,4.5,-17.5,2.6,2.6);
s(0,4.1,-20.5,8,.5,1.2,{ink:k.ORANGE});
pad(-5,5,-24,3.5,3.5,k.GREEN);pad(-5,6,-29.5,3,3);pad(-1.5,6,-33.5,2.6,2.6);pad(-1.5,6,-38.5,2.6,2.6,k.GREEN);
s(-1.5,5.6,-43,1.2,.5,7,{ink:k.ORANGE});
pad(-1.5,6,-48,5,5);pad(-1.5,6,-54,6,6,k.GREEN);
c(-5.5,6,-56,.2,5,{ink:k.BLACK});c(2.5,6,-56,.2,5,{ink:k.BLACK});
s(-1.5,10.6,-56,9,1.2,.4,{ink:k.RED});
s(-1.5,8.6,-55.8,6,.1,.1,{noCollide:!0,ink:k.ORANGE});
d(-1.5,10.6,-55.7,"z");
e.parkCp=[{x:0,y:2,z:46},{x:0,y:4,z:14},{x:9,y:5,z:-8},{x:-5,y:7,z:-24},{x:-1.5,y:8,z:-48}];
e.parkRings=[];
for(let cp of e.parkCp){
let rg=new w.Group;
rg.add(S(new w.TorusGeometry(1.6,.14,8,24),k.ORANGE));
rg.position.set(cp.x,cp.y+1.6,cp.z);N.add(rg);e.meshes.push(rg);e.parkRings.push(rg);
e.animated.push({mesh:rg,update:(j)=>{rg.rotation.y=j*1.4}});
}
for(let[bx,by,bz]of[[-8,0,30],[8,1,20],[-10,2,0],[12,3,-20],[4,4,-34],[-9,5,-44]]){
h(bx,by+8,bz,2.2,{seg:8});c(bx,by,bz,.3,8,{ink:k.GREEN});
}
function crateB(bx,by,bz,bhp){U("crate",bx,by,bz,1.2,1.2,1.2,function(W){W.add(S(new w.BoxGeometry(1.2,1.2,1.2).translate(0,.6,0),k.BLUE));for(let bu of[-1,1]){W.add(S(new w.BoxGeometry(1.24,.14,.14).translate(0,.6+bu*.35,.6),k.BLACK))}},{hp:bhp||30,ink:k.BLUE})}
crateB(1.5,.8,45);crateB(-6.5,5.8,-24);
f(0,2,46);f(-2,2,46);f(2,2,46);f(0,4,14);f(9,5,-8);f(-5,7,-24);f(-1.5,8,-48);f(0,2,40);f(2.5,2.8,29.5);f(-3.5,4,9.5);f(0,4.6,.5);f(5.5,6.5,-17.5);
g(0,4,14);g(9,5,-8);g(-5,7,-24);g(-1.5,8,-48);g(0,2,40);
v(0,1.5,40);v(0,3.5,25);v(0,3.5,14);v(9,4.5,-8);v(-5,6.5,-24);v(-1.5,7.5,-33.5);v(-1.5,7.5,-48);v(2.5,2.3,29.5);
if(t){for(let[ax,ay,az]of[[0,2,46],[-2,2,46],[2,2,46],[0,4,14],[9,5,-8],[-5,7,-24],[-1.5,8,-48],[0,2,40],[2.5,2.8,29.5],[-3.5,4,9.5],[0,4.6,.5],[5.5,6.5,-17.5],[-1.5,7.5,-38.5],[9,5,-13.5]]){e.arenaSpawns.push(new w.Vector3(ax,ay,az))}
T(3,30,0,{scale:1.5,rStep:14,hStep:6,speed:.12,ink:k.RED});q(5,36,-10,{rStep:12,hStep:5,scale:1.2,ink:k.BLACK})}
if(!t){q(3,34,-10,{rStep:9,hStep:5,scale:1.2,ink:k.BLACK})}
h(60,90,-160,11,{seg:12});
for(let[clx,cly,clz,clk]of[[60,70,-170,1],[-150,65,40,1.1],[30,80,180,1.2]]){for(let cn=0;cn<6;cn++){h(clx+(cn-2.5)*5*clk,cly+Math.sin(cn*1.7)*2.5*clk,clz,(4+cn%3)*clk,{seg:10})}}
return n.finish();
}
