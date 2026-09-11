function DDschool(n,t=!1){
let{L:e,box:s,slab:i,wallX:o,wallZ:a,stairs:l,rail:r,cyl:c,sphere:h,ring:d,spawn:f,sniper:g,pickup:v,planes:T,birds:q,prop:J,breakable:U,mesh:S,scene:N,addGeo:M,collider:C2}=n;
let bnd=t?56:48;
e.key="school";
e.playerStart.set(0,1,34);
e.bounds={minX:-bnd,maxX:bnd,minZ:-bnd,maxZ:bnd};
e.style={paper:[.96,.94,.86],lines:0,inks:[[.05,.22,.72],[.85,.14,.22],[.22,.18,.20],[.96,.52,.08],[.08,.55,.42],[.92,.42,.58]]};
s(0,-2,0,2*bnd+16,2,2*bnd+16,{ink:k.GREEN});
s(0,0.02,24,46,.06,26,{noCollide:!0,ink:k.BLUE});
s(0,0.04,24,46,.03,.6,{noCollide:!0,ink:k.BLACK});
s(0,0,-bnd,2*bnd+16,8,4);s(0,0,bnd,2*bnd+16,8,4);s(-bnd,0,0,4,8,2*bnd+16);s(bnd,0,0,4,8,2*bnd+16);
o(-22,22,10,0,6,.8,[[-2,2,0,3.4],[8,11,0,3.4],[-11,-8,0,3.4]]);
o(-22,22,-20,0,6,.8,[[-2,2,0,3]]);
a(-20,10,-22,0,6,.8,[[2,6,0,3]]);
a(-20,10,22,0,6,.8,[[-6,-2,0,3]]);
i(-23,-21,23,11,6,.6);
s(-23,6.3,-5,.5,.5,33,{noCollide:!0,ink:k.RED});s(23,6.3,-5,.5,.5,33,{noCollide:!0,ink:k.RED});
s(0,6.3,-21,47,.5,.5,{noCollide:!0,ink:k.RED});s(0,6.3,11,47,.5,.5,{noCollide:!0,ink:k.RED});
s(0,.06,10,5,.05,3,{noCollide:!0,ink:k.RED});
s(0,2.2,9.6,7,.9,.2,{noCollide:!0,ink:k.BLACK});
a(-20,4,-8,0,6,.5,[[0,3,0,3]]);
a(-20,4,8,0,6,.5,[[0,3,0,3]]);
o(-8,8,-6,0,6,.5,[[-2,2,0,3]]);
o(-22,-8,-8,0,6,.5,[[-16,-14,0,3]]);
o(8,22,-8,0,6,.5,[[14,16,0,3]]);
s(0,.05,6,15.6,.04,3.6,{noCollide:!0,ink:k.ORANGE});
for(let dx of[-18,-15,-12]){for(let dz of[-17,-14,-11]){s(dx,.5,dz,1.7,.9,1,{ink:k.ORANGE});s(dx,.95,dz-.2,.5,.12,.5,{noCollide:!0,ink:k.BLACK})}}
for(let dx of[12,15,18]){for(let dz of[-17,-14,-11]){s(dx,.5,dz,1.7,.9,1,{ink:k.BLUE});s(dx,.95,dz-.2,.5,.12,.5,{noCollide:!0,ink:k.BLACK})}}
for(let dx of[-18,-15,-12]){s(dx,.5,-2,1.7,.9,1,{ink:k.GREEN})}
for(let dx of[12,15,18]){s(dx,.5,-2,1.7,.9,1,{ink:k.GREEN})}
s(-15,.06,-5,6,.04,4,{noCollide:!0,ink:k.PINK});s(15,.06,-5,6,.04,4,{noCollide:!0,ink:k.PINK});
s(-15,2.5,-4.7,5,1.6,.15,{noCollide:!0,ink:k.BLACK});
s(15,2.5,-4.7,5,1.6,.15,{noCollide:!0,ink:k.BLACK});
for(let gx of[-12,-6,0,6,12]){s(gx,.4,-13,2.4,.8,2.4,{ink:k.RED})}
for(let bz=0;bz<3;bz++){s(-13+bz*0,1+bz*1.1,-18.5,8,.5,1.2,{ink:k.BLUE});s(5,1+bz*1.1,-18.5,8,.5,1.2,{ink:k.BLUE})}
c(-14,0,-12,.12,3.4,{ink:k.BLACK});s(-14,3.4,-12,1.8,1.2,.12,{ink:k.RED});
c(14,0,-12,.12,3.4,{ink:k.BLACK});s(14,3.4,-12,1.8,1.2,.12,{ink:k.RED});
d(-14,2.9,-11.9,"z");d(14,2.9,-11.9,"z");
for(let cx of[-5,0,5]){s(cx,.55,16,2.6,.5,1.4,{ink:k.ORANGE});s(cx-.9,.25,17.4,.5,.5,.5,{ink:k.BLUE});s(cx+.9,.25,17.4,.5,.5,.5,{ink:k.BLUE})}
s(0,.06,22,10,.04,6,{noCollide:!0,ink:k.GREEN});
c(30,0,20,2,10,{ink:k.RED});
i(27.5,17.5,32.5,22.5,10,.5);
c(30,10.2,20,1.2,1.6,{ink:k.BLACK});
s(28.6,10.2,20,.5,2.6,.5,{ink:k.BLACK});s(31.4,10.2,20,.5,2.6,.5,{ink:k.BLACK});
s(30,12.9,20,3.4,.4,1.2,{ink:k.RED});
let bl=new w.Group;
bl.add(S(new w.CylinderGeometry(.02,.02,1.2,6).translate(0,-.6,0),k.BLACK));
bl.add(S(new w.CylinderGeometry(.32,.5,.8,10).translate(0,-1.5,0),k.ORANGE));
bl.position.set(30,12.7,20);N.add(bl);e.meshes.push(bl);
e.schoolBell=bl;
e.animated.push({mesh:bl,update:(j)=>{bl.rotation.z=Math.sin(j*2.2)*.35}});
c(-30,0,20,.15,7,{ink:k.BLACK});
let fg=new w.Group;fg.add(S(new w.BoxGeometry(2.4,1.3,.08).translate(1.3,0,0),k.BLUE));fg.position.set(-29.8,6.2,20);N.add(fg);e.meshes.push(fg);e.animated.push({mesh:fg,update:(j)=>{fg.rotation.y=Math.sin(j*3)*.3}});
for(let[hx,hy,hz]of[[-30,3,32],[30,3,32],[-30,3,-30],[30,3,-30]]){c(hx,0,hz,.15,6,{ink:k.BLACK});h(hx,6.2,hz,.35,{ink:k.ORANGE})}
function crateB(bx,by,bz,bhp){U("crate",bx,by,bz,1.2,1.2,1.2,function(W){W.add(S(new w.BoxGeometry(1.2,1.2,1.2).translate(0,.6,0),k.BLUE));for(let bu of[-1,1]){W.add(S(new w.BoxGeometry(1.24,.14,.14).translate(0,.6+bu*.35,.6),k.BLACK))}},{hp:bhp||30,ink:k.BLUE})}
function barrelB(bx,by,bz){U("barrel",bx,by,bz,1.1,1.3,1.1,function(W){W.add(S(new w.CylinderGeometry(.5,.45,1.3,10).translate(0,.65,0),k.ORANGE));for(let bu of[.3,1]){W.add(S(new w.TorusGeometry(.5,.045,4,14).rotateX(Math.PI/2).translate(0,bu,0),k.BLACK))}},{hp:40,ink:k.ORANGE})}
function urnB(bx,by,bz){U("urn",bx,by,bz,1,1.4,1,function(W){W.add(S(new w.CylinderGeometry(.42,.3,1.4,9).translate(0,.7,0),k.ORANGE));W.add(S(new w.TorusGeometry(.42,.07,4,12).rotateX(Math.PI/2).translate(0,1.35,0),k.BLACK))},{hp:20,ink:k.ORANGE})}
crateB(-4,.5,24);crateB(4,.5,24);crateB(-15,0,14);crateB(15,0,14);crateB(-4,0,-2);crateB(4,0,-2);
barrelB(-10,.55,20);barrelB(10,.55,20);barrelB(-20,0,-14);barrelB(20,0,-14);barrelB(0,.55,-13);
urnB(-6,.5,6);urnB(6,.5,6);urnB(-18,0,-18);urnB(18,0,-18);
function propC(px,py,pz){J("crate",px,py,pz,{x:.7,y:.7,z:.7},function(W){W.add(S(new w.BoxGeometry(1.4,1.4,1.4),k.GREEN));for(let pu of[-1,1]){W.add(S(new w.BoxGeometry(1.44,.16,1.44).translate(0,pu*.42,0),k.BLACK))}},{mass:1,snap:"cube",ink:k.GREEN})}
propC(-8,.5,26);propC(8,.5,26);propC(0,.5,-14);
h(100,120,-160,11,{seg:12});for(let si=0;si<12;si++){let sa=si/12*Math.PI*2,sq=new w.BoxGeometry(6,.7,.7);sq.rotateZ(sa);sq.translate(100+Math.cos(sa)*18,120+Math.sin(sa)*18,-160);M(sq,k.BLUE)}
for(let[clx,cly,clz,clk]of[[60,70,-170,1],[-20,75,-190,1.3],[140,60,-80,.9],[-150,65,40,1.1],[30,80,180,1.2],[-90,60,170,.8]]){for(let cn=0;cn<6;cn++){h(clx+(cn-2.5)*5*clk,cly+Math.sin(cn*1.7)*2.5*clk,clz,(4+cn%3)*clk,{seg:10})}}
f(-6,.5,30);f(6,.5,30);f(-16,.5,18);f(16,.5,18);f(0,.5,6);f(-14,.5,-4);f(14,.5,-4);f(0,.5,-13);f(-18,.5,-15);f(18,.5,-15);f(-30,.5,26);f(30,.5,26);
g(-13,2.1,-18.5);g(9,2.1,-18.5);g(-30,.5,32);g(30,.5,32);g(0,.5,22);
v(0,.6,26);v(-15,.6,10);v(15,.6,10);v(-15,.6,-13);v(15,.6,-13);v(0,.6,-4);v(-26,.6,20);v(26,.6,20);
if(t){for(let[ax,ay,az]of[[-6,.5,30],[6,.5,30],[-16,.5,18],[16,.5,18],[0,.5,6],[-14,.5,-4],[14,.5,-4],[0,.5,-13],[-18,.5,-15],[18,.5,-15],[-30,.5,26],[30,.5,26],[0,.5,22],[-24,.5,0]]){e.arenaSpawns.push(new w.Vector3(ax,ay,az))}
s(-3,.5,28,2,1,2);s(3,.5,28,2,1,2);s(-10,.55,20,1.8,1,1.8);s(10,.55,20,1.8,1,1.8);s(0,0,0,3,1.2,3);s(-18,0,-10,2.2,1,2.2);s(18,0,-10,2.2,1,2.2);
for(let[fx,fy,fz,fw,fd]of[[0,20,20,6,6],[-18,16,-12,5,5],[18,16,-12,5,5],[0,18,-4,5,5]]){s(fx,fy,fz,fw,.5,fd,{noNav:!0,ink:k.PINK});s(fx,fy+.5,fz,.12,22,.12,{noCollide:!0,ink:k.BLACK});d(fx,fy-1.3,fz,"y")}
T(3,30,28,{scale:1.5,rStep:9,hStep:6,speed:.1,ink:k.RED});q(5,34,30,{rStep:10,hStep:5,scale:1.2,ink:k.BLACK})}
if(!t){q(3,32,28,{rStep:9,hStep:5,scale:1.2,ink:k.BLACK})}
return n.finish();
}
