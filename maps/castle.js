function DDcastle(n,t=!1){
let{L:e,box:s,slab:i,wallX:o,wallZ:a,stairs:l,rail:r,cyl:c,sphere:h,ring:d,spawn:f,sniper:g,pickup:v,planes:T,birds:q,prop:J,breakable:U,mesh:S,scene:N,addGeo:M,collider:C2}=n;
let bnd=t?68:60,W=8,Ht=t?30:6;
e.key="castle";
e.playerStart.set(0,1,48);
e.bounds={minX:-bnd,maxX:bnd,minZ:-bnd,maxZ:bnd};
e.style={paper:[.95,.92,.82],lines:0,inks:[[.05,.22,.72],[.85,.14,.22],[.22,.18,.20],[.96,.52,.08],[.08,.55,.42],[.92,.42,.58]]};
s(0,-2,0,2*bnd+W,2,2*bnd+W,{ink:k.GREEN});
s(0,0,-bnd,2*bnd+W,Ht,W);
s(0,0,bnd,2*bnd+W,Ht,W);
s(-bnd,0,0,W,Ht,2*bnd+W);
s(bnd,0,0,W,Ht,2*bnd+W);
if(!t){let wc={noNav:!0,noGrapple:!0};C2(0,Ht,-bnd,2*bnd+W,40,W,wc);C2(0,Ht,bnd,2*bnd+W,40,W,wc);C2(-bnd,Ht,0,W,40,2*bnd+W,wc);C2(bnd,Ht,0,W,40,2*bnd+W,wc);C2(0,56,0,2*bnd+40,8,2*bnd+40,wc)}
if(t){let hc={noNav:!0,noGrapple:!0};C2(0,30,-bnd,2*bnd+W,30,W,hc);C2(0,30,bnd,2*bnd+W,30,W,hc);C2(-bnd,30,0,W,30,2*bnd+W,hc);C2(bnd,30,0,W,30,2*bnd+W,hc);C2(0,60,0,2*bnd+40,8,2*bnd+40,hc)}
s(0,.02,-38,84,.06,6,{noCollide:!0,ink:k.BLUE});s(0,.02,38,84,.06,6,{noCollide:!0,ink:k.BLUE});s(-38,.02,0,6,.06,72,{noCollide:!0,ink:k.BLUE});s(38,.02,0,6,.06,72,{noCollide:!0,ink:k.BLUE});
s(0,.04,-38,84,.03,.5,{noCollide:!0,ink:k.BLACK});s(0,.04,38,84,.03,.5,{noCollide:!0,ink:k.BLACK});
o(-28,28,-28,0,7,.8,[]);o(-28,28,28,0,7,.8,[[-3,3,0,5]]);a(-28,28,-28,0,7,.8,[]);a(-28,28,28,0,7,.8,[]);
i(-28,-29,28,-26.4,7.5,.5);i(-28,26.4,28,29,7.5,.5);i(-29,-28,-27,28,7.5,.5);i(27,-28,29,28,7.5,.5);
for(let bx=-27;bx<=27;bx+=2.4){s(bx,7.5,-28.6,1.2,1,.8,{ink:k.BLUE});s(bx,7.5,28.6,1.2,1,.8,{ink:k.BLUE});s(-28.6,7.5,bx,.8,1,1.2,{ink:k.BLUE});s(28.6,7.5,bx,.8,1,1.2,{ink:k.BLUE})}
r(-28,-26.5,8,-26.5,7.5);r(12,-26.5,28,-26.5,7.5);r(-28,26.5,-12,26.5,7.5);r(-8,26.5,28,26.5,7.5);r(-27,-28,-27,28,7.5);r(27,-28,27,28,7.5);
l(-10,0,15,"+z",26,3);l(10,0,-15,"-z",26,3);
function tower(tx,tz,sx,sz){c(tx,0,tz,4,7,{ink:k.BLUE});i(tx-4,tz-4,tx+4,tz+4,7.5,.5);r(tx+sx*4,tz-4,tx+sx*4,tz+4,7.5);r(tx-4,tz+sz*4,tx+4,tz+sz*4,7.5);c(tx-sx*2,7.5,tz-sz*2,.15,2.4,{ink:k.BLACK});h(tx-sx*2,10.2,tz-sz*2,.35,{ink:k.ORANGE});d(tx,6,tz+sz*4.4,"z")}
tower(-28,-28,-1,-1);tower(28,-28,1,-1);tower(-28,28,-1,1);tower(28,28,1,1);
s(-4.5,0,28,5,11,5,{ink:k.RED});s(4.5,0,28,5,11,5,{ink:k.RED});i(-7,26,7,30,10.4,.8);
for(let px=-2;px<=2;px+=1){s(px,5,28,.18,5,.18,{noCollide:!0,ink:k.BLACK})}
s(0,.1,33.5,6,.25,5,{ink:k.ORANGE});s(-4.5,11,28,5.4,.6,5.4,{ink:k.BLACK});s(4.5,11,28,5.4,.6,5.4,{ink:k.BLACK});d(0,9,30.5,"z");
s(0,0,-16,18,15,12,{ink:k.BLUE});
for(let wy=4;wy<=12;wy+=4){for(let wx=-6;wx<=6;wx+=4){s(wx,wy,-9.9,1.2,1.8,.15,{noCollide:!0,ink:k.BLACK})}}
s(0,0,-9.9,2.6,3.6,.2,{noCollide:!0,ink:k.BLACK});s(-9.1,0,-16,.15,3,2.6,{noCollide:!0,ink:k.BLACK});
c(-11,0,-20,2.5,18,{ink:k.RED});c(11,0,-20,2.5,18,{ink:k.RED});i(-13.5,-22.5,-8.5,-17.5,18.4,.5);i(8.5,-22.5,13.5,-17.5,18.4,.5);
i(-9,-22,9,-10,15.5,.5);r(-9,-22,9,-22,15.5);r(-9,-10,9,-10,15.5);r(-9,-22,-9,-10,15.5);r(9,-22,9,-10,15.5);
c(0,15.5,-16,.18,6,{ink:k.BLACK});d(0,19,-16,"z");
let fg=new w.Group;fg.add(S(new w.BoxGeometry(2.6,1.4,.08).translate(1.4,0,0),k.RED));fg.position.set(.2,20.6,-16);N.add(fg);e.meshes.push(fg);e.animated.push({mesh:fg,update:(j)=>{fg.rotation.y=Math.sin(j*3)*.3}});
s(-6,12,-9.9,2.5,4,.15,{noCollide:!0,ink:k.RED});s(6,12,-9.9,2.5,4,.15,{noCollide:!0,ink:k.RED});
c(0,0,8,1.3,1.1,{ink:k.BLACK});c(-1.3,0,8,.12,2.6,{ink:k.BLACK});c(1.3,0,8,.12,2.6,{ink:k.BLACK});s(0,2.6,8,3.4,.3,2.4,{ink:k.RED});d(0,3.6,8,"z");
c(-6,.55,12,1,1.1,{ink:k.ORANGE});c(-4,.55,13,1,1.1,{ink:k.ORANGE});c(-5,1.65,12.5,1,1.1,{ink:k.ORANGE});
s(-12,0,6,.3,1.6,.3,{ink:k.BLACK});s(-9,0,6,.3,1.6,.3,{ink:k.BLACK});s(-10.5,1.4,6,3.4,.18,.18,{ink:k.BLACK});
for(let sw=0;sw<3;sw++){s(-11.5+sw,0,6.4,.12,1.5,.12,{noCollide:!0,ink:k.BLUE})}
for(let[tx2,tz2]of[[-20,20],[20,20],[-20,-8],[20,-8],[-8,24],[8,24],[-14,-24],[14,-24]]){c(tx2,0,tz2,.15,3,{ink:k.BLACK});h(tx2,3.2,tz2,.3,{ink:k.ORANGE})}
for(let[dx,dz]of[[-44,-20],[-46,10],[44,-14],[44,20],[-16,-46],[20,46]]){s(dx,0,dz,1,5+((dx+dz)%3+3)%3,1,{ink:k.BLACK});s(dx+1.2,3,dz,.18,3,.18,{noCollide:!0,ink:k.BLACK});s(dx-1,2.4,dz+.4,.15,2.4,.15,{noCollide:!0,ink:k.BLACK})}
for(let[gx,gz]of[[-44,32],[-41,34],[-44,36]]){s(gx,0,gz,1.6,1.1,.5,{ink:k.BLUE});s(gx,.9,gz,.9,.18,.55,{noCollide:!0,ink:k.BLACK})}
function crateB(bx,by,bz,bhp){U("crate",bx,by,bz,1.2,1.2,1.2,function(W){W.add(S(new w.BoxGeometry(1.2,1.2,1.2).translate(0,.6,0),k.BLUE));for(let bu of[-1,1]){W.add(S(new w.BoxGeometry(1.24,.14,.14).translate(0,.6+bu*.35,.6),k.BLACK))}},{hp:bhp||30,ink:k.BLUE})}
function barrelB(bx,by,bz){U("barrel",bx,by,bz,1.1,1.3,1.1,function(W){W.add(S(new w.CylinderGeometry(.5,.45,1.3,10).translate(0,.65,0),k.ORANGE));for(let bu of[.3,1]){W.add(S(new w.TorusGeometry(.5,.045,4,14).rotateX(Math.PI/2).translate(0,bu,0),k.BLACK))}},{hp:40,ink:k.ORANGE})}
function urnB(bx,by,bz){U("urn",bx,by,bz,1,1.4,1,function(W){W.add(S(new w.CylinderGeometry(.42,.3,1.4,9).translate(0,.7,0),k.ORANGE));W.add(S(new w.TorusGeometry(.42,.07,4,12).rotateX(Math.PI/2).translate(0,1.35,0),k.BLACK))},{hp:20,ink:k.ORANGE})}
crateB(-6,.5,16);crateB(6,.5,16);crateB(-14,0,-2);crateB(14,0,-2);barrelB(-8,.55,4);barrelB(8,.55,4);barrelB(-24,0,20);barrelB(24,0,20);urnB(-3,.5,-8);urnB(3,.5,-8);urnB(-20,0,8);urnB(20,0,8);
function propC(px,py,pz){J("crate",px,py,pz,{x:.7,y:.7,z:.7},function(W){W.add(S(new w.BoxGeometry(1.4,1.4,1.4),k.GREEN));for(let pu of[-1,1]){W.add(S(new w.BoxGeometry(1.44,.16,1.44).translate(0,pu*.42,0),k.BLACK))}},{mass:1,snap:"cube",ink:k.GREEN})}
propC(-4,.5,24);propC(4,.5,-4);propC(-22,.5,0);propC(22,.5,0);
h(100,120,-160,11,{seg:12});for(let si=0;si<12;si++){let sa=si/12*Math.PI*2,sq=new w.BoxGeometry(6,.7,.7);sq.rotateZ(sa);sq.translate(100+Math.cos(sa)*18,120+Math.sin(sa)*18,-160);M(sq,k.BLUE)}
for(let[clx,cly,clz,clk]of[[60,70,-170,1],[-20,75,-190,1.3],[140,60,-80,.9],[-150,65,40,1.1],[30,80,180,1.2],[-90,60,170,.8]]){for(let cn=0;cn<6;cn++){h(clx+(cn-2.5)*5*clk,cly+Math.sin(cn*1.7)*2.5*clk,clz,(4+cn%3)*clk,{seg:10})}}
f(-4,.5,44);f(4,.5,44);f(-44,.5,0);f(44,.5,0);f(-14,.5,14);f(14,.5,14);f(0,.5,20);f(0,.5,-2);f(-20,7.7,27.5);f(20,7.7,-27.5);f(-28,7.7,-24);f(0,.5,31);
g(-28,7.7,-28);g(28,7.7,-28);g(-28,7.7,28);g(28,7.7,28);g(0,7.7,27.5);
v(0,.6,12);v(-18,.6,18);v(18,.6,18);v(0,.6,-6);v(-28,7.7,-24);v(28,7.7,24);v(-44,.6,20);v(44,.6,-20);
if(t){for(let[ax,ay,az]of[[-4,.5,46],[4,.5,46],[-46,.5,0],[46,.5,0],[-14,.5,14],[14,.5,14],[0,.5,20],[0,.5,-2],[-20,7.7,27.5],[20,7.7,-27.5],[-28,7.7,-24],[28,7.7,24],[0,.5,31],[-40,.5,30]]){e.arenaSpawns.push(new w.Vector3(ax,ay,az))}
s(-8,.5,36,2.4,1.2,2.4);s(8,.5,36,2.4,1.2,2.4);s(-12,.55,8,2,1,2);s(12,.55,8,2,1,2);s(0,0,-4,3,1.2,3);s(-24,0,-12,2.4,1,2.4);s(24,0,-12,2.4,1,2.4);
for(let[fx,fy,fz,fw,fd]of[[0,22,8,7,7],[-24,18,-8,6,6],[24,18,-8,6,6],[0,24,28,6,6]]){s(fx,fy,fz,fw,.5,fd,{noNav:!0,ink:k.PINK});s(fx,fy+.5,fz,.12,26,.12,{noCollide:!0,ink:k.BLACK});d(fx,fy-1.3,fz,"y")}
T(3,36,32,{scale:1.5,rStep:9,hStep:6,speed:.1,ink:k.RED});q(5,42,34,{rStep:10,hStep:5,scale:1.2,ink:k.BLACK})}
if(!t){q(3,38,32,{rStep:9,hStep:5,scale:1.2,ink:k.BLACK})}
return n.finish();
}
