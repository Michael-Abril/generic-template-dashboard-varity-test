"use strict";exports.id=219,exports.ids=[219],exports.modules={10219:(t,e,a)=>{a.r(e),a.d(e,{PhFunnelSimple:()=>n}),a(31325);var r=a(70460),i=a(75466),o=a(66005),s=a(28405),h=a(43961),p=Object.defineProperty,l=Object.getOwnPropertyDescriptor,H=(t,e,a,r)=>{for(var i,o=r>1?void 0:r?l(e,a):e,s=t.length-1;s>=0;s--)(i=t[s])&&(o=(r?i(e,a,o):i(o))||o);return r&&o&&p(e,a,o),o};let n=class extends i.oi{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var t;return(0,r.dy)`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${n.weightsMap.get(null!=(t=this.weight)?t:"regular")}
    </svg>`}};n.weightsMap=new Map([["thin",(0,r.YP)`<path d="M196,136a4,4,0,0,1-4,4H64a4,4,0,0,1,0-8H192A4,4,0,0,1,196,136Zm36-52H24a4,4,0,0,0,0,8H232a4,4,0,0,0,0-8Zm-80,96H104a4,4,0,0,0,0,8h48a4,4,0,0,0,0-8Z"/>`],["light",(0,r.YP)`<path d="M198,136a6,6,0,0,1-6,6H64a6,6,0,0,1,0-12H192A6,6,0,0,1,198,136Zm34-54H24a6,6,0,0,0,0,12H232a6,6,0,0,0,0-12Zm-80,96H104a6,6,0,0,0,0,12h48a6,6,0,0,0,0-12Z"/>`],["regular",(0,r.YP)`<path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"/>`],["bold",(0,r.YP)`<path d="M204,136a12,12,0,0,1-12,12H64a12,12,0,0,1,0-24H192A12,12,0,0,1,204,136Zm28-60H24a12,12,0,0,0,0,24H232a12,12,0,0,0,0-24Zm-80,96H104a12,12,0,0,0,0,24h48a12,12,0,0,0,0-24Z"/>`],["fill",(0,r.YP)`<path d="M216,40H40A16,16,0,0,0,24,56V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V56A16,16,0,0,0,216,40ZM144,176H112a8,8,0,0,1,0-16h32a8,8,0,0,1,0,16Zm32-40H80a8,8,0,0,1,0-16h96a8,8,0,0,1,0,16Zm32-40H48a8,8,0,0,1,0-16H208a8,8,0,0,1,0,16Z"/>`],["duotone",(0,r.YP)`<path d="M232,56V200a16,16,0,0,1-16,16H40a16,16,0,0,1-16-16V56A16,16,0,0,1,40,40H216A16,16,0,0,1,232,56Z" opacity="0.2"/><path d="M200,136a8,8,0,0,1-8,8H64a8,8,0,0,1,0-16H192A8,8,0,0,1,200,136Zm32-56H24a8,8,0,0,0,0,16H232a8,8,0,0,0,0-16Zm-80,96H104a8,8,0,0,0,0,16h48a8,8,0,0,0,0-16Z"/>`]]),n.styles=(0,h.iv)`
    :host {
      display: contents;
    }
  `,H([(0,s.C)({type:String,reflect:!0})],n.prototype,"size",2),H([(0,s.C)({type:String,reflect:!0})],n.prototype,"weight",2),H([(0,s.C)({type:String,reflect:!0})],n.prototype,"color",2),H([(0,s.C)({type:Boolean,reflect:!0})],n.prototype,"mirrored",2),n=H([(0,o.M)("ph-funnel-simple")],n)}};