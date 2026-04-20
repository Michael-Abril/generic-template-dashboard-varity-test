"use strict";exports.id=4902,exports.ids=[4902],exports.modules={74902:(t,e,r)=>{r.r(e),r.d(e,{PhPlus:()=>n}),r(31325);var a=r(70460),h=r(75466),o=r(66005),i=r(28405),s=r(43961),p=Object.defineProperty,l=Object.getOwnPropertyDescriptor,d=(t,e,r,a)=>{for(var h,o=a>1?void 0:a?l(e,r):e,i=t.length-1;i>=0;i--)(h=t[i])&&(o=(a?h(e,r,o):h(o))||o);return a&&o&&p(e,r,o),o};let n=class extends h.oi{constructor(){super(...arguments),this.size="1em",this.weight="regular",this.color="currentColor",this.mirrored=!1}render(){var t;return(0,a.dy)`<svg
      xmlns="http://www.w3.org/2000/svg"
      width="${this.size}"
      height="${this.size}"
      fill="${this.color}"
      viewBox="0 0 256 256"
      transform=${this.mirrored?"scale(-1, 1)":null}
    >
      ${n.weightsMap.get(null!=(t=this.weight)?t:"regular")}
    </svg>`}};n.weightsMap=new Map([["thin",(0,a.YP)`<path d="M220,128a4,4,0,0,1-4,4H132v84a4,4,0,0,1-8,0V132H40a4,4,0,0,1,0-8h84V40a4,4,0,0,1,8,0v84h84A4,4,0,0,1,220,128Z"/>`],["light",(0,a.YP)`<path d="M222,128a6,6,0,0,1-6,6H134v82a6,6,0,0,1-12,0V134H40a6,6,0,0,1,0-12h82V40a6,6,0,0,1,12,0v82h82A6,6,0,0,1,222,128Z"/>`],["regular",(0,a.YP)`<path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>`],["bold",(0,a.YP)`<path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z"/>`],["fill",(0,a.YP)`<path d="M208,32H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM184,136H136v48a8,8,0,0,1-16,0V136H72a8,8,0,0,1,0-16h48V72a8,8,0,0,1,16,0v48h48a8,8,0,0,1,0,16Z"/>`],["duotone",(0,a.YP)`<path d="M216,56V200a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V56A16,16,0,0,1,56,40H200A16,16,0,0,1,216,56Z" opacity="0.2"/><path d="M224,128a8,8,0,0,1-8,8H136v80a8,8,0,0,1-16,0V136H40a8,8,0,0,1,0-16h80V40a8,8,0,0,1,16,0v80h80A8,8,0,0,1,224,128Z"/>`]]),n.styles=(0,s.iv)`
    :host {
      display: contents;
    }
  `,d([(0,i.C)({type:String,reflect:!0})],n.prototype,"size",2),d([(0,i.C)({type:String,reflect:!0})],n.prototype,"weight",2),d([(0,i.C)({type:String,reflect:!0})],n.prototype,"color",2),d([(0,i.C)({type:Boolean,reflect:!0})],n.prototype,"mirrored",2),n=d([(0,o.M)("ph-plus")],n)}};