"use strict";exports.id=7369,exports.ids=[7369],exports.modules={27369:(t,e,r)=>{r.r(e),r.d(e,{PhDotsThree:()=>n}),r(31325);var a=r(70460),o=r(75466),i=r(66005),s=r(28405),h=r(43961),p=Object.defineProperty,l=Object.getOwnPropertyDescriptor,d=(t,e,r,a)=>{for(var o,i=a>1?void 0:a?l(e,r):e,s=t.length-1;s>=0;s--)(o=t[s])&&(i=(a?o(e,r,i):o(i))||i);return a&&i&&p(e,r,i),i};let n=class extends o.oi{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var t;return(0,a.dy)`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${n.weightsMap.get(null!=(t=this.weight)?t:"regular")}
    </svg>`}};n.weightsMap=new Map([["thin",(0,a.YP)`<path d="M136,128a8,8,0,1,1-8-8A8,8,0,0,1,136,128Zm-76-8a8,8,0,1,0,8,8A8,8,0,0,0,60,120Zm136,0a8,8,0,1,0,8,8A8,8,0,0,0,196,120Z"/>`],["light",(0,a.YP)`<path d="M138,128a10,10,0,1,1-10-10A10,10,0,0,1,138,128ZM60,118a10,10,0,1,0,10,10A10,10,0,0,0,60,118Zm136,0a10,10,0,1,0,10,10A10,10,0,0,0,196,118Z"/>`],["regular",(0,a.YP)`<path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z"/>`],["bold",(0,a.YP)`<path d="M144,128a16,16,0,1,1-16-16A16,16,0,0,1,144,128ZM60,112a16,16,0,1,0,16,16A16,16,0,0,0,60,112Zm136,0a16,16,0,1,0,16,16A16,16,0,0,0,196,112Z"/>`],["fill",(0,a.YP)`<path d="M224,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H224a16,16,0,0,0,16-16V96A16,16,0,0,0,224,80ZM60,140a12,12,0,1,1,12-12A12,12,0,0,1,60,140Zm68,0a12,12,0,1,1,12-12A12,12,0,0,1,128,140Zm68,0a12,12,0,1,1,12-12A12,12,0,0,1,196,140Z"/>`],["duotone",(0,a.YP)`<path d="M240,96v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V96A16,16,0,0,1,32,80H224A16,16,0,0,1,240,96Z" opacity="0.2"/><path d="M140,128a12,12,0,1,1-12-12A12,12,0,0,1,140,128Zm56-12a12,12,0,1,0,12,12A12,12,0,0,0,196,116ZM60,116a12,12,0,1,0,12,12A12,12,0,0,0,60,116Z"/>`]]),n.styles=(0,h.iv)`
    :host {
      display: contents;
    }
  `,d([(0,s.C)({type:String,reflect:!0})],n.prototype,"size",2),d([(0,s.C)({type:String,reflect:!0})],n.prototype,"weight",2),d([(0,s.C)({type:String,reflect:!0})],n.prototype,"color",2),d([(0,s.C)({type:Boolean,reflect:!0})],n.prototype,"mirrored",2),n=d([(0,i.M)("ph-dots-three")],n)}};