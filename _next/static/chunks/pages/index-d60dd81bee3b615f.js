(self.webpackChunk_N_E=self.webpackChunk_N_E||[]).push([[405],{8312:function(t,e,s){(window.__NEXT_P=window.__NEXT_P||[]).push(["/",function(){return s(7360)}])},7360:function(t,e,s){"use strict";s.r(e),s.d(e,{__N_SSG:function(){return J},default:function(){return V}});var i=s(5893),r=s(7294);let n=Math.PI,h=2*n,o=(t,e)=>t-e,l=(t,e)=>{if(t instanceof Array)[t,e]=t;else if(void 0===e)throw Error("pp: ".concat(t," ").concat(e));return"(".concat([t,e].map(k).join(","),")")},a=(t,e)=>"".concat(t,",").concat(e),c=t=>180*t/n,u=t=>k(c(t))+"\xb0",d=t=>1e-13>Math.abs(t)?0:t,f=Math.sqrt,p=(t,e)=>{let s=[];return Object.entries(t).forEach(t=>{let[e,i]=t;void 0!==i&&s.push(e)}),s.join(e||",")},x=(t,e)=>{let s=[],i=[],r=[];for(let i in e)e[i]&&(t[i]?s[i]=t[i]:r[i]=e[i]);for(let s in t)t[s]&&!e[s]&&(i[s]=t[s]);return[s,i,r]},g=t=>t.s(),y=(t,e)=>t.map(g).join(e||" "),m=(t,e)=>t+e,v=(t,e)=>{let s=t.length-e.length;return s||(t<e?-1:t>e?1:0)},E=(t,e)=>"["+t.map((t,s)=>a(k(t.x),k(t.y))+" "+e[s].i+"→").join(" ")+"]",j=t=>{if(!t.length)return[[]];let e=j(t.slice(1));return e.map(e=>[t[0]].concat(e)).concat(e)},M=t=>{let e="";for(let s=0;s<t;s++)e+=" ";return e},k=t=>Math.round(1e3*t)/1e3;function b(t){let{dragStart:e,color:s,cs:r,k:n,scale:h}=t;return(0,i.jsx)("circle",{r:5/h,cx:r[0],cy:r[1],onMouseDown:function(t){e(t,n),t.stopPropagation()},style:{fill:s||"black"}})}function w(t){let{cx:e,cy:s,rx:n,ry:h,degrees:o,color:l,scale:a,ellipseIdx:c,...u}=t,[d,p]=(0,r.useState)(!1);function x(t,e){u.dragStart(t,e,c)}let g=[n,0],y=[-n,0],m=[0,h],v=[0,-h],E=[0,0],j=Math.max(n,h),M=Math.min(n,h),k=f(j*j-M*M),w=n>=h?[k,0]:[0,k],S=n>=h?[-k,0]:[0,-k],N=(0,r.useMemo)(()=>(d||u.dragging)&&[{k:"f1",cs:w,color:"lightgrey"},{k:"f2",cs:S,color:"lightgrey"},{k:"vx1",cs:g,color:"black"},{k:"vx2",cs:y,color:"black"},{k:"vy1",cs:m,color:"grey"},{k:"vy2",cs:v,color:"grey"},{k:"c",cs:E,color:"black"}].map(t=>{let{k:e,cs:s,color:r}=t;return(0,i.jsx)(b,{k:e,cs:s,dragStart:x,scale:a,color:r},e)}),[d,u.dragging,x,a]);return(0,i.jsxs)("g",{transform:"translate("+e+","+s+") rotate("+o+")",onMouseEnter:function(){p(!0)},onMouseLeave:function(){p(!1)},onMouseDown:t=>{x(t,"c")},children:[(0,i.jsx)("ellipse",{rx:n,ry:h,style:{fill:l}}),N]})}function S(t,e,s){let i=f(t*t+e*e),r=null,n=Math.round(2*s/Math.PI);if(-1===n)r=-Math.acos(t/i);else if(0===n)r=Math.asin(e/i);else if(1===n)r=Math.acos(t/i);else if(1<n)(r=Math.PI-Math.asin(e/i))>Math.PI&&(r-=2*Math.PI);else if(n<-1)(r=-Math.PI-Math.asin(e/i))<-Math.PI&&(r+=2*Math.PI);else throw Error("getTheta(".concat(t,", ").concat(e,", ").concat(s));return{theta:r,r:i}}function N(t){let{ellipses:e,idx:s,onEllipseDrag:n,transformBy:h,onCursor:o,projection:l,gridSize:a,points:c,regions:u,hideCursorDot:d,cursor:p,showGrid:x}=t,[g,y]=(0,r.useState)(!1),[m,v]=(0,r.useState)(3),[E,j]=(0,r.useState)(null),[M,k]=(0,r.useState)(null),[b,N]=(0,r.useState)(null),[C,A]=(0,r.useState)(null),[B,O]=(0,r.useState)(300),[D,P]=(0,r.useState)(400),_=(0,r.useMemo)(()=>l&&l.s||1,[l]),I=(0,r.useRef)(null),F=(0,r.useCallback)((t,e,s)=>{var i;let r=null===(i=I.current)||void 0===i?void 0:i.getBoundingClientRect(),{left:n,top:h}=r||{left:0,top:0};y(!0),k(e),j(s),N(t.clientX-n),A(t.clientY-h)},[I.current]),J=(0,r.useCallback)((t,e)=>({x:(t-B/2)/_,y:-((e-D/2)/_)}),[B,D,_]),V=(0,r.useCallback)((t,e)=>({x:t*_+B/2,y:e*_+D/2}),[B,D,_]),W=(0,r.useCallback)(t=>{var i;let r=null===(i=I.current)||void 0===i?void 0:i.getBoundingClientRect(),{left:l,top:a}=r||{left:0,top:0},c=t.clientX-l,u=t.clientY-a,d=J(c,u);if(o){if(h){let[t,e]=h.invert(d.x,d.y);o({x:t,y:e},s)}else o(d,s)}if(g&&null!==E&&null!==b&&null!==C&&n){let t=(c-b)/_,s=(u-C)/_,i=e[E];if("c"===M)n(E,{cx:i.cx+t,cy:i.cy-s});else{let e=i.theta,r=Math.cos(e),h=Math.sin(e);if("vx1"===M||"vx2"===M){"vx2"===M&&(t=-t,s=-s);let o=i.rx,l=o*r+t,a=o*h-s,{theta:c,r:u}=S(l,a,e);n(E,{theta:c,rx:u})}else if("vy1"===M||"vy2"===M){"vy2"===M&&(t=-t,s=-s);let o=i.ry,l=-o*h+t,a=o*r-s,{theta:c,r:u}=S(a,-l,e);n(E,{theta:c,ry:u})}else if("f1"===M||"f2"===M){"f2"===M&&(t=-t,s=-s);let{rx:o,ry:l}=i,a=Math.max(o,l),c=Math.min(o,l),u=f(a*a-c*c),d=u*(o>=l?r:-h),p=u*(o>=l?h:r),x=d+t,g=p-s,{theta:y,r:m}=S(o>=l?x:g,o>=l?g:-x,e),v=o>=l?{rx:f(l*l+m*m),theta:y}:{ry:f(o*o+m*m),theta:y};n(E,v)}}N(c),A(u)}},[I.current,h,J,o]),z=(0,r.useCallback)((t,e)=>{if(!h)return{x:t,y:e};{let[s,i]=h.transform([t,e]);return{x:s,y:i}}},[h]),K=[];l&&((void 0!==l.x||void 0!==l.y)&&K.push(["translate",l.x+B/2||0,l.y+D/2||0]),l.s&&K.push(["scale",l.s,-l.s])),a=a||Math.min(B,D)/11/_;let X=[];if(void 0!==x){let t=J(0,0),e=t.x-a,s=t.y+a,r=J(B,D),n=r.x+a,h=r.y-a,o=e-e%a,l=[];for(let t=o;t<=n;t+=a){let e="M"+t+" "+s+"V"+h;l.push((0,i.jsx)("path",{className:"grid-line"+(0===t?" axis":""),strokeWidth:a/20,d:e},"v-"+t))}X.push((0,i.jsx)("g",{className:"grid-lines vertical",children:l},"vertical"));let c=h-h%a,u=[];for(let t=c;t<=s;t+=a){let s="M"+e+" "+t+"H"+n;u.push((0,i.jsx)("path",{className:"grid-line"+(0===t?" axis":""),strokeWidth:a/20,d:s},"h-"+t))}X.push((0,i.jsx)("g",{className:"grid-lines horizontal",children:u},"horizontal"))}let q=(0,r.useMemo)(()=>e.map((t,e)=>{let s=h?t.project(h):t,r=E===e;return(0,i.jsx)(w,{ellipseIdx:t.idx,dragging:r,dragStart:F,...s,scale:_},t.name)}),[e,h,E,F,_]),G=(0,r.useMemo)(()=>c.map((t,e)=>{let s=z(t.x,t.y);return(0,i.jsx)("circle",{r:m/_,className:"projected-point",cx:s.x,cy:s.y},e)}),[z,m,_,c]),L=p?z(p.x,p.y):null,R=L?V(L.x,L.y):null,[T,Y,H]=p&&L&&R?[!d&&(0,i.jsx)("circle",{className:"projected-cursor",r:3/_,cx:L.x,cy:L.y}),(0,i.jsx)("text",{className:"cursor",x:"10",y:"20",children:[p.x.toString().substr(0,4),p.y.toString().substr(0,4)].join(",")}),(0,i.jsx)("text",{className:"cursor",x:"10",y:"40",children:[R.x.toString().substr(0,4),R.y.toString().substr(0,4)].join(",")})]:[null,null,null];return(0,i.jsxs)("svg",{ref:I,onMouseMove:W,onMouseUp:function(){g&&(y(!1),j(null))},children:[(0,i.jsxs)("g",{className:"projection",transform:K.length?K.map(t=>t[0]+"("+t.slice(1).join(",")+")").join(" "):void 0,children:[X,u&&(0,i.jsx)("g",{className:"regions",children:u}),(0,i.jsx)("g",{className:"ellipses",children:q}),(0,i.jsx)("g",{className:"points",children:G}),T]}),H,Y]})}class C extends r.Component{onChange(t){this.props.onChange(t.target.value)}render(){return(0,i.jsx)("textarea",{className:"model-text-field"+(this.props.malformedEllipses?" malformed":""),onKeyPress:this.onKeyPress,onKeyDown:this.onKeyDown,onChange:this.onChange,value:JSON.stringify(this.props.ellipses,null,2)})}}class A{polar(t){if(t==this.e1.idx)return this.cst1;if(t==this.e2.idx)return this.cst2;throw Error("Ellipse idx ".concat(t," not found in ").concat(this.e1.idx,", ").concat(this.e2.idx," (").concat(this.toString(),")"))}addEdge(t){this.edges.push(t)}other(t){if(t===this.e1)return this.e2;if(t===this.e2)return this.e1;throw Error("Bad other ellipse req: "+t.toString()+" in "+this.toString())}toString(){return"I("+[l(this.x,this.y),l(this.cst1.c,this.cst1.s),l(this.cst2.c,this.cst2.s),k(c(this.cst1.t)),k(c(this.cst2.t))].join(" ")+")"}s(){return"I"+l(this.x,this.y)}constructor(t){this.idx=null,this.e1=t.e1,this.e2=t.e2;let{e1:e,e2:s}=t,i=void 0===t.t1?e.polar(t.x,t.y).t:t.t1;this.cst1={t:i,c:void 0===t.c1?Math.cos(i):t.c1,s:void 0===t.s1?Math.sin(i):t.s1};let r=void 0===t.t2?s.polar(t.x,t.y).t:t.t2;if(this.cst2={t:r,c:void 0===t.c2?Math.cos(r):t.c2,s:void 0===t.s2?Math.sin(r):t.s2},void 0===t.x){let[t,s]=e.invert(this.cst1.c,this.cst1.s);this.x=t,this.y=s}else this.x=t.x,this.y=t.y;this.edges=[]}}let B=(t,e,s,i)=>{if(void 0!==i){if(void 0===s)throw Error("cubic: d is defined but c is not");if(0===t){let t=s*s-4*e*i;if(t<0&&t>-.00000000000001&&(t=0),t>=0){let i=f(t);return[(-s+i)/2/e,(-s-i)/2/e]}return[]}return B(e/t,s/t,i/t)}if(void 0!==s){let i=e-t*t/3,r=s-t*e/3+2*t*t*t/27;return B(i,r).map(e=>e-t/3)}if(0===e)return t<0?[-f(-t),0,f(-t)]:[0];if(0===t)return[Math.cbrt(-e)];let r=-t/3,h=r*r*r,l=-e/2,a=l*l-h;function c(t){return 2*f(r)*Math.cos((Math.acos(l/f(h))-2*n*t)/3)}if(a<0){let t=[c(0),c(1),c(2)];return t.sort(o),t}if(0===a)return[3*e/t,-l/r,-l/r].sort(o);{let t=f(a);return[Math.cbrt(l+t)+Math.cbrt(l-t)]}},O=(t,e,s,i,r)=>{if(void 0!==r){if(void 0===i)throw Error("quartic: e is defined but d is not");return 0===t?B(e,s,i,r):O(e/t,s/t,i/t,r/t)}if(void 0!==i){let r=e-3*t*t/8,n=s+t*(t*t-4*e)/8,h=i+t*(-3*t*t*t-64*s+16*t*e)/256;return O(r,n,h).map(e=>e-t/4)}let n=[];if(1e-15>Math.abs(e)){let e=t*t-4*s;if(1e-15>Math.abs(e)&&(e=0),e<0)return[];let i=f(e),r=(-t+i)/2,h=(-t-i)/2;if(r>=0){let t=f(r);n=n.concat([-t,t])}if(h>=0){let t=f(h);n=n.concat([-t,t])}let l=n.sort(o);return l}let h=B(5*t/2,2*t*t-s,t*t*t/2-t*s/2-e*e/8),l=h[0],a=f(t+2*l);function c(s,i){let r=s*a,h=-(3*t+2*l+2*e/r);if(h>=0){let t=f(h);n.push((r+i*t)/2)}}return c(1,1),c(1,-1),c(-1,1),c(-1,-1),n.sort(o)};class D{toString(){return"E(c:"+l(this.cx,this.cy)+"; r:"+l(this.rx,this.ry)+","+k(this.degrees)+"\xb0,("+[this.A,this.B,this.C,this.D,this.E,this.F].map(k).join(",")+"))"}s(){return this.toString()}modify(t){let{rx:e,ry:s,theta:i,cx:r,cy:n,color:h,idx:o,name:l}=this;return new D({rx:e,ry:s,theta:i,cx:r,cy:n,color:h,idx:o,name:l,...t})}polar(t,e){let s=this.transform(t,e),i=f(s[0]*s[0]+s[1]*s[1]);if(0===i)return{r:i,t:0};let r=s[1]<0?-Math.acos(s[0]/i):Math.acos(s[0]/i);return{r:i,t:r}}transform(t,e){if(t instanceof Array)e=t[1],t=t[0];else if("object"==typeof t&&"x"in t)e=t.y,t=t.x;else if(void 0===e)throw Error("expected y in Ellipse.transform: "+JSON.stringify(t));return t-=this.cx,e-=this.cy,[(this.cos*t+this.sin*e)/this.rx,(this.cos*e-this.sin*t)/this.ry]}invert(t,e){if(t instanceof Array)e=t[1],t=t[0];else if(void 0===e)throw Error("expected y in Ellipse.invert: "+JSON.stringify(t));let s=this.rx*t,i=this.ry*e,r=this.cos*s-this.sin*i,n=this.cos*i+this.sin*s;return[r+this.cx,n+this.cy]}translate(t,e){let{A:s,B:i,C:r,D:n,E:h,F:o,theta:l,color:a,idx:c,name:u}=this;return new D({A:s,B:i,C:r,D:n-2*s*t-i*e,E:h-2*r*e-i*t,F:o+s*t*t+i*t*e+r*e*e-n*t-h*e,theta:l,color:a,idx:c,name:u})}rotate(t){let{A:e,B:s,C:i,D:r,E:n,F:h,theta:o,color:l,idx:a,name:c}=this,u=Math.cos(t),d=Math.sin(t),f=u*u,p=d*d,x=u*d;return new D({A:e*f-s*x+i*p,B:2*x*(e-i)+s*(f-p),C:i*f+s*x+e*p,D:r*u-n*d,E:r*d+n*u,F:h,theta:o+t,color:l,idx:a,name:c})}scale(t,e){let{A:s,B:i,C:r,D:n,E:h,F:o,theta:l,color:a,idx:c,name:u}=this;return new D({A:s/t/t,B:i/t/e,C:r/e/e,D:n/t,E:h/e,F:o,theta:l,color:a,idx:c,name:u})}affine(t,e,s,i,r){return this.translate(i,r).rotate(s).scale(t,e)}project(t){return this.affine(1/t.rx,1/t.ry,-t.theta,-t.cx,-t.cy)}getDegrees(t){return this.getPoint(t*n/180)}getPoint(t){return this.invert(Math.cos(t),Math.sin(t))}containsEllipse(t){return this.contains(t.vx1)&&this.contains(t.vx2)&&this.contains(t.vy1)&&this.contains(t.vy2)}contains(t,e){if(t instanceof Array)e=t[1],t=t[0];else if("object"==typeof t&&"x"in t)e=t.y,t=t.x;else if(void 0===e)throw Error("expected y in Ellipse.contains: "+JSON.stringify(t));let[s,i]=this.transform(t,e);return s*s+i*i<=1}intersect(t){let e=this,s=e.project(t),i=s.unitIntersections();return i.map(s=>{let[i,r]=s,[n,h]=t.invert(i,r);return new A({e1:e,e2:t,x:n,y:h,c2:i,s2:r})})}unitIntersections(){let{A:t,B:e,C:s,D:i,E:r,F:n}=this,h=e*e,o=r*r,l=e*r,a=t-s,c=s+n,u=a*a+h,p=2*i*a+2*l,x=i*i+2*a*c+o-h,g=2*i*c-2*l,y=c*c-o;[u,p,x,g,y]=[u,p,x,g,y].map(d);let m=O(u,p,x,g,y),v=new Map;m.forEach(t=>{v.set(t,(v.get(t)||0)+1)});let E=[];return v.forEach((h,o)=>{let l=f(1-o*o);if(isNaN(l))return;let a=t*o*o+s*l*l+i*o+n,c=e*o*l+r*l,u=Math.abs(a+c),d=Math.abs(a-c);h>1?(E.push([o,-l]),E.push([o,l])):d<u?E.push([o,-l]):E.push([o,l])}),E}constructor(t){let e,s;if(this.idx=t.idx,this.name=t.name,"A"in t){if(isNaN(t.A))throw Error("Bad ellipse ctor: "+JSON.stringify(t));this.A=t.A,this.B=t.B,this.C=t.C,this.D=t.D,this.E=t.E,this.F=t.F,e=t.theta,t.C!==t.A&&(e=this.theta=Math.atan(t.B/(t.A-t.C))/2)}if("cx"in t)this.cx=t.cx,this.cy=t.cy,this.rx=t.rx,this.ry=t.ry,void 0!==t.degrees?s=t.degrees:e=t.theta;else{if(void 0===e)throw Error("expected t in Ellipse ctor: "+JSON.stringify(t));let s=Math.cos(e),i=Math.sin(e);if(1e-10>Math.abs(t.B)){let{A:e,C:s,D:i,E:r,F:n}=t;this.cx=-i/2/e,this.cy=-r/2/s;let h=-4*n+i*i/e+r*r/s;this.rx=f(h/e)/2,this.ry=f(h/s)/2}else{let t=this.rotate(-e),{cx:r,cy:n}=t;this.rx=t.rx,this.ry=t.ry,this.cx=s*r-i*n,this.cy=i*r+s*n}}if(this.color=t.color,void 0===e){if(void 0===s)throw Error("expected degrees in Ellipse ctor: "+JSON.stringify(t));e=s*n/180}if(void 0===s){if(void 0===e)throw Error("expected theta in Ellipse ctor: "+JSON.stringify(t));s=180*e/n}this.theta=e,this.degrees=s,this.cos=Math.cos(this.theta),this.sin=Math.sin(this.theta);let{cx:i,cy:r,rx:h,ry:o,cos:l,sin:a}=this;if("A"in t)this.A=t.A,this.B=t.B,this.C=t.C,this.D=t.D,this.E=t.E,this.F=t.F;else{let t=h*h,e=o*o,s=l*l,n=a*a,c=o*(i*l+r*a),u=h*(r*l-i*a),d=s*e+n*t,f=s*t+n*e,p=e-t;this.A=d,this.B=2*l*a*p,this.C=f,this.D=-2*(i*d+r*l*a*p),this.E=-2*(r*f+i*l*a*p),this.F=-(t*e-c*c-u*u)}this.rM=Math.max(h,o),this.rm=Math.min(h,o),this.fd=f(this.rM*this.rM-this.rm*this.rm);let c=this.fd/this.rM;this.vx1={x:i+h*l,y:r+h*a},this.vy1={x:i-o*a,y:r+o*l},this.vx2={x:2*i-this.vx1.x,y:2*r-this.vx1.y},this.vy2={x:2*i-this.vy1.x,y:2*r-this.vy1.y},this.f1={x:i+c*((h>=o?this.vx1.x:this.vy1.x)-i),y:r+c*((h>=o?this.vx1.y:this.vy1.y)-r)},this.f2={x:i-c*((h>=o?this.vx1.x:this.vy1.x)-i),y:r-c*((h>=o?this.vx1.y:this.vy1.y)-r)}}}function P(t){let{k:e,polygonArea:s,secantArea:r,area:n,containers:h,i:o,width:l,points:a,edges:c}=t;function u(){console.log("enter:",e,s,r,n)}function d(t){}let f=a.length;if(1===f){let t=c[0].e;return(0,i.jsx)("g",{transform:"translate(".concat(t.cx,",").concat(t.cy,") rotate(").concat(t.degrees,")"),children:(0,i.jsx)("ellipse",{rx:t.rx,ry:t.ry,className:h?"clear":"region",stroke:"black",strokeWidth:l,onMouseEnter:u,onMouseLeave:d})})}let p=c.map((t,e)=>{let s=a[e];return e?t.arcpath(s):t.path(s)}).join(" ");return(0,i.jsx)("path",{className:"region",d:p,stroke:"black",strokeWidth:l,onMouseEnter:u,onMouseLeave:d},o)}class _{other(t){if(t===this.p1)return this.p2;if(t===this.p2)return this.p1;throw Error("Invalid p: "+t.toString()+" in "+this.toString())}get ellipses(){let t=[...this.containers];return t[this.i]=!0,t}toString(){let t=l(this.x1,this.y1),e=l(this.x2,this.y2);return'"Edge('.concat(this.i,": ").concat(t," → ").concat(e,", ").concat(u(this.t1),"→").concat(u(this.t2),", ").concat(l(this.mp),")")}s(){return"E("+this.e.name+":"+l(this.x1,this.y1)+","+l(this.x2,this.y2)+")"}arcpath(t){let{rx:e,ry:s,e:i}=this,r=this.other(t),[h,o]=[r.x,r.y],l=this.dt>n?1:0,u=t===this.p1?1:0;return["A"+a(e,s),c(i.theta),a(l,u),a(h,o)].join(" ")}path(t){return"M"+a(t.x,t.y)+" "+this.arcpath(t)}elem(t,e){return(0,i.jsx)("path",{d:this.path(this.p1),stroke:this.e.color,strokeWidth:e,className:"edge",fill:this.e.color},t)}constructor(t){this.expectedEdgeVisits=0,this.containers=[],this.e=t.e,this.i=this.e.idx,this.j=t.j,this.rx=this.e.rx,this.ry=this.e.ry,this.t=this.e.theta,this.p1=t.p1,this.x1=this.p1.x,this.y1=this.p1.y,this.t1=this.p1.polar(this.i).t,this.p1.addEdge(this),this.p2=t.p2,this.x2=this.p2.x,this.y2=this.p2.y,this.t2=this.p2.polar(this.i).t,this.p2!==this.p1&&this.p2.addEdge(this),this.n=0,this.ps=[this.p1,this.p2],this.mt=(this.t1+this.t2+(this.t2<this.t1?h:0))/2,this.mp=this.e.getPoint(this.mt),this.dt=this.t2-this.t1,this.p1===this.p2?this.dt=h:this.dt<0&&(this.dt+=h),this.sector=this.rx*this.ry*this.dt/2,this.triangle=this.rx*this.ry*Math.sin(this.dt)/2,this.secant=this.sector-this.triangle}}let I=t=>E(t.props.points,t.props.edges);class F{constructor(t){this.ellipses=t;let e=t.map((t,e)=>(t.idx=e,t.idx)),s=e.length;this.keys=e,this.n=s;let r=[],n=[],h=[];e.forEach(t=>{h[t]=[],r[t]=[],t in n||(n[t]=[]),e.forEach(e=>{if(t<=e)n[t][e]=[];else{if(e in n||(n[e]=[]),!(t in n))throw Error("intsByExE["+t+"] is undefined");if(!n[e][t])throw Error("intsByExE["+t+"]["+e+"] is undefined");n[t][e]=n[e][t]}})});let o=[];for(let i=0;i<s-1;i++){let l=e[i],a=t[l];for(let c=i+1;c<s;c++){let s=e[c],i=t[s],u=a.intersect(i);u.length?(u.forEach((t,e)=>{t.idx=o.length+e,r[l].push(t),r[s].push(t),n[l][s].push(t)}),o=o.concat(u)):a.containsEllipse(i)?(h[l][s]=!0,i.containsEllipse(a)&&console.warn("ellipses",l,s,"mutually contain each other")):i.containsEllipse(a)&&(h[s][l]=!0)}}this.ellipses.forEach((t,e)=>{if(!r[e].length){let s=new A({e1:t,e2:t,t1:0,t2:0});s.idx=o.length,o.push(s),r[e]=[s]}}),r.forEach((t,e)=>{t.sort((t,s)=>t.polar(e).t-s.polar(e).t);let s=t.length;t.forEach((i,r)=>{i.polar(e).next=t[(r+1)%s],i.polar(e).prev=t[(r-1+s)%s]})});let l=[];n.forEach((t,e)=>{e in l||(l[e]=[]),t.forEach((t,s)=>{!t.length||s in l[e]||(l[e][s]=!0,s in l&&l[s].forEach((t,s)=>{l[e][s]=t,l[s]=l[e]}),l[s]=l[e])})});let a=[];e.forEach(t=>a[t]=[]),n.forEach((t,e)=>{let s=l[e];h.forEach((t,i)=>{h[i][e]&&!s[i]&&(a[e][i]=!0)})}),this.islands=a;let c=[],u=[];r.forEach((t,e)=>{let s=t.map(t=>{let s=t.polar(e).next,i=this.ellipses[e];e in u||(u[e]=[]);let r=new _({e:i,p1:t,p2:s,j:c.length});return c.push(r),r});s.forEach((t,e)=>{let i=s.length;t.prev=s[(e-1+i)%i],t.next=s[(e+1)%i]}),u[e]=s}),this.edgesByE=u,this.edges=c,u.forEach((e,s)=>{let i=t[s],n=r[s],h=e.length,o=0,l=0,a=[];for(;l<h;){let t=n[o],s=e[o],r=t.other(i);r!==i&&r.contains(s.mp)?(a[r.idx]=!0,r.idx in s.containers||(l=0)):(delete a[r.idx],l++),a.forEach((t,e)=>s.containers[e]=t),o=(o+1)%h}});let d=0;u.forEach(t=>t.forEach(t=>{h.forEach((e,s)=>{e[t.i]&&(t.containers[s]=!0)});let e=!0;for(let s in t.containers)if(!a[t.i][s]){e=!1;break}e?t.expectedEdgeVisits=1:t.expectedEdgeVisits=2,d+=t.expectedEdgeVisits}));let f={},g=[],v=[],M=[],k=[],b=[],w=[],S=0;for(let t=0;t<o.length&&S<d;t++)!function t(e){let s=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null,r=arguments.length>2&&void 0!==arguments[2]?arguments[2]:[],n=arguments.length>3&&void 0!==arguments[3]?arguments[3]:[],h=arguments.length>4?arguments[4]:void 0,o=arguments.length>5?arguments[5]:void 0;function l(){for(var t=arguments.length,e=Array(t),s=0;s<t;s++)e[s]=arguments[s];for(let t=0;t<(o||0);t++);}if(s&&(!n||!Object.keys(n).length))return;if(e===h){if(k.length>1){let t=k[0],e=k[k.length-1];if(t.e===e.e)return}k.forEach(t=>{k.forEach(e=>{t.j in M||(M[t.j]=[]),M[t.j][e.j]=!0})}),S+=k.length;let t=b.length,[e,r,n]=[0,0,0];if(2===t){let t=k.map((t,e)=>{let s=b[e],i=t.secant;return t.p1===s?i:-i});n=Math.abs(r=t.reduce(m))}else{e=b.map((e,s)=>{let i=b[(s+1)%t];return e.x*i.y-e.y*i.x}).reduce(m)/2;let s=k.map((t,e)=>{let s=b[e],i=t.secant;return t.p1===s?i:-i});n=Math.abs(e+(r=s.reduce(m)))}let h=Object.keys(s||[]),o=h.sort().join(""),c={};if(h.length>1){let t=Object.keys(a[k[0].i]);t.length&&j(t).forEach(t=>{let e=t.join(",");c[e]=!0})}l("containers:",p(c));let u=(0,i.jsx)(P,{k:o,containers:c,edges:[...k],points:[...b],i:g.length,width:.06,area:n,secantArea:r,polygonArea:e},g.length),x=[];return j(h).forEach(t=>{let e=t.join(",");e in c?l("skipping contained key:",e):(x.push(e),f[e]=(f[e]||0)+n)}),l("adding region:",o,"to ("+x.join(" ")+")",E(b,k),w,S,d),g.push(u),!0}if(null===e.idx)throw Error("point.idx is null");if(e.idx in v)return;let c=k.length?k[k.length-1].e:null;l("continuing point:",e.s(),p(s||[]),"existing points:",y(b)),v[e.idx]=!0,b.push(e);let u=!1;for(let i=0;i<e.edges.length;i++){let d=e.edges[i],f=(w[d.j]||0)<d.expectedEdgeVisits,g=d.e!==c,m=M[d.j]||[],v=0===k.length||!m[k[0].j];if(l("checking:",d.s(),f,"("+d.j+": "+w[d.j]+")","different ellipse:",g,"not in region with first edge:",v,"("+(k.length?k[0].s():"-")+")"),f&&g&&v){w[d.j]=(w[d.j]||0)+1,k.push(d);let[i,f,g]=s?x(s,d.ellipses):[d.ellipses,[],[]];if(s?(l("removing lost ellipses from ncr:",p(f,""),p(n,"")),f.forEach((t,e)=>{t&&delete n[e]})):(n=[],d.ellipses.forEach((t,e)=>{n[e]=t}),d.ellipses.forEach((t,e)=>{a[e].forEach((t,e)=>{delete n[e]})})),l("adding edge:",d.s(),p(d.ellipses),"lost:",p(f),"unused:",p(g)),k.length>=3&&f.length)l("lost ellipses:",p(f),y(b.concat([d.other(e)])));else{let s=x(g,r||[])[0];s&&Object.keys(s).length?l("doubly-unused ellipses:",p(s),y(b.concat([d.other(e)])),d.e.idx,"vs.",null==c?void 0:c.idx):t(d.other(e),i,g,n,h||e,(o||0)+1)&&(u=!0)}if(k.pop(),u){if(k.length>=2)break;u=!1}else w[d.j]=w[d.j]-1;l("removed edge:",d.s(),d.j,w[d.j])}}return delete v[e.idx],b.pop(),u}(o[t]);S<d&&console.error("Fewer edge visits detected than expected: "+S+" "+d+"\n"+g.map(t=>I(t)).join("\n")),this.intersections=o,this.containments=h,this.intsByE=r,this.intsByExE=n,this.areasObj=f,this.regions=g}}var J=!0;function V(t){let{ellipses:e}=t,[s,h]=(0,r.useState)(e.map(t=>new D(t))),[o,l]=(0,r.useState)(!1),[a,c]=(0,r.useState)({x:0,y:0}),[u,d]=(0,r.useState)(0);function f(t,e){c(t),d(e)}let p=(0,r.useMemo)(()=>new F(s),[s]),{intersections:x,regions:g}=(0,r.useMemo)(()=>p,[p]),y=j(Array.from(s.keys())).map(t=>({key:t.join(","),name:t.length?t.map(t=>s[t].name).join("⋂"):"*"})).sort((t,e)=>{let{key:s}=t,{key:i}=e;return v(s,i)}),m=Math.max.apply(Math,y.map(t=>t.name.length)),E=y.map(t=>{let e=p.areasObj[t.key]||0;return t.name+M(m-t.name.length)+": "+k(e/n)}).join("\n"),b=s.map((t,e)=>(0,i.jsx)(N,{idx:e+1,transformBy:s[e],ellipses:s,points:x,cursor:a,showGrid:!0,gridSize:1,projection:{x:0,y:0,s:50},onCursor:t=>f(t,e+1),hideCursorDot:u===e+1},e));return(0,i.jsxs)("div",{children:[(0,i.jsx)(N,{idx:0,ellipses:s,points:x,cursor:a,regions:g,onEllipseDrag:function(t,e){let i=[...s];i[t]=s[t].modify(e),h(i)},showGrid:!0,gridSize:1,projection:{x:0,y:0,s:50},onCursor:f,hideCursorDot:0===u},"main"),b,(0,i.jsx)("textarea",{className:"areas",onChange:()=>{},value:E}),(0,i.jsx)(C,{ellipses:s,malformedEllipses:o,onChange:function(t){try{let e=JSON.parse(t);h(e),l(!1)}catch(t){l(!0)}}})]})}}},function(t){t.O(0,[774,888,179],function(){return t(t.s=8312)}),_N_E=t.O()}]);