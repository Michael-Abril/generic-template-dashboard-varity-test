exports.id=3301,exports.ids=[3301],exports.modules={10283:(e,t,r)=>{let o=r(76481),i=r(69551),n=r(77406),l=r(11e3);function a(e,t,r,n,l){let a=[].slice.call(arguments,1),s=a.length,c="function"==typeof a[s-1];if(!c&&!o())throw Error("Callback required as last argument");if(c){if(s<2)throw Error("Too few arguments provided");2===s?(l=r,r=t,t=n=void 0):3===s&&(t.getContext&&void 0===l?(l=n,n=void 0):(l=n,n=r,r=t,t=void 0))}else{if(s<1)throw Error("Too few arguments provided");return 1===s?(r=t,t=n=void 0):2!==s||t.getContext||(n=r,r=t,t=void 0),new Promise(function(o,l){try{let l=i.create(r,n);o(e(l,t,n))}catch(e){l(e)}})}try{let o=i.create(r,n);l(null,e(o,t,n))}catch(e){l(e)}}i.create,t.toCanvas=a.bind(null,n.render),a.bind(null,n.renderToDataURL),a.bind(null,function(e,t,r){return l.render(e,r)})},76481:e=>{e.exports=function(){return"function"==typeof Promise&&Promise.prototype&&Promise.prototype.then}},45696:(e,t,r)=>{let o=r(69296).getSymbolSize;t.getRowColCoords=function(e){if(1===e)return[];let t=Math.floor(e/7)+2,r=o(e),i=145===r?26:2*Math.ceil((r-13)/(2*t-2)),n=[r-7];for(let e=1;e<t-1;e++)n[e]=n[e-1]-i;return n.push(6),n.reverse()},t.getPositions=function(e){let r=[],o=t.getRowColCoords(e),i=o.length;for(let e=0;e<i;e++)for(let t=0;t<i;t++)(0!==e||0!==t)&&(0!==e||t!==i-1)&&(e!==i-1||0!==t)&&r.push([o[e],o[t]]);return r}},46333:(e,t,r)=>{let o=r(47795),i=["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"," ","$","%","*","+","-",".","/",":"];function n(e){this.mode=o.ALPHANUMERIC,this.data=e}n.getBitsLength=function(e){return 11*Math.floor(e/2)+e%2*6},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let t;for(t=0;t+2<=this.data.length;t+=2){let r=45*i.indexOf(this.data[t]);r+=i.indexOf(this.data[t+1]),e.put(r,11)}this.data.length%2&&e.put(i.indexOf(this.data[t]),6)},e.exports=n},76716:e=>{function t(){this.buffer=[],this.length=0}t.prototype={get:function(e){return(this.buffer[Math.floor(e/8)]>>>7-e%8&1)==1},put:function(e,t){for(let r=0;r<t;r++)this.putBit((e>>>t-r-1&1)==1)},getLengthInBits:function(){return this.length},putBit:function(e){let t=Math.floor(this.length/8);this.buffer.length<=t&&this.buffer.push(0),e&&(this.buffer[t]|=128>>>this.length%8),this.length++}},e.exports=t},58829:e=>{function t(e){if(!e||e<1)throw Error("BitMatrix size must be defined and greater than 0");this.size=e,this.data=new Uint8Array(e*e),this.reservedBit=new Uint8Array(e*e)}t.prototype.set=function(e,t,r,o){let i=e*this.size+t;this.data[i]=r,o&&(this.reservedBit[i]=!0)},t.prototype.get=function(e,t){return this.data[e*this.size+t]},t.prototype.xor=function(e,t,r){this.data[e*this.size+t]^=r},t.prototype.isReserved=function(e,t){return this.reservedBit[e*this.size+t]},e.exports=t},38818:(e,t,r)=>{let o=r(55402),i=r(47795);function n(e){this.mode=i.BYTE,"string"==typeof e&&(e=o(e)),this.data=new Uint8Array(e)}n.getBitsLength=function(e){return 8*e},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){for(let t=0,r=this.data.length;t<r;t++)e.put(this.data[t],8)},e.exports=n},23946:(e,t,r)=>{let o=r(22444),i=[1,1,1,1,1,1,1,1,1,1,2,2,1,2,2,4,1,2,4,4,2,4,4,4,2,4,6,5,2,4,6,6,2,5,8,8,4,5,8,8,4,5,8,11,4,8,10,11,4,9,12,16,4,9,16,16,6,10,12,18,6,10,17,16,6,11,16,19,6,13,18,21,7,14,21,25,8,16,20,25,8,17,23,25,9,17,23,34,9,18,25,30,10,20,27,32,12,21,29,35,12,23,34,37,12,25,34,40,13,26,35,42,14,28,38,45,15,29,40,48,16,31,43,51,17,33,45,54,18,35,48,57,19,37,51,60,19,38,53,63,20,40,56,66,21,43,59,70,22,45,62,74,24,47,65,77,25,49,68,81],n=[7,10,13,17,10,16,22,28,15,26,36,44,20,36,52,64,26,48,72,88,36,64,96,112,40,72,108,130,48,88,132,156,60,110,160,192,72,130,192,224,80,150,224,264,96,176,260,308,104,198,288,352,120,216,320,384,132,240,360,432,144,280,408,480,168,308,448,532,180,338,504,588,196,364,546,650,224,416,600,700,224,442,644,750,252,476,690,816,270,504,750,900,300,560,810,960,312,588,870,1050,336,644,952,1110,360,700,1020,1200,390,728,1050,1260,420,784,1140,1350,450,812,1200,1440,480,868,1290,1530,510,924,1350,1620,540,980,1440,1710,570,1036,1530,1800,570,1064,1590,1890,600,1120,1680,1980,630,1204,1770,2100,660,1260,1860,2220,720,1316,1950,2310,750,1372,2040,2430];t.getBlocksCount=function(e,t){switch(t){case o.L:return i[(e-1)*4+0];case o.M:return i[(e-1)*4+1];case o.Q:return i[(e-1)*4+2];case o.H:return i[(e-1)*4+3];default:return}},t.getTotalCodewordsCount=function(e,t){switch(t){case o.L:return n[(e-1)*4+0];case o.M:return n[(e-1)*4+1];case o.Q:return n[(e-1)*4+2];case o.H:return n[(e-1)*4+3];default:return}}},22444:(e,t)=>{t.L={bit:1},t.M={bit:0},t.Q={bit:3},t.H={bit:2},t.isValid=function(e){return e&&void 0!==e.bit&&e.bit>=0&&e.bit<4},t.from=function(e,r){if(t.isValid(e))return e;try{return function(e){if("string"!=typeof e)throw Error("Param is not a string");switch(e.toLowerCase()){case"l":case"low":return t.L;case"m":case"medium":return t.M;case"q":case"quartile":return t.Q;case"h":case"high":return t.H;default:throw Error("Unknown EC Level: "+e)}}(e)}catch(e){return r}}},33079:(e,t,r)=>{let o=r(69296).getSymbolSize;t.getPositions=function(e){let t=o(e);return[[0,0],[t-7,0],[0,t-7]]}},86330:(e,t,r)=>{let o=r(69296),i=o.getBCHDigit(1335);t.getEncodedBits=function(e,t){let r=e.bit<<3|t,n=r<<10;for(;o.getBCHDigit(n)-i>=0;)n^=1335<<o.getBCHDigit(n)-i;return(r<<10|n)^21522}},49669:(e,t)=>{let r=new Uint8Array(512),o=new Uint8Array(256);(function(){let e=1;for(let t=0;t<255;t++)r[t]=e,o[e]=t,256&(e<<=1)&&(e^=285);for(let e=255;e<512;e++)r[e]=r[e-255]})(),t.log=function(e){if(e<1)throw Error("log("+e+")");return o[e]},t.exp=function(e){return r[e]},t.mul=function(e,t){return 0===e||0===t?0:r[o[e]+o[t]]}},8812:(e,t,r)=>{let o=r(47795),i=r(69296);function n(e){this.mode=o.KANJI,this.data=e}n.getBitsLength=function(e){return 13*e},n.prototype.getLength=function(){return this.data.length},n.prototype.getBitsLength=function(){return n.getBitsLength(this.data.length)},n.prototype.write=function(e){let t;for(t=0;t<this.data.length;t++){let r=i.toSJIS(this.data[t]);if(r>=33088&&r<=40956)r-=33088;else if(r>=57408&&r<=60351)r-=49472;else throw Error("Invalid SJIS character: "+this.data[t]+"\nMake sure your charset is UTF-8");r=(r>>>8&255)*192+(255&r),e.put(r,13)}},e.exports=n},33190:(e,t)=>{t.Patterns={PATTERN000:0,PATTERN001:1,PATTERN010:2,PATTERN011:3,PATTERN100:4,PATTERN101:5,PATTERN110:6,PATTERN111:7};let r={N1:3,N2:3,N3:40,N4:10};t.isValid=function(e){return null!=e&&""!==e&&!isNaN(e)&&e>=0&&e<=7},t.from=function(e){return t.isValid(e)?parseInt(e,10):void 0},t.getPenaltyN1=function(e){let t=e.size,o=0,i=0,n=0,l=null,a=null;for(let s=0;s<t;s++){i=n=0,l=a=null;for(let c=0;c<t;c++){let t=e.get(s,c);t===l?i++:(i>=5&&(o+=r.N1+(i-5)),l=t,i=1),(t=e.get(c,s))===a?n++:(n>=5&&(o+=r.N1+(n-5)),a=t,n=1)}i>=5&&(o+=r.N1+(i-5)),n>=5&&(o+=r.N1+(n-5))}return o},t.getPenaltyN2=function(e){let t=e.size,o=0;for(let r=0;r<t-1;r++)for(let i=0;i<t-1;i++){let t=e.get(r,i)+e.get(r,i+1)+e.get(r+1,i)+e.get(r+1,i+1);(4===t||0===t)&&o++}return o*r.N2},t.getPenaltyN3=function(e){let t=e.size,o=0,i=0,n=0;for(let r=0;r<t;r++){i=n=0;for(let l=0;l<t;l++)i=i<<1&2047|e.get(r,l),l>=10&&(1488===i||93===i)&&o++,n=n<<1&2047|e.get(l,r),l>=10&&(1488===n||93===n)&&o++}return o*r.N3},t.getPenaltyN4=function(e){let t=0,o=e.data.length;for(let r=0;r<o;r++)t+=e.data[r];return Math.abs(Math.ceil(100*t/o/5)-10)*r.N4},t.applyMask=function(e,r){let o=r.size;for(let i=0;i<o;i++)for(let n=0;n<o;n++)r.isReserved(n,i)||r.xor(n,i,function(e,r,o){switch(e){case t.Patterns.PATTERN000:return(r+o)%2==0;case t.Patterns.PATTERN001:return r%2==0;case t.Patterns.PATTERN010:return o%3==0;case t.Patterns.PATTERN011:return(r+o)%3==0;case t.Patterns.PATTERN100:return(Math.floor(r/2)+Math.floor(o/3))%2==0;case t.Patterns.PATTERN101:return r*o%2+r*o%3==0;case t.Patterns.PATTERN110:return(r*o%2+r*o%3)%2==0;case t.Patterns.PATTERN111:return(r*o%3+(r+o)%2)%2==0;default:throw Error("bad maskPattern:"+e)}}(e,n,i))},t.getBestMask=function(e,r){let o=Object.keys(t.Patterns).length,i=0,n=1/0;for(let l=0;l<o;l++){r(l),t.applyMask(l,e);let o=t.getPenaltyN1(e)+t.getPenaltyN2(e)+t.getPenaltyN3(e)+t.getPenaltyN4(e);t.applyMask(l,e),o<n&&(n=o,i=l)}return i}},47795:(e,t,r)=>{let o=r(66089),i=r(90202);t.NUMERIC={id:"Numeric",bit:1,ccBits:[10,12,14]},t.ALPHANUMERIC={id:"Alphanumeric",bit:2,ccBits:[9,11,13]},t.BYTE={id:"Byte",bit:4,ccBits:[8,16,16]},t.KANJI={id:"Kanji",bit:8,ccBits:[8,10,12]},t.MIXED={bit:-1},t.getCharCountIndicator=function(e,t){if(!e.ccBits)throw Error("Invalid mode: "+e);if(!o.isValid(t))throw Error("Invalid version: "+t);return t>=1&&t<10?e.ccBits[0]:t<27?e.ccBits[1]:e.ccBits[2]},t.getBestModeForData=function(e){return i.testNumeric(e)?t.NUMERIC:i.testAlphanumeric(e)?t.ALPHANUMERIC:i.testKanji(e)?t.KANJI:t.BYTE},t.toString=function(e){if(e&&e.id)return e.id;throw Error("Invalid mode")},t.isValid=function(e){return e&&e.bit&&e.ccBits},t.from=function(e,r){if(t.isValid(e))return e;try{return function(e){if("string"!=typeof e)throw Error("Param is not a string");switch(e.toLowerCase()){case"numeric":return t.NUMERIC;case"alphanumeric":return t.ALPHANUMERIC;case"kanji":return t.KANJI;case"byte":return t.BYTE;default:throw Error("Unknown mode: "+e)}}(e)}catch(e){return r}}},16302:(e,t,r)=>{let o=r(47795);function i(e){this.mode=o.NUMERIC,this.data=e.toString()}i.getBitsLength=function(e){return 10*Math.floor(e/3)+(e%3?e%3*3+1:0)},i.prototype.getLength=function(){return this.data.length},i.prototype.getBitsLength=function(){return i.getBitsLength(this.data.length)},i.prototype.write=function(e){let t,r;for(t=0;t+3<=this.data.length;t+=3)r=parseInt(this.data.substr(t,3),10),e.put(r,10);let o=this.data.length-t;o>0&&(r=parseInt(this.data.substr(t),10),e.put(r,3*o+1))},e.exports=i},80480:(e,t,r)=>{let o=r(49669);t.mul=function(e,t){let r=new Uint8Array(e.length+t.length-1);for(let i=0;i<e.length;i++)for(let n=0;n<t.length;n++)r[i+n]^=o.mul(e[i],t[n]);return r},t.mod=function(e,t){let r=new Uint8Array(e);for(;r.length-t.length>=0;){let e=r[0];for(let i=0;i<t.length;i++)r[i]^=o.mul(t[i],e);let i=0;for(;i<r.length&&0===r[i];)i++;r=r.slice(i)}return r},t.generateECPolynomial=function(e){let r=new Uint8Array([1]);for(let i=0;i<e;i++)r=t.mul(r,new Uint8Array([1,o.exp(i)]));return r}},69551:(e,t,r)=>{let o=r(69296),i=r(22444),n=r(76716),l=r(58829),a=r(45696),s=r(33079),c=r(33190),d=r(23946),u=r(95592),h=r(88404),p=r(86330),f=r(47795),g=r(54256);function w(e,t,r){let o,i;let n=e.size,l=p.getEncodedBits(t,r);for(o=0;o<15;o++)i=(l>>o&1)==1,o<6?e.set(o,8,i,!0):o<8?e.set(o+1,8,i,!0):e.set(n-15+o,8,i,!0),o<8?e.set(8,n-o-1,i,!0):o<9?e.set(8,15-o-1+1,i,!0):e.set(8,15-o-1,i,!0);e.set(n-8,8,1,!0)}t.create=function(e,t){let r,p;if(void 0===e||""===e)throw Error("No input text");let m=i.M;return void 0!==t&&(m=i.from(t.errorCorrectionLevel,i.M),r=h.from(t.version),p=c.from(t.maskPattern),t.toSJISFunc&&o.setToSJISFunction(t.toSJISFunc)),function(e,t,r,i){let p;if(Array.isArray(e))p=g.fromArray(e);else if("string"==typeof e){let o=t;if(!o){let t=g.rawSplit(e);o=h.getBestVersionForData(t,r)}p=g.fromString(e,o||40)}else throw Error("Invalid data");let m=h.getBestVersionForData(p,r);if(!m)throw Error("The amount of data is too big to be stored in a QR Code");if(t){if(t<m)throw Error("\nThe chosen QR Code version cannot contain this amount of data.\nMinimum version required to store current data is: "+m+".\n")}else t=m;let b=function(e,t,r){let i=new n;r.forEach(function(t){i.put(t.mode.bit,4),i.put(t.getLength(),f.getCharCountIndicator(t.mode,e)),t.write(i)});let l=(o.getSymbolTotalCodewords(e)-d.getTotalCodewordsCount(e,t))*8;for(i.getLengthInBits()+4<=l&&i.put(0,4);i.getLengthInBits()%8!=0;)i.putBit(0);let a=(l-i.getLengthInBits())/8;for(let e=0;e<a;e++)i.put(e%2?17:236,8);return function(e,t,r){let i,n;let l=o.getSymbolTotalCodewords(t),a=l-d.getTotalCodewordsCount(t,r),s=d.getBlocksCount(t,r),c=l%s,h=s-c,p=Math.floor(l/s),f=Math.floor(a/s),g=f+1,w=p-f,m=new u(w),b=0,y=Array(s),v=Array(s),C=0,x=new Uint8Array(e.buffer);for(let e=0;e<s;e++){let t=e<h?f:g;y[e]=x.slice(b,b+t),v[e]=m.encode(y[e]),b+=t,C=Math.max(C,t)}let $=new Uint8Array(l),k=0;for(i=0;i<C;i++)for(n=0;n<s;n++)i<y[n].length&&($[k++]=y[n][i]);for(i=0;i<w;i++)for(n=0;n<s;n++)$[k++]=v[n][i];return $}(i,e,t)}(t,r,p),y=new l(o.getSymbolSize(t));return function(e,t){let r=e.size,o=s.getPositions(t);for(let t=0;t<o.length;t++){let i=o[t][0],n=o[t][1];for(let t=-1;t<=7;t++)if(!(i+t<=-1)&&!(r<=i+t))for(let o=-1;o<=7;o++)n+o<=-1||r<=n+o||(t>=0&&t<=6&&(0===o||6===o)||o>=0&&o<=6&&(0===t||6===t)||t>=2&&t<=4&&o>=2&&o<=4?e.set(i+t,n+o,!0,!0):e.set(i+t,n+o,!1,!0))}}(y,t),function(e){let t=e.size;for(let r=8;r<t-8;r++){let t=r%2==0;e.set(r,6,t,!0),e.set(6,r,t,!0)}}(y),function(e,t){let r=a.getPositions(t);for(let t=0;t<r.length;t++){let o=r[t][0],i=r[t][1];for(let t=-2;t<=2;t++)for(let r=-2;r<=2;r++)-2===t||2===t||-2===r||2===r||0===t&&0===r?e.set(o+t,i+r,!0,!0):e.set(o+t,i+r,!1,!0)}}(y,t),w(y,r,0),t>=7&&function(e,t){let r,o,i;let n=e.size,l=h.getEncodedBits(t);for(let t=0;t<18;t++)r=Math.floor(t/3),o=t%3+n-8-3,i=(l>>t&1)==1,e.set(r,o,i,!0),e.set(o,r,i,!0)}(y,t),function(e,t){let r=e.size,o=-1,i=r-1,n=7,l=0;for(let a=r-1;a>0;a-=2)for(6===a&&a--;;){for(let r=0;r<2;r++)if(!e.isReserved(i,a-r)){let o=!1;l<t.length&&(o=(t[l]>>>n&1)==1),e.set(i,a-r,o),-1==--n&&(l++,n=7)}if((i+=o)<0||r<=i){i-=o,o=-o;break}}}(y,b),isNaN(i)&&(i=c.getBestMask(y,w.bind(null,y,r))),c.applyMask(i,y),w(y,r,i),{modules:y,version:t,errorCorrectionLevel:r,maskPattern:i,segments:p}}(e,r,m,p)}},95592:(e,t,r)=>{let o=r(80480);function i(e){this.genPoly=void 0,this.degree=e,this.degree&&this.initialize(this.degree)}i.prototype.initialize=function(e){this.degree=e,this.genPoly=o.generateECPolynomial(this.degree)},i.prototype.encode=function(e){if(!this.genPoly)throw Error("Encoder not initialized");let t=new Uint8Array(e.length+this.degree);t.set(e);let r=o.mod(t,this.genPoly),i=this.degree-r.length;if(i>0){let e=new Uint8Array(this.degree);return e.set(r,i),e}return r},e.exports=i},90202:(e,t)=>{let r="[0-9]+",o="(?:[u3000-u303F]|[u3040-u309F]|[u30A0-u30FF]|[uFF00-uFFEF]|[u4E00-u9FAF]|[u2605-u2606]|[u2190-u2195]|u203B|[u2010u2015u2018u2019u2025u2026u201Cu201Du2225u2260]|[u0391-u0451]|[u00A7u00A8u00B1u00B4u00D7u00F7])+",i="(?:(?![A-Z0-9 $%*+\\-./:]|"+(o=o.replace(/u/g,"\\u"))+")(?:.|[\r\n]))+";t.KANJI=RegExp(o,"g"),t.BYTE_KANJI=RegExp("[^A-Z0-9 $%*+\\-./:]+","g"),t.BYTE=RegExp(i,"g"),t.NUMERIC=RegExp(r,"g"),t.ALPHANUMERIC=RegExp("[A-Z $%*+\\-./:]+","g");let n=RegExp("^"+o+"$"),l=RegExp("^"+r+"$"),a=RegExp("^[A-Z0-9 $%*+\\-./:]+$");t.testKanji=function(e){return n.test(e)},t.testNumeric=function(e){return l.test(e)},t.testAlphanumeric=function(e){return a.test(e)}},54256:(e,t,r)=>{let o=r(47795),i=r(16302),n=r(46333),l=r(38818),a=r(8812),s=r(90202),c=r(69296),d=r(24414);function u(e){return unescape(encodeURIComponent(e)).length}function h(e,t,r){let o;let i=[];for(;null!==(o=e.exec(r));)i.push({data:o[0],index:o.index,mode:t,length:o[0].length});return i}function p(e){let t,r;let i=h(s.NUMERIC,o.NUMERIC,e),n=h(s.ALPHANUMERIC,o.ALPHANUMERIC,e);return c.isKanjiModeEnabled()?(t=h(s.BYTE,o.BYTE,e),r=h(s.KANJI,o.KANJI,e)):(t=h(s.BYTE_KANJI,o.BYTE,e),r=[]),i.concat(n,t,r).sort(function(e,t){return e.index-t.index}).map(function(e){return{data:e.data,mode:e.mode,length:e.length}})}function f(e,t){switch(t){case o.NUMERIC:return i.getBitsLength(e);case o.ALPHANUMERIC:return n.getBitsLength(e);case o.KANJI:return a.getBitsLength(e);case o.BYTE:return l.getBitsLength(e)}}function g(e,t){let r;let s=o.getBestModeForData(e);if((r=o.from(t,s))!==o.BYTE&&r.bit<s.bit)throw Error('"'+e+'" cannot be encoded with mode '+o.toString(r)+".\n Suggested mode is: "+o.toString(s));switch(r!==o.KANJI||c.isKanjiModeEnabled()||(r=o.BYTE),r){case o.NUMERIC:return new i(e);case o.ALPHANUMERIC:return new n(e);case o.KANJI:return new a(e);case o.BYTE:return new l(e)}}t.fromArray=function(e){return e.reduce(function(e,t){return"string"==typeof t?e.push(g(t,null)):t.data&&e.push(g(t.data,t.mode)),e},[])},t.fromString=function(e,r){let i=function(e,t){let r={},i={start:{}},n=["start"];for(let l=0;l<e.length;l++){let a=e[l],s=[];for(let e=0;e<a.length;e++){let c=a[e],d=""+l+e;s.push(d),r[d]={node:c,lastCount:0},i[d]={};for(let e=0;e<n.length;e++){let l=n[e];r[l]&&r[l].node.mode===c.mode?(i[l][d]=f(r[l].lastCount+c.length,c.mode)-f(r[l].lastCount,c.mode),r[l].lastCount+=c.length):(r[l]&&(r[l].lastCount=c.length),i[l][d]=f(c.length,c.mode)+4+o.getCharCountIndicator(c.mode,t))}}n=s}for(let e=0;e<n.length;e++)i[n[e]].end=0;return{map:i,table:r}}(function(e){let t=[];for(let r=0;r<e.length;r++){let i=e[r];switch(i.mode){case o.NUMERIC:t.push([i,{data:i.data,mode:o.ALPHANUMERIC,length:i.length},{data:i.data,mode:o.BYTE,length:i.length}]);break;case o.ALPHANUMERIC:t.push([i,{data:i.data,mode:o.BYTE,length:i.length}]);break;case o.KANJI:t.push([i,{data:i.data,mode:o.BYTE,length:u(i.data)}]);break;case o.BYTE:t.push([{data:i.data,mode:o.BYTE,length:u(i.data)}])}}return t}(p(e,c.isKanjiModeEnabled())),r),n=d.find_path(i.map,"start","end"),l=[];for(let e=1;e<n.length-1;e++)l.push(i.table[n[e]].node);return t.fromArray(l.reduce(function(e,t){let r=e.length-1>=0?e[e.length-1]:null;return r&&r.mode===t.mode?e[e.length-1].data+=t.data:e.push(t),e},[]))},t.rawSplit=function(e){return t.fromArray(p(e,c.isKanjiModeEnabled()))}},69296:(e,t)=>{let r;let o=[0,26,44,70,100,134,172,196,242,292,346,404,466,532,581,655,733,815,901,991,1085,1156,1258,1364,1474,1588,1706,1828,1921,2051,2185,2323,2465,2611,2761,2876,3034,3196,3362,3532,3706];t.getSymbolSize=function(e){if(!e)throw Error('"version" cannot be null or undefined');if(e<1||e>40)throw Error('"version" should be in range from 1 to 40');return 4*e+17},t.getSymbolTotalCodewords=function(e){return o[e]},t.getBCHDigit=function(e){let t=0;for(;0!==e;)t++,e>>>=1;return t},t.setToSJISFunction=function(e){if("function"!=typeof e)throw Error('"toSJISFunc" is not a valid function.');r=e},t.isKanjiModeEnabled=function(){return void 0!==r},t.toSJIS=function(e){return r(e)}},66089:(e,t)=>{t.isValid=function(e){return!isNaN(e)&&e>=1&&e<=40}},88404:(e,t,r)=>{let o=r(69296),i=r(23946),n=r(22444),l=r(47795),a=r(66089),s=o.getBCHDigit(7973);function c(e,t){return l.getCharCountIndicator(e,t)+4}t.from=function(e,t){return a.isValid(e)?parseInt(e,10):t},t.getCapacity=function(e,t,r){if(!a.isValid(e))throw Error("Invalid QR Code version");void 0===r&&(r=l.BYTE);let n=(o.getSymbolTotalCodewords(e)-i.getTotalCodewordsCount(e,t))*8;if(r===l.MIXED)return n;let s=n-c(r,e);switch(r){case l.NUMERIC:return Math.floor(s/10*3);case l.ALPHANUMERIC:return Math.floor(s/11*2);case l.KANJI:return Math.floor(s/13);case l.BYTE:default:return Math.floor(s/8)}},t.getBestVersionForData=function(e,r){let o;let i=n.from(r,n.M);if(Array.isArray(e)){if(e.length>1)return function(e,r){for(let o=1;o<=40;o++)if(function(e,t){let r=0;return e.forEach(function(e){let o=c(e.mode,t);r+=o+e.getBitsLength()}),r}(e,o)<=t.getCapacity(o,r,l.MIXED))return o}(e,i);if(0===e.length)return 1;o=e[0]}else o=e;return function(e,r,o){for(let i=1;i<=40;i++)if(r<=t.getCapacity(i,o,e))return i}(o.mode,o.getLength(),i)},t.getEncodedBits=function(e){if(!a.isValid(e)||e<7)throw Error("Invalid QR Code version");let t=e<<12;for(;o.getBCHDigit(t)-s>=0;)t^=7973<<o.getBCHDigit(t)-s;return e<<12|t}},63523:(e,t,r)=>{"use strict";e.exports=r(73448)},77406:(e,t,r)=>{let o=r(33821);t.render=function(e,t,r){var i;let n=r,l=t;void 0!==n||t&&t.getContext||(n=t,t=void 0),t||(l=function(){try{return document.createElement("canvas")}catch(e){throw Error("You need to specify a canvas element")}}()),n=o.getOptions(n);let a=o.getImageWidth(e.modules.size,n),s=l.getContext("2d"),c=s.createImageData(a,a);return o.qrToImageData(c.data,e,n),i=l,s.clearRect(0,0,i.width,i.height),i.style||(i.style={}),i.height=a,i.width=a,i.style.height=a+"px",i.style.width=a+"px",s.putImageData(c,0,0),l},t.renderToDataURL=function(e,r,o){let i=o;void 0!==i||r&&r.getContext||(i=r,r=void 0),i||(i={});let n=t.render(e,r,i),l=i.type||"image/png",a=i.rendererOpts||{};return n.toDataURL(l,a.quality)}},64011:(e,t,r)=>{let o=r(92048),i=r(81687).y,n=r(33821);t.render=function(e,t){let r=n.getOptions(t),o=r.rendererOpts,l=n.getImageWidth(e.modules.size,r);o.width=l,o.height=l;let a=new i(o);return n.qrToImageData(a.data,e,r),a},t.renderToDataURL=function(e,r,o){void 0===o&&(o=r,r=void 0),t.renderToBuffer(e,r,function(e,t){e&&o(e);let r="data:image/png;base64,";r+=t.toString("base64"),o(null,r)})},t.renderToBuffer=function(e,r,o){void 0===o&&(o=r,r=void 0);let i=t.render(e,r),n=[];i.on("error",o),i.on("data",function(e){n.push(e)}),i.on("end",function(){o(null,Buffer.concat(n))}),i.pack()},t.renderToFile=function(e,r,i,n){void 0===n&&(n=i,i=void 0);let l=!1,a=(...e)=>{l||(l=!0,n.apply(null,e))},s=o.createWriteStream(e);s.on("error",a),s.on("close",a),t.renderToFileStream(s,r,i)},t.renderToFileStream=function(e,r,o){t.render(r,o).pack().pipe(e)}},11e3:(e,t,r)=>{let o=r(33821);function i(e,t){let r=e.a/255,o=t+'="'+e.hex+'"';return r<1?o+" "+t+'-opacity="'+r.toFixed(2).slice(1)+'"':o}function n(e,t,r){let o=e+t;return void 0!==r&&(o+=" "+r),o}t.render=function(e,t,r){let l=o.getOptions(t),a=e.modules.size,s=e.modules.data,c=a+2*l.margin,d=l.color.light.a?"<path "+i(l.color.light,"fill")+' d="M0 0h'+c+"v"+c+'H0z"/>':"",u="<path "+i(l.color.dark,"stroke")+' d="'+function(e,t,r){let o="",i=0,l=!1,a=0;for(let s=0;s<e.length;s++){let c=Math.floor(s%t),d=Math.floor(s/t);c||l||(l=!0),e[s]?(a++,s>0&&c>0&&e[s-1]||(o+=l?n("M",c+r,.5+d+r):n("m",i,0),i=0,l=!1),c+1<t&&e[s+1]||(o+=n("h",a),a=0)):i++}return o}(s,a,l.margin)+'"/>',h='<svg xmlns="http://www.w3.org/2000/svg" '+(l.width?'width="'+l.width+'" height="'+l.width+'" ':"")+('viewBox="0 0 '+c)+" "+c+'" shape-rendering="crispEdges">'+d+u+"</svg>\n";return"function"==typeof r&&r(null,h),h}},98186:(e,t,r)=>{let o=r(11e3);t.render=o.render,t.renderToFile=function(e,o,i,n){void 0===n&&(n=i,i=void 0);let l=r(92048),a=t.render(o,i);l.writeFile(e,'<?xml version="1.0" encoding="utf-8"?><!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" "http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">'+a,n)}},29349:(e,t,r)=>{let o=r(1633),i=r(38959);t.render=function(e,t,r){return t&&t.small?i.render(e,t,r):o.render(e,t,r)}},38959:(e,t)=>{let r="\x1b[37m",o="\x1b[30m",i="\x1b[0m",n="\x1b[47m"+o,l="\x1b[40m"+r,a=function(e,t,r,o){let i=t+1;return r>=i||o>=i||o<-1||r<-1?"0":r>=t||o>=t||o<0||r<0?"1":e[o*t+r]?"2":"1"},s=function(e,t,r,o){return a(e,t,r,o)+a(e,t,r,o+1)};t.render=function(e,t,a){var c,d;let u=e.modules.size,h=e.modules.data,p=!!(t&&t.inverse),f=t&&t.inverse?l:n,g={"00":i+" "+f,"01":i+(c=p?o:r)+"▄"+f,"02":i+(d=p?r:o)+"▄"+f,10:i+c+"▀"+f,11:" ",12:"▄",20:i+d+"▀"+f,21:"▀",22:"█"},w=i+"\n"+f,m=f;for(let e=-1;e<u+1;e+=2){for(let t=-1;t<u;t++)m+=g[s(h,u,t,e)];m+=g[s(h,u,u,e)]+w}return m+=i,"function"==typeof a&&a(null,m),m}},1633:(e,t)=>{t.render=function(e,t,r){let o=e.modules.size,i=e.modules.data,n="\x1b[47m  \x1b[0m",l="",a=Array(o+3).join(n),s=[,,].join(n);l+=a+"\n";for(let e=0;e<o;++e){l+=n;for(let t=0;t<o;t++)l+=i[e*o+t]?"\x1b[40m  \x1b[0m":n;l+=s+"\n"}return l+=a+"\n","function"==typeof r&&r(null,l),l}},62357:(e,t,r)=>{let o=r(33821),i={WW:" ",WB:"▄",BB:"█",BW:"▀"},n={BB:" ",BW:"▄",WW:"█",WB:"▀"};t.render=function(e,t,r){let l=o.getOptions(t),a=i;("#ffffff"===l.color.dark.hex||"#000000"===l.color.light.hex)&&(a=n);let s=e.modules.size,c=e.modules.data,d="",u=Array(s+2*l.margin+1).join(a.WW);u=Array(l.margin/2+1).join(u+"\n");let h=Array(l.margin+1).join(a.WW);d+=u;for(let e=0;e<s;e+=2){d+=h;for(let t=0;t<s;t++){var p;let r=c[e*s+t],o=c[(e+1)*s+t];d+=(p=a,r&&o?p.BB:r&&!o?p.BW:!r&&o?p.WB:p.WW)}d+=h+"\n"}return d+=u.slice(0,-1),"function"==typeof r&&r(null,d),d},t.renderToFile=function(e,o,i,n){void 0===n&&(n=i,i=void 0);let l=r(92048),a=t.render(o,i);l.writeFile(e,a,n)}},33821:(e,t)=>{function r(e){if("number"==typeof e&&(e=e.toString()),"string"!=typeof e)throw Error("Color should be defined as hex string");let t=e.slice().replace("#","").split("");if(t.length<3||5===t.length||t.length>8)throw Error("Invalid hex color: "+e);(3===t.length||4===t.length)&&(t=Array.prototype.concat.apply([],t.map(function(e){return[e,e]}))),6===t.length&&t.push("F","F");let r=parseInt(t.join(""),16);return{r:r>>24&255,g:r>>16&255,b:r>>8&255,a:255&r,hex:"#"+t.slice(0,6).join("")}}t.getOptions=function(e){e||(e={}),e.color||(e.color={});let t=void 0===e.margin||null===e.margin||e.margin<0?4:e.margin,o=e.width&&e.width>=21?e.width:void 0,i=e.scale||4;return{width:o,scale:o?4:i,margin:t,color:{dark:r(e.color.dark||"#000000ff"),light:r(e.color.light||"#ffffffff")},type:e.type,rendererOpts:e.rendererOpts||{}}},t.getScale=function(e,t){return t.width&&t.width>=e+2*t.margin?t.width/(e+2*t.margin):t.scale},t.getImageWidth=function(e,r){let o=t.getScale(e,r);return Math.floor((e+2*r.margin)*o)},t.qrToImageData=function(e,r,o){let i=r.modules.size,n=r.modules.data,l=t.getScale(i,o),a=Math.floor((i+2*o.margin)*l),s=o.margin*l,c=[o.color.light,o.color.dark];for(let t=0;t<a;t++)for(let r=0;r<a;r++){let d=(t*a+r)*4,u=o.color.light;t>=s&&r>=s&&t<a-s&&r<a-s&&(u=c[n[Math.floor((t-s)/l)*i+Math.floor((r-s)/l)]?1:0]),e[d++]=u.r,e[d++]=u.g,e[d++]=u.b,e[d]=u.a}}},73448:(e,t,r)=>{let o=r(76481),i=r(69551),n=r(64011),l=r(62357),a=r(29349),s=r(98186);function c(e,t,r){if(void 0===e)throw Error("String required as first argument");if(void 0===r&&(r=t,t={}),"function"!=typeof r){if(o())t=r||{},r=null;else throw Error("Callback required as last argument")}return{opts:t,cb:r}}function d(e){switch(e){case"svg":return s;case"txt":case"utf8":return l;default:return n}}function u(e,t,r){if(!r.cb)return new Promise(function(o,n){try{let l=i.create(t,r.opts);return e(l,r.opts,function(e,t){return e?n(e):o(t)})}catch(e){n(e)}});try{let o=i.create(t,r.opts);return e(o,r.opts,r.cb)}catch(e){r.cb(e)}}t.create=i.create,t.toCanvas=r(10283).toCanvas,t.toString=function(e,t,r){let o=c(e,t,r);return u(function(e){switch(e){case"svg":return s;case"terminal":return a;default:return l}}(o.opts?o.opts.type:void 0).render,e,o)},t.toDataURL=function(e,t,r){let o=c(e,t,r);return u(d(o.opts.type).renderToDataURL,e,o)},t.toBuffer=function(e,t,r){let o=c(e,t,r);return u(d(o.opts.type).renderToBuffer,e,o)},t.toFile=function(e,t,r,i){if("string"!=typeof e||!("string"==typeof t||"object"==typeof t))throw Error("Invalid argument");if(arguments.length<3&&!o())throw Error("Too few arguments provided");let n=c(t,r,i);return u(d(n.opts.type||e.slice((e.lastIndexOf(".")-1>>>0)+2).toLowerCase()).renderToFile.bind(null,e),t,n)},t.toFileStream=function(e,t,r){if(arguments.length<2)throw Error("Too few arguments provided");let o=c(t,r,e.emit.bind(e,"error"));u(d("png").renderToFileStream.bind(null,e),t,o)}},55402:e=>{"use strict";e.exports=function(e){for(var t=[],r=e.length,o=0;o<r;o++){var i=e.charCodeAt(o);if(i>=55296&&i<=56319&&r>o+1){var n=e.charCodeAt(o+1);n>=56320&&n<=57343&&(i=(i-55296)*1024+n-56320+65536,o+=1)}if(i<128){t.push(i);continue}if(i<2048){t.push(i>>6|192),t.push(63&i|128);continue}if(i<55296||i>=57344&&i<65536){t.push(i>>12|224),t.push(i>>6&63|128),t.push(63&i|128);continue}if(i>=65536&&i<=1114111){t.push(i>>18|240),t.push(i>>12&63|128),t.push(i>>6&63|128),t.push(63&i|128);continue}t.push(239,191,189)}return new Uint8Array(t).buffer}},3301:(e,t,r)=>{"use strict";r.r(t),r.d(t,{W3mAllWalletsView:()=>tu,W3mConnectingWcBasicView:()=>eS,W3mDownloadsView:()=>tg});var o=r(685),i=r(9829),n=r(34862),l=r(30288),a=r(28488),s=r(71878),c=r(84194);r(69418);var d=r(83479),u=r(64895),h=r(9346),p=r(35190),f=r(77870),g=r(14212);r(39096);var w=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let m=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.tabIdx=void 0,this.connectors=h.ConnectorController.state.connectors,this.count=a.ApiController.state.count,this.filteredCount=a.ApiController.state.filteredWallets.length,this.isFetchingRecommendedWallets=a.ApiController.state.isFetchingRecommendedWallets,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),a.ApiController.subscribeKey("count",e=>this.count=e),a.ApiController.subscribeKey("filteredWallets",e=>this.filteredCount=e.length),a.ApiController.subscribeKey("isFetchingRecommendedWallets",e=>this.isFetchingRecommendedWallets=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.connectors.find(e=>"walletConnect"===e.id),{allWallets:t}=l.OptionsController.state;if(!e||"HIDE"===t||"ONLY_MOBILE"===t&&!n.j.isMobile())return null;let r=a.ApiController.state.featured.length,i=this.count+r,s=this.filteredCount>0?this.filteredCount:i<10?i:10*Math.floor(i/10),c=`${s}`;this.filteredCount>0?c=`${this.filteredCount}`:s<i&&(c=`${s}+`);let h=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT);return(0,o.dy)`
      <wui-list-wallet
        name="Search Wallet"
        walletIcon="search"
        showAllWallets
        @click=${this.onAllWallets.bind(this)}
        tagLabel=${c}
        tagVariant="info"
        data-testid="all-wallets"
        tabIdx=${(0,d.o)(this.tabIdx)}
        .loading=${this.isFetchingRecommendedWallets}
        ?disabled=${h}
        size="sm"
      ></wui-list-wallet>
    `}onAllWallets(){f.X.sendEvent({type:"track",event:"CLICK_ALL_WALLETS"}),g.RouterController.push("AllWallets",{redirectView:g.RouterController.state.data?.redirectView})}};w([(0,i.Cb)()],m.prototype,"tabIdx",void 0),w([(0,i.SB)()],m.prototype,"connectors",void 0),w([(0,i.SB)()],m.prototype,"count",void 0),w([(0,i.SB)()],m.prototype,"filteredCount",void 0),w([(0,i.SB)()],m.prototype,"isFetchingRecommendedWallets",void 0),m=w([(0,c.Mo)("w3m-all-wallets-widget")],m);var b=r(58488),y=r(98673),v=r(61573),C=r(68016);let x=(0,c.iv)`
  :host {
    margin-top: ${({spacing:e})=>e["1"]};
  }
  wui-separator {
    margin: ${({spacing:e})=>e["3"]} calc(${({spacing:e})=>e["3"]} * -1)
      ${({spacing:e})=>e["2"]} calc(${({spacing:e})=>e["3"]} * -1);
    width: calc(100% + ${({spacing:e})=>e["3"]} * 2);
  }
`;var $=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let k=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.connectors=h.ConnectorController.state.connectors,this.recommended=a.ApiController.state.recommended,this.featured=a.ApiController.state.featured,this.explorerWallets=a.ApiController.state.explorerWallets,this.connections=p.ConnectionController.state.connections,this.connectorImages=b.W.state.connectorImages,this.loadingTelegram=!1,this.unsubscribe.push(h.ConnectorController.subscribeKey("connectors",e=>this.connectors=e),p.ConnectionController.subscribeKey("connections",e=>this.connections=e),b.W.subscribeKey("connectorImages",e=>this.connectorImages=e),a.ApiController.subscribeKey("recommended",e=>this.recommended=e),a.ApiController.subscribeKey("featured",e=>this.featured=e),a.ApiController.subscribeKey("explorerFilteredWallets",e=>{this.explorerWallets=e?.length?e:a.ApiController.state.explorerWallets}),a.ApiController.subscribeKey("explorerWallets",e=>{this.explorerWallets?.length||(this.explorerWallets=e)})),n.j.isTelegram()&&n.j.isIos()&&(this.loadingTelegram=!p.ConnectionController.state.wcUri,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>this.loadingTelegram=!e)))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return(0,o.dy)`
      <wui-flex flexDirection="column" gap="2"> ${this.connectorListTemplate()} </wui-flex>
    `}mapConnectorsToExplorerWallets(e,t){return e.map(e=>{if("MULTI_CHAIN"===e.type&&e.connectors){let r=e.connectors.map(e=>e.id),o=e.connectors.map(e=>e.name),i=e.connectors.map(e=>e.info?.rdns),n=t?.find(e=>r.includes(e.id)||o.includes(e.name)||e.rdns&&(i.includes(e.rdns)||r.includes(e.rdns)));return e.explorerWallet=n??e.explorerWallet,e}let r=t?.find(t=>t.id===e.id||t.rdns===e.info?.rdns||t.name===e.name);return e.explorerWallet=r??e.explorerWallet,e})}processConnectorsByType(e,t=!0){let r=C.C.sortConnectorsByExplorerWallet([...e]);return t?r.filter(C.C.showConnector):r}connectorListTemplate(){let e=this.mapConnectorsToExplorerWallets(this.connectors,this.explorerWallets??[]),t=C.C.getConnectorsByType(e,this.recommended,this.featured),r=this.processConnectorsByType(t.announced.filter(e=>"walletConnect"!==e.id)),o=this.processConnectorsByType(t.injected),i=this.processConnectorsByType(t.multiChain.filter(e=>"WalletConnect"!==e.name),!1),l=t.custom,a=t.recent,s=this.processConnectorsByType(t.external.filter(e=>e.id!==u.b.CONNECTOR_ID.COINBASE_SDK)),c=t.recommended,d=t.featured,h=C.C.getConnectorTypeOrder({custom:l,recent:a,announced:r,injected:o,multiChain:i,recommended:c,featured:d,external:s}),p=this.connectors.find(e=>"walletConnect"===e.id),f=n.j.isMobile(),g=[];for(let e of h)switch(e){case"walletConnect":!f&&p&&g.push({kind:"connector",subtype:"walletConnect",connector:p});break;case"recent":C.C.getFilteredRecentWallets().forEach(e=>g.push({kind:"wallet",subtype:"recent",wallet:e}));break;case"injected":i.forEach(e=>g.push({kind:"connector",subtype:"multiChain",connector:e})),r.forEach(e=>g.push({kind:"connector",subtype:"announced",connector:e})),o.forEach(e=>g.push({kind:"connector",subtype:"injected",connector:e}));break;case"featured":d.forEach(e=>g.push({kind:"wallet",subtype:"featured",wallet:e}));break;case"custom":C.C.getFilteredCustomWallets(l??[]).forEach(e=>g.push({kind:"wallet",subtype:"custom",wallet:e}));break;case"external":s.forEach(e=>g.push({kind:"connector",subtype:"external",connector:e}));break;case"recommended":C.C.getCappedRecommendedWallets(c).forEach(e=>g.push({kind:"wallet",subtype:"recommended",wallet:e}));break;default:console.warn(`Unknown connector type: ${e}`)}return g.map((e,t)=>"connector"===e.kind?this.renderConnector(e,t):this.renderWallet(e,t))}renderConnector(e,t){let r,i;let n=e.connector,l=y.f.getConnectorImage(n)||this.connectorImages[n?.imageId??""],a=(this.connections.get(n.chain)??[]).some(e=>v.g.isLowerCaseMatch(e.connectorId,n.id));"multiChain"===e.subtype?(r="multichain",i="info"):"walletConnect"===e.subtype?(r="qr code",i="accent"):"injected"===e.subtype||"announced"===e.subtype?(r=a?"connected":"installed",i=a?"info":"success"):(r=void 0,i=void 0);let s=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT),c=("walletConnect"===e.subtype||"external"===e.subtype)&&s;return(0,o.dy)`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${(0,d.o)(l)}
        .installed=${!0}
        name=${n.name??"Unknown"}
        .tagVariant=${i}
        tagLabel=${(0,d.o)(r)}
        data-testid=${`wallet-selector-${n.id.toLowerCase()}`}
        size="sm"
        @click=${()=>this.onClickConnector(e)}
        tabIdx=${(0,d.o)(this.tabIdx)}
        ?disabled=${c}
        rdnsId=${(0,d.o)(n.explorerWallet?.rdns||void 0)}
        walletRank=${(0,d.o)(n.explorerWallet?.order)}
      >
      </w3m-list-wallet>
    `}onClickConnector(e){let t=g.RouterController.state.data?.redirectView;if("walletConnect"===e.subtype){h.ConnectorController.setActiveConnector(e.connector),n.j.isMobile()?g.RouterController.push("AllWallets"):g.RouterController.push("ConnectingWalletConnect",{redirectView:t});return}if("multiChain"===e.subtype){h.ConnectorController.setActiveConnector(e.connector),g.RouterController.push("ConnectingMultiChain",{redirectView:t});return}if("injected"===e.subtype){h.ConnectorController.setActiveConnector(e.connector),g.RouterController.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}if("announced"===e.subtype){if("walletConnect"===e.connector.id){n.j.isMobile()?g.RouterController.push("AllWallets"):g.RouterController.push("ConnectingWalletConnect",{redirectView:t});return}g.RouterController.push("ConnectingExternal",{connector:e.connector,redirectView:t,wallet:e.connector.explorerWallet});return}g.RouterController.push("ConnectingExternal",{connector:e.connector,redirectView:t})}renderWallet(e,t){let r=e.wallet,i=y.f.getWalletImage(r),n=p.ConnectionController.hasAnyConnection(u.b.CONNECTOR_ID.WALLET_CONNECT),l=this.loadingTelegram,a="recent"===e.subtype?"recent":void 0,s="recent"===e.subtype?"info":void 0;return(0,o.dy)`
      <w3m-list-wallet
        displayIndex=${t}
        imageSrc=${(0,d.o)(i)}
        name=${r.name??"Unknown"}
        @click=${()=>this.onClickWallet(e)}
        size="sm"
        data-testid=${`wallet-selector-${r.id}`}
        tabIdx=${(0,d.o)(this.tabIdx)}
        ?loading=${l}
        ?disabled=${n}
        rdnsId=${(0,d.o)(r.rdns||void 0)}
        walletRank=${(0,d.o)(r.order)}
        tagLabel=${(0,d.o)(a)}
        .tagVariant=${s}
      >
      </w3m-list-wallet>
    `}onClickWallet(e){let t=g.RouterController.state.data?.redirectView;if("featured"===e.subtype){h.ConnectorController.selectWalletConnector(e.wallet);return}if("recent"===e.subtype){if(this.loadingTelegram)return;h.ConnectorController.selectWalletConnector(e.wallet);return}if("custom"===e.subtype){if(this.loadingTelegram)return;g.RouterController.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t});return}if(this.loadingTelegram)return;let r=h.ConnectorController.getConnector({id:e.wallet.id,rdns:e.wallet.rdns});r?g.RouterController.push("ConnectingExternal",{connector:r,redirectView:t}):g.RouterController.push("ConnectingWalletConnect",{wallet:e.wallet,redirectView:t})}};k.styles=x,$([(0,i.Cb)({type:Number})],k.prototype,"tabIdx",void 0),$([(0,i.SB)()],k.prototype,"connectors",void 0),$([(0,i.SB)()],k.prototype,"recommended",void 0),$([(0,i.SB)()],k.prototype,"featured",void 0),$([(0,i.SB)()],k.prototype,"explorerWallets",void 0),$([(0,i.SB)()],k.prototype,"connections",void 0),$([(0,i.SB)()],k.prototype,"connectorImages",void 0),$([(0,i.SB)()],k.prototype,"loadingTelegram",void 0),k=$([(0,c.Mo)("w3m-connector-list")],k);var R=r(2665),E=r(77007),S=r(61741),T=r(905),A=r(36943),B=r(2267),I=r(3954),P=r(29669);r(38790),r(18476);var j=r(88497);let L=(0,j.iv)`
  :host {
    flex: 1;
    height: 100%;
  }

  button {
    width: 100%;
    height: 100%;
    display: inline-flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]} ${({spacing:e})=>e[2]};
    column-gap: ${({spacing:e})=>e[1]};
    color: ${({tokens:e})=>e.theme.textSecondary};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: transparent;
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  button[data-active='true'] {
    color: ${({tokens:e})=>e.theme.textPrimary};
    background-color: ${({tokens:e})=>e.theme.foregroundTertiary};
  }

  button:hover:enabled:not([data-active='true']),
  button:active:enabled:not([data-active='true']) {
    wui-text,
    wui-icon {
      color: ${({tokens:e})=>e.theme.textPrimary};
    }
  }
`;var O=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let M={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},W={lg:"md",md:"sm",sm:"sm"},N=class extends o.oi{constructor(){super(...arguments),this.icon="mobile",this.size="md",this.label="",this.active=!1}render(){return(0,o.dy)`
      <button data-active=${this.active}>
        ${this.icon?(0,o.dy)`<wui-icon size=${W[this.size]} name=${this.icon}></wui-icon>`:""}
        <wui-text variant=${M[this.size]}> ${this.label} </wui-text>
      </button>
    `}};N.styles=[I.ET,I.ZM,L],O([(0,i.Cb)()],N.prototype,"icon",void 0),O([(0,i.Cb)()],N.prototype,"size",void 0),O([(0,i.Cb)()],N.prototype,"label",void 0),O([(0,i.Cb)({type:Boolean})],N.prototype,"active",void 0),N=O([(0,P.M)("wui-tab-item")],N);let z=(0,j.iv)`
  :host {
    display: inline-flex;
    align-items: center;
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    border-radius: ${({borderRadius:e})=>e[32]};
    padding: ${({spacing:e})=>e["01"]};
    box-sizing: border-box;
  }

  :host([data-size='sm']) {
    height: 26px;
  }

  :host([data-size='md']) {
    height: 36px;
  }
`;var D=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let _=class extends o.oi{constructor(){super(...arguments),this.tabs=[],this.onTabChange=()=>null,this.size="md",this.activeTab=0}render(){return this.dataset.size=this.size,this.tabs.map((e,t)=>{let r=t===this.activeTab;return(0,o.dy)`
        <wui-tab-item
          @click=${()=>this.onTabClick(t)}
          icon=${e.icon}
          size=${this.size}
          label=${e.label}
          ?active=${r}
          data-active=${r}
          data-testid="tab-${e.label?.toLowerCase()}"
        ></wui-tab-item>
      `})}onTabClick(e){this.activeTab=e,this.onTabChange(e)}};_.styles=[I.ET,I.ZM,z],D([(0,i.Cb)({type:Array})],_.prototype,"tabs",void 0),D([(0,i.Cb)()],_.prototype,"onTabChange",void 0),D([(0,i.Cb)()],_.prototype,"size",void 0),D([(0,i.SB)()],_.prototype,"activeTab",void 0),_=D([(0,P.M)("wui-tabs")],_);var U=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let F=class extends o.oi{constructor(){super(...arguments),this.platformTabs=[],this.unsubscribe=[],this.platforms=[],this.onSelectPlatfrom=void 0}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=this.generateTabs();return(0,o.dy)`
      <wui-flex justifyContent="center" .padding=${["0","0","4","0"]}>
        <wui-tabs .tabs=${e} .onTabChange=${this.onTabChange.bind(this)}></wui-tabs>
      </wui-flex>
    `}generateTabs(){let e=this.platforms.map(e=>"browser"===e?{label:"Browser",icon:"extension",platform:"browser"}:"mobile"===e?{label:"Mobile",icon:"mobile",platform:"mobile"}:"qrcode"===e?{label:"Mobile",icon:"mobile",platform:"qrcode"}:"web"===e?{label:"Webapp",icon:"browser",platform:"web"}:"desktop"===e?{label:"Desktop",icon:"desktop",platform:"desktop"}:{label:"Browser",icon:"extension",platform:"unsupported"});return this.platformTabs=e.map(({platform:e})=>e),e}onTabChange(e){let t=this.platformTabs[e];t&&this.onSelectPlatfrom?.(t)}};U([(0,i.Cb)({type:Array})],F.prototype,"platforms",void 0),U([(0,i.Cb)()],F.prototype,"onSelectPlatfrom",void 0),F=U([(0,c.Mo)("w3m-connecting-header")],F);var H=r(71106);r(55583),r(49580),r(22387),r(89380);let q=(0,j.iv)`
  :host {
    display: block;
    width: 100px;
    height: 100px;
  }

  svg {
    width: 100px;
    height: 100px;
  }

  rect {
    fill: none;
    stroke: ${e=>e.colors.accent100};
    stroke-width: 3px;
    stroke-linecap: round;
    animation: dash 1s linear infinite;
  }

  @keyframes dash {
    to {
      stroke-dashoffset: 0px;
    }
  }
`;var K=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let V=class extends o.oi{constructor(){super(...arguments),this.radius=36}render(){return this.svgLoaderTemplate()}svgLoaderTemplate(){let e=this.radius>50?50:this.radius,t=36-e;return(0,o.dy)`
      <svg viewBox="0 0 110 110" width="110" height="110">
        <rect
          x="2"
          y="2"
          width="106"
          height="106"
          rx=${e}
          stroke-dasharray="${116+t} ${245+t}"
          stroke-dashoffset=${360+1.75*t}
        />
      </svg>
    `}};V.styles=[I.ET,q],K([(0,i.Cb)({type:Number})],V.prototype,"radius",void 0),V=K([(0,P.M)("wui-loading-thumbnail")],V),r(8743),r(78894),r(31243),r(33583);let Y=(0,j.iv)`
  wui-flex {
    width: 100%;
    height: 52px;
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    padding-left: ${({spacing:e})=>e[3]};
    padding-right: ${({spacing:e})=>e[3]};
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: ${({spacing:e})=>e[6]};
  }

  wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  wui-icon {
    width: 12px;
    height: 12px;
  }
`;var X=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let J=class extends o.oi{constructor(){super(...arguments),this.disabled=!1,this.label="",this.buttonLabel=""}render(){return(0,o.dy)`
      <wui-flex justifyContent="space-between" alignItems="center">
        <wui-text variant="lg-regular" color="inherit">${this.label}</wui-text>
        <wui-button variant="accent-secondary" size="sm">
          ${this.buttonLabel}
          <wui-icon name="chevronRight" color="inherit" size="inherit" slot="iconRight"></wui-icon>
        </wui-button>
      </wui-flex>
    `}};J.styles=[I.ET,I.ZM,Y],X([(0,i.Cb)({type:Boolean})],J.prototype,"disabled",void 0),X([(0,i.Cb)()],J.prototype,"label",void 0),X([(0,i.Cb)()],J.prototype,"buttonLabel",void 0),J=X([(0,P.M)("wui-cta-button")],J);let G=(0,c.iv)`
  :host {
    display: block;
    padding: 0 ${({spacing:e})=>e["5"]} ${({spacing:e})=>e["5"]};
  }
`;var Q=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let Z=class extends o.oi{constructor(){super(...arguments),this.wallet=void 0}render(){if(!this.wallet)return this.style.display="none",null;let{name:e,app_store:t,play_store:r,chrome_store:i,homepage:l}=this.wallet,a=n.j.isMobile(),s=n.j.isIos(),d=n.j.isAndroid(),u=[t,r,l,i].filter(Boolean).length>1,h=c.Hg.getTruncateString({string:e,charsStart:12,charsEnd:0,truncate:"end"});return u&&!a?(0,o.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${()=>g.RouterController.push("Downloads",{wallet:this.wallet})}
        ></wui-cta-button>
      `:!u&&l?(0,o.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onHomePage.bind(this)}
        ></wui-cta-button>
      `:t&&s?(0,o.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onAppStore.bind(this)}
        ></wui-cta-button>
      `:r&&d?(0,o.dy)`
        <wui-cta-button
          label=${`Don't have ${h}?`}
          buttonLabel="Get"
          @click=${this.onPlayStore.bind(this)}
        ></wui-cta-button>
      `:(this.style.display="none",null)}onAppStore(){this.wallet?.app_store&&n.j.openHref(this.wallet.app_store,"_blank")}onPlayStore(){this.wallet?.play_store&&n.j.openHref(this.wallet.play_store,"_blank")}onHomePage(){this.wallet?.homepage&&n.j.openHref(this.wallet.homepage,"_blank")}};Z.styles=[G],Q([(0,i.Cb)({type:Object})],Z.prototype,"wallet",void 0),Z=Q([(0,c.Mo)("w3m-mobile-download-links")],Z);let ee=(0,c.iv)`
  @keyframes shake {
    0% {
      transform: translateX(0);
    }
    25% {
      transform: translateX(3px);
    }
    50% {
      transform: translateX(-3px);
    }
    75% {
      transform: translateX(3px);
    }
    100% {
      transform: translateX(0);
    }
  }

  wui-flex:first-child:not(:only-child) {
    position: relative;
  }

  wui-wallet-image {
    width: 56px;
    height: 56px;
  }

  wui-loading-thumbnail {
    position: absolute;
  }

  wui-icon-box {
    position: absolute;
    right: calc(${({spacing:e})=>e["1"]} * -1);
    bottom: calc(${({spacing:e})=>e["1"]} * -1);
    opacity: 0;
    transform: scale(0.5);
    transition-property: opacity, transform;
    transition-duration: ${({durations:e})=>e.lg};
    transition-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity, transform;
  }

  wui-text[align='center'] {
    width: 100%;
    padding: 0px ${({spacing:e})=>e["4"]};
  }

  [data-error='true'] wui-icon-box {
    opacity: 1;
    transform: scale(1);
  }

  [data-error='true'] > wui-flex:first-child {
    animation: shake 250ms ${({easings:e})=>e["ease-out-power-2"]} both;
  }

  [data-retry='false'] wui-link {
    display: none;
  }

  [data-retry='true'] wui-link {
    display: block;
    opacity: 1;
  }

  w3m-mobile-download-links {
    padding: 0px;
    width: 100%;
  }
`;var et=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};class er extends o.oi{constructor(){super(),this.wallet=g.RouterController.state.data?.wallet,this.connector=g.RouterController.state.data?.connector,this.timeout=void 0,this.secondaryBtnIcon="refresh",this.onConnect=void 0,this.onRender=void 0,this.onAutoConnect=void 0,this.isWalletConnect=!0,this.unsubscribe=[],this.imageSrc=y.f.getConnectorImage(this.connector)??y.f.getWalletImage(this.wallet),this.name=this.wallet?.name??this.connector?.name??"Wallet",this.isRetrying=!1,this.uri=p.ConnectionController.state.wcUri,this.error=p.ConnectionController.state.wcError,this.ready=!1,this.showRetry=!1,this.label=void 0,this.secondaryBtnLabel="Try again",this.secondaryLabel="Accept connection request in the wallet",this.isLoading=!1,this.isMobile=!1,this.onRetry=void 0,this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",e=>{this.uri=e,this.isRetrying&&this.onRetry&&(this.isRetrying=!1,this.onConnect?.())}),p.ConnectionController.subscribeKey("wcError",e=>this.error=e)),(n.j.isTelegram()||n.j.isSafari())&&n.j.isIos()&&p.ConnectionController.state.wcUri&&this.onConnect?.()}firstUpdated(){this.onAutoConnect?.(),this.showRetry=!this.onAutoConnect}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),p.ConnectionController.setWcError(!1),clearTimeout(this.timeout)}render(){this.onRender?.(),this.onShowRetry();let e=this.error?"Connection can be declined if a previous request is still active":this.secondaryLabel,t="";return this.label?t=this.label:(t=`Continue in ${this.name}`,this.error&&(t="Connection declined")),(0,o.dy)`
      <wui-flex
        data-error=${(0,d.o)(this.error)}
        data-retry=${this.showRetry}
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="6"
      >
        <wui-flex gap="2" justifyContent="center" alignItems="center">
          <wui-wallet-image size="lg" imageSrc=${(0,d.o)(this.imageSrc)}></wui-wallet-image>

          ${this.error?null:this.loaderTemplate()}

          <wui-icon-box
            color="error"
            icon="close"
            size="sm"
            border
            borderColor="wui-color-bg-125"
          ></wui-icon-box>
        </wui-flex>

        <wui-flex flexDirection="column" alignItems="center" gap="6"> <wui-flex
          flexDirection="column"
          alignItems="center"
          gap="2"
          .padding=${["2","0","0","0"]}
        >
          <wui-text align="center" variant="lg-medium" color=${this.error?"error":"primary"}>
            ${t}
          </wui-text>
          <wui-text align="center" variant="lg-regular" color="secondary">${e}</wui-text>
        </wui-flex>

        ${this.secondaryBtnLabel?(0,o.dy)`
                <wui-button
                  variant="neutral-secondary"
                  size="md"
                  ?disabled=${this.isRetrying||this.isLoading}
                  @click=${this.onTryAgain.bind(this)}
                  data-testid="w3m-connecting-widget-secondary-button"
                >
                  <wui-icon
                    color="inherit"
                    slot="iconLeft"
                    name=${this.secondaryBtnIcon}
                  ></wui-icon>
                  ${this.secondaryBtnLabel}
                </wui-button>
              `:null}
      </wui-flex>

      ${this.isWalletConnect?(0,o.dy)`
              <wui-flex .padding=${["0","5","5","5"]} justifyContent="center">
                <wui-link
                  @click=${this.onCopyUri}
                  variant="secondary"
                  icon="copy"
                  data-testid="wui-link-copy"
                >
                  Copy link
                </wui-link>
              </wui-flex>
            `:null}

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links></wui-flex>
      </wui-flex>
    `}onShowRetry(){if(this.error&&!this.showRetry){this.showRetry=!0;let e=this.shadowRoot?.querySelector("wui-button");e?.animate([{opacity:0},{opacity:1}],{fill:"forwards",easing:"ease"})}}onTryAgain(){p.ConnectionController.setWcError(!1),this.onRetry?(this.isRetrying=!0,this.onRetry?.()):this.onConnect?.()}loaderTemplate(){let e=H.ThemeController.state.themeVariables["--w3m-border-radius-master"],t=e?parseInt(e.replace("px",""),10):4;return(0,o.dy)`<wui-loading-thumbnail radius=${9*t}></wui-loading-thumbnail>`}onCopyUri(){try{this.uri&&(n.j.copyToClopboard(this.uri),S.SnackController.showSuccess("Link copied"))}catch{S.SnackController.showError("Failed to copy")}}}er.styles=ee,et([(0,i.SB)()],er.prototype,"isRetrying",void 0),et([(0,i.SB)()],er.prototype,"uri",void 0),et([(0,i.SB)()],er.prototype,"error",void 0),et([(0,i.SB)()],er.prototype,"ready",void 0),et([(0,i.SB)()],er.prototype,"showRetry",void 0),et([(0,i.SB)()],er.prototype,"label",void 0),et([(0,i.SB)()],er.prototype,"secondaryBtnLabel",void 0),et([(0,i.SB)()],er.prototype,"secondaryLabel",void 0),et([(0,i.SB)()],er.prototype,"isLoading",void 0),et([(0,i.Cb)({type:Boolean})],er.prototype,"isMobile",void 0),et([(0,i.Cb)()],er.prototype,"onRetry",void 0);let eo=class extends er{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-browser: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onAutoConnect=this.onConnectProxy.bind(this),f.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:g.RouterController.state.view}})}async onConnectProxy(){try{this.error=!1;let{connectors:e}=h.ConnectorController.state,t=e.find(e=>"ANNOUNCED"===e.type&&e.info?.rdns===this.wallet?.rdns||"INJECTED"===e.type||e.name===this.wallet?.name);if(t)await p.ConnectionController.connectExternal(t,t.chain);else throw Error("w3m-connecting-wc-browser: No connector found");T.I.close(),f.X.sendEvent({type:"track",event:"CONNECT_SUCCESS",properties:{method:"browser",name:this.wallet?.name||"Unknown",view:g.RouterController.state.view,walletRank:this.wallet?.order}})}catch(e){e instanceof A.g&&e.originalName===R.jD.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?f.X.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:e.message}}):f.X.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),this.error=!0}}};eo=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,c.Mo)("w3m-connecting-wc-browser")],eo);let ei=class extends er{constructor(){if(super(),!this.wallet)throw Error("w3m-connecting-wc-desktop: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.onRender=this.onRenderProxy.bind(this),f.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"desktop",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:g.RouterController.state.view}})}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onConnectProxy(){if(this.wallet?.desktop_link&&this.uri)try{this.error=!1;let{desktop_link:e,name:t}=this.wallet,{redirect:r,href:o}=n.j.formatNativeUrl(e,this.uri);p.ConnectionController.setWcLinking({name:t,href:o}),p.ConnectionController.setRecentWallet(this.wallet),n.j.openHref(r,"_blank")}catch{this.error=!0}}};ei=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,c.Mo)("w3m-connecting-wc-desktop")],ei);var en=r(16114),el=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ea=class extends er{constructor(){if(super(),this.btnLabelTimeout=void 0,this.redirectDeeplink=void 0,this.redirectUniversalLink=void 0,this.target=void 0,this.preferUniversalLinks=l.OptionsController.state.experimental_preferUniversalLinks,this.isLoading=!0,this.onConnect=()=>{if(this.wallet?.mobile_link&&this.uri)try{this.error=!1;let{mobile_link:e,link_mode:t,name:r}=this.wallet,{redirect:o,redirectUniversalLink:i,href:l}=n.j.formatNativeUrl(e,this.uri,t);this.redirectDeeplink=o,this.redirectUniversalLink=i,this.target=n.j.isIframe()?"_top":"_self",p.ConnectionController.setWcLinking({name:r,href:l}),p.ConnectionController.setRecentWallet(this.wallet),this.preferUniversalLinks&&this.redirectUniversalLink?n.j.openHref(this.redirectUniversalLink,this.target):n.j.openHref(this.redirectDeeplink,this.target)}catch(e){f.X.sendEvent({type:"track",event:"CONNECT_PROXY_ERROR",properties:{message:e instanceof Error?e.message:"Error parsing the deeplink",uri:this.uri,mobile_link:this.wallet.mobile_link,name:this.wallet.name}}),this.error=!0}},!this.wallet)throw Error("w3m-connecting-wc-mobile: No wallet provided");this.secondaryBtnLabel="Open",this.secondaryLabel=en.bq.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.onHandleURI(),this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",()=>{this.onHandleURI()})),f.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"mobile",displayIndex:this.wallet?.display_index,walletRank:this.wallet.order,view:g.RouterController.state.view}})}disconnectedCallback(){super.disconnectedCallback(),clearTimeout(this.btnLabelTimeout)}onHandleURI(){this.isLoading=!this.uri,!this.ready&&this.uri&&(this.ready=!0,this.onConnect?.())}onTryAgain(){p.ConnectionController.setWcError(!1),this.onConnect?.()}};el([(0,i.SB)()],ea.prototype,"redirectDeeplink",void 0),el([(0,i.SB)()],ea.prototype,"redirectUniversalLink",void 0),el([(0,i.SB)()],ea.prototype,"target",void 0),el([(0,i.SB)()],ea.prototype,"preferUniversalLinks",void 0),el([(0,i.SB)()],ea.prototype,"isLoading",void 0),ea=el([(0,c.Mo)("w3m-connecting-wc-mobile")],ea),r(49342);var es=r(63523);function ec(e,t,r){return e!==t&&(e-t<0?t-e:e-t)<=r+.1}let ed={generate({uri:e,size:t,logoSize:r,padding:i=8,dotColor:n="var(--apkt-colors-black)"}){let l=[],a=function(e,t){let r=Array.prototype.slice.call(es.create(e,{errorCorrectionLevel:"Q"}).modules.data,0),o=Math.sqrt(r.length);return r.reduce((e,t,r)=>(r%o==0?e.push([t]):e[e.length-1].push(t))&&e,[])}(e,0),s=(t-2*i)/a.length,c=[{x:0,y:0},{x:1,y:0},{x:0,y:1}];c.forEach(({x:e,y:t})=>{let r=(a.length-7)*s*e+i,d=(a.length-7)*s*t+i;for(let e=0;e<c.length;e+=1){let t=s*(7-2*e);l.push((0,o.YP)`
            <rect
              fill=${2===e?"var(--apkt-colors-black)":"var(--apkt-colors-white)"}
              width=${0===e?t-10:t}
              rx= ${0===e?(t-10)*.45:.45*t}
              ry= ${0===e?(t-10)*.45:.45*t}
              stroke=${n}
              stroke-width=${0===e?10:0}
              height=${0===e?t-10:t}
              x= ${0===e?d+s*e+5:d+s*e}
              y= ${0===e?r+s*e+5:r+s*e}
            />
          `)}});let d=Math.floor((r+25)/s),u=a.length/2-d/2,h=a.length/2+d/2-1,p=[];a.forEach((e,t)=>{e.forEach((e,r)=>{!a[t][r]||t<7&&r<7||t>a.length-8&&r<7||t<7&&r>a.length-8||t>u&&t<h&&r>u&&r<h||p.push([t*s+s/2+i,r*s+s/2+i])})});let f={};return p.forEach(([e,t])=>{f[e]?f[e]?.push(t):f[e]=[t]}),Object.entries(f).map(([e,t])=>{let r=t.filter(e=>t.every(t=>!ec(e,t,s)));return[Number(e),r]}).forEach(([e,t])=>{t.forEach(t=>{l.push((0,o.YP)`<circle cx=${e} cy=${t} fill=${n} r=${s/2.5} />`)})}),Object.entries(f).filter(([e,t])=>t.length>1).map(([e,t])=>{let r=t.filter(e=>t.some(t=>ec(e,t,s)));return[Number(e),r]}).map(([e,t])=>{t.sort((e,t)=>e<t?-1:1);let r=[];for(let e of t){let t=r.find(t=>t.some(t=>ec(e,t,s)));t?t.push(e):r.push([e])}return[e,r.map(e=>[e[0],e[e.length-1]])]}).forEach(([e,t])=>{t.forEach(([t,r])=>{l.push((0,o.YP)`
              <line
                x1=${e}
                x2=${e}
                y1=${t}
                y2=${r}
                stroke=${n}
                stroke-width=${s/1.25}
                stroke-linecap="round"
              />
            `)})}),l}},eu=(0,j.iv)`
  :host {
    position: relative;
    user-select: none;
    display: block;
    overflow: hidden;
    aspect-ratio: 1 / 1;
    width: 100%;
    height: 100%;
    background-color: ${({colors:e})=>e.white};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  :host {
    border-radius: ${({borderRadius:e})=>e[4]};
    display: flex;
    align-items: center;
    justify-content: center;
  }

  :host([data-clear='true']) > wui-icon {
    display: none;
  }

  svg:first-child,
  wui-image,
  wui-icon {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translateY(-50%) translateX(-50%);
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    box-shadow: inset 0 0 0 4px ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[6]};
  }

  wui-image {
    width: 25%;
    height: 25%;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  wui-icon {
    width: 100%;
    height: 100%;
    color: #3396ff !important;
    transform: translateY(-50%) translateX(-50%) scale(0.25);
  }

  wui-icon > svg {
    width: inherit;
    height: inherit;
  }
`;var eh=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ep=class extends o.oi{constructor(){super(...arguments),this.uri="",this.size=500,this.theme="dark",this.imageSrc=void 0,this.alt=void 0,this.arenaClear=void 0,this.farcaster=void 0}render(){return this.dataset.theme=this.theme,this.dataset.clear=String(this.arenaClear),(0,o.dy)`<wui-flex
      alignItems="center"
      justifyContent="center"
      class="wui-qr-code"
      direction="column"
      gap="4"
      width="100%"
      style="height: 100%"
    >
      ${this.templateVisual()} ${this.templateSvg()}
    </wui-flex>`}templateSvg(){return(0,o.YP)`
      <svg viewBox="0 0 ${this.size} ${this.size}" width="100%" height="100%">
        ${ed.generate({uri:this.uri,size:this.size,logoSize:this.arenaClear?0:this.size/4})}
      </svg>
    `}templateVisual(){return this.imageSrc?(0,o.dy)`<wui-image src=${this.imageSrc} alt=${this.alt??"logo"}></wui-image>`:this.farcaster?(0,o.dy)`<wui-icon
        class="farcaster"
        size="inherit"
        color="inherit"
        name="farcaster"
      ></wui-icon>`:(0,o.dy)`<wui-icon size="inherit" color="inherit" name="walletConnect"></wui-icon>`}};ep.styles=[I.ET,eu],eh([(0,i.Cb)()],ep.prototype,"uri",void 0),eh([(0,i.Cb)({type:Number})],ep.prototype,"size",void 0),eh([(0,i.Cb)()],ep.prototype,"theme",void 0),eh([(0,i.Cb)()],ep.prototype,"imageSrc",void 0),eh([(0,i.Cb)()],ep.prototype,"alt",void 0),eh([(0,i.Cb)({type:Boolean})],ep.prototype,"arenaClear",void 0),eh([(0,i.Cb)({type:Boolean})],ep.prototype,"farcaster",void 0),ep=eh([(0,P.M)("wui-qr-code")],ep);let ef=(0,j.iv)`
  :host {
    display: block;
    background: linear-gradient(
      90deg,
      ${({tokens:e})=>e.theme.foregroundSecondary} 0%,
      ${({tokens:e})=>e.theme.foregroundTertiary} 50%,
      ${({tokens:e})=>e.theme.foregroundSecondary} 100%
    );
    background-size: 200% 100%;
    animation: shimmer 1s ease-in-out infinite;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  :host([data-rounded='true']) {
    border-radius: ${({borderRadius:e})=>e[16]};
  }

  @keyframes shimmer {
    0% {
      background-position: 200% 0;
    }
    100% {
      background-position: -200% 0;
    }
  }
`;var eg=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ew=class extends o.oi{constructor(){super(...arguments),this.width="",this.height="",this.variant="default",this.rounded=!1}render(){return this.style.cssText=`
      width: ${this.width};
      height: ${this.height};
    `,this.dataset.rounded=this.rounded?"true":"false",(0,o.dy)`<slot></slot>`}};ew.styles=[ef],eg([(0,i.Cb)()],ew.prototype,"width",void 0),eg([(0,i.Cb)()],ew.prototype,"height",void 0),eg([(0,i.Cb)()],ew.prototype,"variant",void 0),eg([(0,i.Cb)({type:Boolean})],ew.prototype,"rounded",void 0),ew=eg([(0,P.M)("wui-shimmer")],ew),r(99226);let em=(0,c.iv)`
  wui-shimmer {
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: ${({borderRadius:e})=>e[4]};
  }

  wui-qr-code {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var eb=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ey=class extends er{constructor(){super(),this.basic=!1}firstUpdated(){this.basic||f.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet?.name??"WalletConnect",platform:"qrcode",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:g.RouterController.state.view}})}disconnectedCallback(){super.disconnectedCallback(),this.unsubscribe?.forEach(e=>e())}render(){return this.onRenderProxy(),(0,o.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["0","5","5","5"]}
        gap="5"
      >
        <wui-shimmer width="100%"> ${this.qrCodeTemplate()} </wui-shimmer>
        <wui-text variant="lg-medium" color="primary"> Scan this QR Code with your phone </wui-text>
        ${this.copyTemplate()}
      </wui-flex>
      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}onRenderProxy(){!this.ready&&this.uri&&(this.ready=!0)}qrCodeTemplate(){if(!this.uri||!this.ready)return null;let e=this.wallet?this.wallet.name:void 0;return p.ConnectionController.setWcLinking(void 0),p.ConnectionController.setRecentWallet(this.wallet),(0,o.dy)` <wui-qr-code
      theme=${H.ThemeController.state.themeMode}
      uri=${this.uri}
      imageSrc=${(0,d.o)(y.f.getWalletImage(this.wallet))}
      color=${(0,d.o)(H.ThemeController.state.themeVariables["--w3m-qr-color"])}
      alt=${(0,d.o)(e)}
      data-testid="wui-qr-code"
    ></wui-qr-code>`}copyTemplate(){let e=!this.uri||!this.ready;return(0,o.dy)`<wui-button
      .disabled=${e}
      @click=${this.onCopyUri}
      variant="neutral-secondary"
      size="sm"
      data-testid="copy-wc2-uri"
    >
      Copy link
      <wui-icon size="sm" color="inherit" name="copy" slot="iconRight"></wui-icon>
    </wui-button>`}};ey.styles=em,eb([(0,i.Cb)({type:Boolean})],ey.prototype,"basic",void 0),ey=eb([(0,c.Mo)("w3m-connecting-wc-qrcode")],ey);let ev=class extends o.oi{constructor(){if(super(),this.wallet=g.RouterController.state.data?.wallet,!this.wallet)throw Error("w3m-connecting-wc-unsupported: No wallet provided");f.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"browser",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:g.RouterController.state.view}})}render(){return(0,o.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        .padding=${["10","5","5","5"]}
        gap="5"
      >
        <wui-wallet-image
          size="lg"
          imageSrc=${(0,d.o)(y.f.getWalletImage(this.wallet))}
        ></wui-wallet-image>

        <wui-text variant="md-regular" color="primary">Not Detected</wui-text>
      </wui-flex>

      <w3m-mobile-download-links .wallet=${this.wallet}></w3m-mobile-download-links>
    `}};ev=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,c.Mo)("w3m-connecting-wc-unsupported")],ev);var eC=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let ex=class extends er{constructor(){if(super(),this.isLoading=!0,!this.wallet)throw Error("w3m-connecting-wc-web: No wallet provided");this.onConnect=this.onConnectProxy.bind(this),this.secondaryBtnLabel="Open",this.secondaryLabel=en.bq.CONNECT_LABELS.MOBILE,this.secondaryBtnIcon="externalLink",this.updateLoadingState(),this.unsubscribe.push(p.ConnectionController.subscribeKey("wcUri",()=>{this.updateLoadingState()})),f.X.sendEvent({type:"track",event:"SELECT_WALLET",properties:{name:this.wallet.name,platform:"web",displayIndex:this.wallet?.display_index,walletRank:this.wallet?.order,view:g.RouterController.state.view}})}updateLoadingState(){this.isLoading=!this.uri}onConnectProxy(){if(this.wallet?.webapp_link&&this.uri)try{this.error=!1;let{webapp_link:e,name:t}=this.wallet,{redirect:r,href:o}=n.j.formatUniversalUrl(e,this.uri);p.ConnectionController.setWcLinking({name:t,href:o}),p.ConnectionController.setRecentWallet(this.wallet),n.j.openHref(r,"_blank")}catch{this.error=!0}}};eC([(0,i.SB)()],ex.prototype,"isLoading",void 0),ex=eC([(0,c.Mo)("w3m-connecting-wc-web")],ex);let e$=(0,c.iv)`
  :host([data-mobile-fullscreen='true']) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :host([data-mobile-fullscreen='true']) wui-ux-by-reown {
    margin-top: auto;
  }
`;var ek=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eR=class extends o.oi{constructor(){super(),this.wallet=g.RouterController.state.data?.wallet,this.unsubscribe=[],this.platform=void 0,this.platforms=[],this.isSiwxEnabled=!!l.OptionsController.state.siwx,this.remoteFeatures=l.OptionsController.state.remoteFeatures,this.displayBranding=!0,this.basic=!1,this.determinePlatforms(),this.initializeConnection(),this.unsubscribe.push(l.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){return l.OptionsController.state.enableMobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),(0,o.dy)`
      ${this.headerTemplate()}
      <div class="platform-container">${this.platformTemplate()}</div>
      ${this.reownBrandingTemplate()}
    `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding&&this.displayBranding?(0,o.dy)`<wui-ux-by-reown></wui-ux-by-reown>`:null}async initializeConnection(e=!1){if("browser"!==this.platform&&(!l.OptionsController.state.manualWCControl||e))try{let{wcPairingExpiry:t,status:r}=p.ConnectionController.state,{redirectView:o}=g.RouterController.state.data??{};if(e||l.OptionsController.state.enableEmbedded||n.j.isPairingExpired(t)||"connecting"===r){let e=p.ConnectionController.getConnections(E.R.state.activeChain),t=this.remoteFeatures?.multiWallet,r=e.length>0;await p.ConnectionController.connectWalletConnect({cache:"never"}),this.isSiwxEnabled||(r&&t?(g.RouterController.replace("ProfileWallets"),S.SnackController.showSuccess("New Wallet Added")):o?g.RouterController.replace(o):T.I.close())}}catch(e){if(e instanceof Error&&e.message.includes("An error occurred when attempting to switch chain")&&!l.OptionsController.state.enableNetworkSwitch&&E.R.state.activeChain){E.R.setActiveCaipNetwork(B.f.getUnsupportedNetwork(`${E.R.state.activeChain}:${E.R.state.activeCaipNetwork?.id}`)),E.R.showUnsupportedChainUI();return}e instanceof A.g&&e.originalName===R.jD.PROVIDER_RPC_ERROR_NAME.USER_REJECTED_REQUEST?f.X.sendEvent({type:"track",event:"USER_REJECTED",properties:{message:e.message}}):f.X.sendEvent({type:"track",event:"CONNECT_ERROR",properties:{message:e?.message??"Unknown"}}),p.ConnectionController.setWcError(!0),S.SnackController.showError(e.message??"Connection error"),p.ConnectionController.resetWcConnection(),g.RouterController.goBack()}}determinePlatforms(){if(!this.wallet){this.platforms.push("qrcode"),this.platform="qrcode";return}if(this.platform)return;let{mobile_link:e,desktop_link:t,webapp_link:r,injected:o,rdns:i}=this.wallet,a=o?.map(({injected_id:e})=>e).filter(Boolean),s=[...i?[i]:a??[]],c=!l.OptionsController.state.isUniversalProvider&&s.length,d=p.ConnectionController.checkInstalled(s),u=c&&d,h=t&&!n.j.isMobile();u&&!E.R.state.noAdapters&&this.platforms.push("browser"),e&&this.platforms.push(n.j.isMobile()?"mobile":"qrcode"),r&&this.platforms.push("web"),h&&this.platforms.push("desktop"),u||!c||E.R.state.noAdapters||this.platforms.push("unsupported"),this.platform=this.platforms[0]}platformTemplate(){switch(this.platform){case"browser":return(0,o.dy)`<w3m-connecting-wc-browser></w3m-connecting-wc-browser>`;case"web":return(0,o.dy)`<w3m-connecting-wc-web></w3m-connecting-wc-web>`;case"desktop":return(0,o.dy)`
          <w3m-connecting-wc-desktop .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-desktop>
        `;case"mobile":return(0,o.dy)`
          <w3m-connecting-wc-mobile isMobile .onRetry=${()=>this.initializeConnection(!0)}>
          </w3m-connecting-wc-mobile>
        `;case"qrcode":return(0,o.dy)`<w3m-connecting-wc-qrcode ?basic=${this.basic}></w3m-connecting-wc-qrcode>`;default:return(0,o.dy)`<w3m-connecting-wc-unsupported></w3m-connecting-wc-unsupported>`}}headerTemplate(){return this.platforms.length>1?(0,o.dy)`
      <w3m-connecting-header
        .platforms=${this.platforms}
        .onSelectPlatfrom=${this.onSelectPlatform.bind(this)}
      >
      </w3m-connecting-header>
    `:null}async onSelectPlatform(e){let t=this.shadowRoot?.querySelector("div");t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.platform=e,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}};eR.styles=e$,ek([(0,i.SB)()],eR.prototype,"platform",void 0),ek([(0,i.SB)()],eR.prototype,"platforms",void 0),ek([(0,i.SB)()],eR.prototype,"isSiwxEnabled",void 0),ek([(0,i.SB)()],eR.prototype,"remoteFeatures",void 0),ek([(0,i.Cb)({type:Boolean})],eR.prototype,"displayBranding",void 0),ek([(0,i.Cb)({type:Boolean})],eR.prototype,"basic",void 0),eR=ek([(0,c.Mo)("w3m-connecting-wc-view")],eR);var eE=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eS=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.isMobile=n.j.isMobile(),this.remoteFeatures=l.OptionsController.state.remoteFeatures,this.unsubscribe.push(l.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){if(this.isMobile){let{featured:e,recommended:t}=a.ApiController.state,{customWallets:r}=l.OptionsController.state,i=s.M.getRecentWallets(),n=e.length||t.length||r?.length||i.length;return(0,o.dy)`<wui-flex flexDirection="column" gap="2" .margin=${["1","3","3","3"]}>
        ${n?(0,o.dy)`<w3m-connector-list></w3m-connector-list>`:null}
        <w3m-all-wallets-widget></w3m-all-wallets-widget>
      </wui-flex>`}return(0,o.dy)`<wui-flex flexDirection="column" .padding=${["0","0","4","0"]}>
        <w3m-connecting-wc-view ?basic=${!0} .displayBranding=${!1}></w3m-connecting-wc-view>
        <wui-flex flexDirection="column" .padding=${["0","3","0","3"]}>
          <w3m-all-wallets-widget></w3m-all-wallets-widget>
        </wui-flex>
      </wui-flex>
      ${this.reownBrandingTemplate()} `}reownBrandingTemplate(){return this.remoteFeatures?.reownBranding?(0,o.dy)` <wui-flex flexDirection="column" .padding=${["1","0","1","0"]}>
      <wui-ux-by-reown></wui-ux-by-reown>
    </wui-flex>`:null}};eE([(0,i.SB)()],eS.prototype,"isMobile",void 0),eE([(0,i.SB)()],eS.prototype,"remoteFeatures",void 0),eS=eE([(0,c.Mo)("w3m-connecting-wc-basic-view")],eS);var eT=r(53927);let{I:eA}=eT._$LH,eB=e=>void 0===e.strings;var eI=r(63331);let eP=(e,t)=>{let r=e._$AN;if(void 0===r)return!1;for(let e of r)e._$AO?.(t,!1),eP(e,t);return!0},ej=e=>{let t,r;do{if(void 0===(t=e._$AM))break;(r=t._$AN).delete(e),e=t}while(0===r?.size)},eL=e=>{for(let t;t=e._$AM;e=t){let r=t._$AN;if(void 0===r)t._$AN=r=new Set;else if(r.has(e))break;r.add(e),eW(t)}};function eO(e){void 0!==this._$AN?(ej(this),this._$AM=e,eL(this)):this._$AM=e}function eM(e,t=!1,r=0){let o=this._$AH,i=this._$AN;if(void 0!==i&&0!==i.size){if(t){if(Array.isArray(o))for(let e=r;e<o.length;e++)eP(o[e],!1),ej(o[e]);else null!=o&&(eP(o,!1),ej(o))}else eP(this,e)}}let eW=e=>{e.type==eI.pX.CHILD&&(e._$AP??=eM,e._$AQ??=eO)};class eN extends eI.Xe{constructor(){super(...arguments),this._$AN=void 0}_$AT(e,t,r){super._$AT(e,t,r),eL(this),this.isConnected=e._$AU}_$AO(e,t=!0){e!==this.isConnected&&(this.isConnected=e,e?this.reconnected?.():this.disconnected?.()),t&&(eP(this,e),ej(this))}setValue(e){if(eB(this._$Ct))this._$Ct._$AI(e,this);else{let t=[...this._$Ct._$AH];t[this._$Ci]=e,this._$Ct._$AI(t,this,0)}}disconnected(){}reconnected(){}}let ez=()=>new eD;class eD{}let e_=new WeakMap,eU=(0,eI.XM)(class extends eN{render(e){return eT.Ld}update(e,[t]){let r=t!==this.G;return r&&void 0!==this.G&&this.rt(void 0),(r||this.lt!==this.ct)&&(this.G=t,this.ht=e.options?.host,this.rt(this.ct=e.element)),eT.Ld}rt(e){if(this.isConnected||(e=void 0),"function"==typeof this.G){let t=this.ht??globalThis,r=e_.get(t);void 0===r&&(r=new WeakMap,e_.set(t,r)),void 0!==r.get(this.G)&&this.G.call(this.ht,void 0),r.set(this.G,e),void 0!==e&&this.G.call(this.ht,e)}else this.G.value=e}get lt(){return"function"==typeof this.G?e_.get(this.ht??globalThis)?.get(this.G):this.G?.value}disconnected(){this.lt===this.ct&&this.rt(void 0)}reconnected(){this.rt(this.ct)}}),eF=(0,j.iv)`
  :host {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  label {
    position: relative;
    display: inline-block;
    user-select: none;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  input {
    width: 0;
    height: 0;
    opacity: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: ${({colors:e})=>e.neutrals300};
    border-radius: ${({borderRadius:e})=>e.round};
    border: 1px solid transparent;
    will-change: border;
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      border ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      width ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      height ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, color, border, box-shadow, width, height, transform, opacity;
  }

  span:before {
    content: '';
    position: absolute;
    background-color: ${({colors:e})=>e.white};
    border-radius: 50%;
  }

  /* -- Sizes --------------------------------------------------------- */
  label[data-size='lg'] {
    width: 48px;
    height: 32px;
  }

  label[data-size='md'] {
    width: 40px;
    height: 28px;
  }

  label[data-size='sm'] {
    width: 32px;
    height: 22px;
  }

  label[data-size='lg'] > span:before {
    height: 24px;
    width: 24px;
    left: 4px;
    top: 3px;
  }

  label[data-size='md'] > span:before {
    height: 20px;
    width: 20px;
    left: 4px;
    top: 3px;
  }

  label[data-size='sm'] > span:before {
    height: 16px;
    width: 16px;
    left: 3px;
    top: 2px;
  }

  /* -- Focus states --------------------------------------------------- */
  input:focus-visible:not(:checked) + span,
  input:focus:not(:checked) + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    background-color: ${({tokens:e})=>e.theme.textTertiary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  input:focus-visible:checked + span,
  input:focus:checked + span {
    border: 1px solid ${({tokens:e})=>e.core.iconAccentPrimary};
    box-shadow: 0px 0px 0px 4px rgba(9, 136, 240, 0.2);
  }

  /* -- Checked states --------------------------------------------------- */
  input:checked + span {
    background-color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  label[data-size='lg'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='md'] > input:checked + span:before {
    transform: translateX(calc(100% - 9px));
  }

  label[data-size='sm'] > input:checked + span:before {
    transform: translateX(calc(100% - 7px));
  }

  /* -- Hover states ------------------------------------------------------- */
  label:hover > input:not(:checked):not(:disabled) + span {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  label:hover > input:checked:not(:disabled) + span {
    background-color: ${({colors:e})=>e.accent080};
  }

  /* -- Disabled state --------------------------------------------------- */
  label:has(input:disabled) {
    pointer-events: none;
    user-select: none;
  }

  input:not(:checked):disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:checked:disabled + span {
    background-color: ${({colors:e})=>e.neutrals700};
  }

  input:not(:checked):disabled + span::before {
    background-color: ${({colors:e})=>e.neutrals400};
  }

  input:checked:disabled + span::before {
    background-color: ${({tokens:e})=>e.theme.textTertiary};
  }
`;var eH=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eq=class extends o.oi{constructor(){super(...arguments),this.inputElementRef=ez(),this.checked=!1,this.disabled=!1,this.size="md"}render(){return(0,o.dy)`
      <label data-size=${this.size}>
        <input
          ${eU(this.inputElementRef)}
          type="checkbox"
          ?checked=${this.checked}
          ?disabled=${this.disabled}
          @change=${this.dispatchChangeEvent.bind(this)}
        />
        <span></span>
      </label>
    `}dispatchChangeEvent(){this.dispatchEvent(new CustomEvent("switchChange",{detail:this.inputElementRef.value?.checked,bubbles:!0,composed:!0}))}};eq.styles=[I.ET,I.ZM,eF],eH([(0,i.Cb)({type:Boolean})],eq.prototype,"checked",void 0),eH([(0,i.Cb)({type:Boolean})],eq.prototype,"disabled",void 0),eH([(0,i.Cb)()],eq.prototype,"size",void 0),eq=eH([(0,P.M)("wui-toggle")],eq);let eK=(0,j.iv)`
  :host {
    height: auto;
  }

  :host > wui-flex {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    column-gap: ${({spacing:e})=>e["2"]};
    padding: ${({spacing:e})=>e["2"]} ${({spacing:e})=>e["3"]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e["4"]};
    box-shadow: inset 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    cursor: pointer;
  }

  wui-switch {
    pointer-events: none;
  }
`;var eV=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eY=class extends o.oi{constructor(){super(...arguments),this.checked=!1}render(){return(0,o.dy)`
      <wui-flex>
        <wui-icon size="xl" name="walletConnectBrown"></wui-icon>
        <wui-toggle
          ?checked=${this.checked}
          size="sm"
          @switchChange=${this.handleToggleChange.bind(this)}
        ></wui-toggle>
      </wui-flex>
    `}handleToggleChange(e){e.stopPropagation(),this.checked=e.detail,this.dispatchSwitchEvent()}dispatchSwitchEvent(){this.dispatchEvent(new CustomEvent("certifiedSwitchChange",{detail:this.checked,bubbles:!0,composed:!0}))}};eY.styles=[I.ET,I.ZM,eK],eV([(0,i.Cb)({type:Boolean})],eY.prototype,"checked",void 0),eY=eV([(0,P.M)("wui-certified-switch")],eY);let eX=(0,j.iv)`
  :host {
    position: relative;
    width: 100%;
    display: inline-flex;
    flex-direction: column;
    gap: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.textPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  .wui-input-text-container {
    position: relative;
    display: flex;
  }

  input {
    width: 100%;
    border-radius: ${({borderRadius:e})=>e[4]};
    color: inherit;
    background: transparent;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    caret-color: ${({tokens:e})=>e.core.textAccentPrimary};
    padding: ${({spacing:e})=>e[3]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[3]} ${({spacing:e})=>e[10]};
    font-size: ${({textSize:e})=>e.large};
    line-height: ${({typography:e})=>e["lg-regular"].lineHeight};
    letter-spacing: ${({typography:e})=>e["lg-regular"].letterSpacing};
    font-weight: ${({fontWeight:e})=>e.regular};
    font-family: ${({fontFamily:e})=>e.regular};
  }

  input[data-size='lg'] {
    padding: ${({spacing:e})=>e[4]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[4]} ${({spacing:e})=>e[10]};
  }

  @media (hover: hover) and (pointer: fine) {
    input:hover:enabled {
      border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    }
  }

  input:disabled {
    cursor: unset;
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
  }

  input::placeholder {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  input:focus:enabled {
    border: 1px solid ${({tokens:e})=>e.theme.borderSecondary};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    -webkit-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    -moz-box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
    box-shadow: 0px 0px 0px 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  div.wui-input-text-container:has(input:disabled) {
    opacity: 0.5;
  }

  wui-icon.wui-input-text-left-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    pointer-events: none;
    left: ${({spacing:e})=>e[4]};
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button.wui-input-text-submit-button {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    width: 24px;
    height: 24px;
    border: none;
    background: transparent;
    border-radius: ${({borderRadius:e})=>e[2]};
    color: ${({tokens:e})=>e.core.textAccentPrimary};
  }

  button.wui-input-text-submit-button:disabled {
    opacity: 1;
  }

  button.wui-input-text-submit-button.loading wui-icon {
    animation: spin 1s linear infinite;
  }

  button.wui-input-text-submit-button:hover {
    background: ${({tokens:e})=>e.core.foregroundAccent010};
  }

  input:has(+ .wui-input-text-submit-button) {
    padding-right: ${({spacing:e})=>e[12]};
  }

  input[type='number'] {
    -moz-appearance: textfield;
  }

  input[type='search']::-webkit-search-decoration,
  input[type='search']::-webkit-search-cancel-button,
  input[type='search']::-webkit-search-results-button,
  input[type='search']::-webkit-search-results-decoration {
    -webkit-appearance: none;
  }

  /* -- Keyframes --------------------------------------------------- */
  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(360deg);
    }
  }
`;var eJ=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let eG=class extends o.oi{constructor(){super(...arguments),this.inputElementRef=ez(),this.disabled=!1,this.loading=!1,this.placeholder="",this.type="text",this.value="",this.size="md"}render(){return(0,o.dy)` <div class="wui-input-text-container">
        ${this.templateLeftIcon()}
        <input
          data-size=${this.size}
          ${eU(this.inputElementRef)}
          data-testid="wui-input-text"
          type=${this.type}
          enterkeyhint=${(0,d.o)(this.enterKeyHint)}
          ?disabled=${this.disabled}
          placeholder=${this.placeholder}
          @input=${this.dispatchInputChangeEvent.bind(this)}
          @keydown=${this.onKeyDown}
          .value=${this.value||""}
        />
        ${this.templateSubmitButton()}
        <slot class="wui-input-text-slot"></slot>
      </div>
      ${this.templateError()} ${this.templateWarning()}`}templateLeftIcon(){return this.icon?(0,o.dy)`<wui-icon
        class="wui-input-text-left-icon"
        size="md"
        data-size=${this.size}
        color="inherit"
        name=${this.icon}
      ></wui-icon>`:null}templateSubmitButton(){return this.onSubmit?(0,o.dy)`<button
        class="wui-input-text-submit-button ${this.loading?"loading":""}"
        @click=${this.onSubmit?.bind(this)}
        ?disabled=${this.disabled||this.loading}
      >
        ${this.loading?(0,o.dy)`<wui-icon name="spinner" size="md"></wui-icon>`:(0,o.dy)`<wui-icon name="chevronRight" size="md"></wui-icon>`}
      </button>`:null}templateError(){return this.errorText?(0,o.dy)`<wui-text variant="sm-regular" color="error">${this.errorText}</wui-text>`:null}templateWarning(){return this.warningText?(0,o.dy)`<wui-text variant="sm-regular" color="warning">${this.warningText}</wui-text>`:null}dispatchInputChangeEvent(){this.dispatchEvent(new CustomEvent("inputChange",{detail:this.inputElementRef.value?.value,bubbles:!0,composed:!0}))}};eG.styles=[I.ET,I.ZM,eX],eJ([(0,i.Cb)()],eG.prototype,"icon",void 0),eJ([(0,i.Cb)({type:Boolean})],eG.prototype,"disabled",void 0),eJ([(0,i.Cb)({type:Boolean})],eG.prototype,"loading",void 0),eJ([(0,i.Cb)()],eG.prototype,"placeholder",void 0),eJ([(0,i.Cb)()],eG.prototype,"type",void 0),eJ([(0,i.Cb)()],eG.prototype,"value",void 0),eJ([(0,i.Cb)()],eG.prototype,"errorText",void 0),eJ([(0,i.Cb)()],eG.prototype,"warningText",void 0),eJ([(0,i.Cb)()],eG.prototype,"onSubmit",void 0),eJ([(0,i.Cb)()],eG.prototype,"size",void 0),eJ([(0,i.Cb)({attribute:!1})],eG.prototype,"onKeyDown",void 0),eG=eJ([(0,P.M)("wui-input-text")],eG);let eQ=(0,j.iv)`
  :host {
    position: relative;
    display: inline-block;
    width: 100%;
  }

  wui-icon {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    right: ${({spacing:e})=>e[3]};
    color: ${({tokens:e})=>e.theme.iconDefault};
    cursor: pointer;
    padding: ${({spacing:e})=>e[2]};
    background-color: transparent;
    border-radius: ${({borderRadius:e})=>e[4]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
  }

  @media (hover: hover) {
    wui-icon:hover {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }
`;var eZ=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let e0=class extends o.oi{constructor(){super(...arguments),this.inputComponentRef=ez(),this.inputValue=""}render(){return(0,o.dy)`
      <wui-input-text
        ${eU(this.inputComponentRef)}
        placeholder="Search wallet"
        icon="search"
        type="search"
        enterKeyHint="search"
        size="sm"
        @inputChange=${this.onInputChange}
      >
        ${this.inputValue?(0,o.dy)`<wui-icon
              @click=${this.clearValue}
              color="inherit"
              size="sm"
              name="close"
            ></wui-icon>`:null}
      </wui-input-text>
    `}onInputChange(e){this.inputValue=e.detail||""}clearValue(){let e=this.inputComponentRef.value,t=e?.inputElementRef.value;t&&(t.value="",this.inputValue="",t.focus(),t.dispatchEvent(new Event("input")))}};e0.styles=[I.ET,eQ],eZ([(0,i.Cb)()],e0.prototype,"inputValue",void 0),e0=eZ([(0,P.M)("wui-search-bar")],e0);let e1=(0,o.YP)`<svg  viewBox="0 0 48 54" fill="none">
  <path
    d="M43.4605 10.7248L28.0485 1.61089C25.5438 0.129705 22.4562 0.129705 19.9515 1.61088L4.53951 10.7248C2.03626 12.2051 0.5 14.9365 0.5 17.886V36.1139C0.5 39.0635 2.03626 41.7949 4.53951 43.2752L19.9515 52.3891C22.4562 53.8703 25.5438 53.8703 28.0485 52.3891L43.4605 43.2752C45.9637 41.7949 47.5 39.0635 47.5 36.114V17.8861C47.5 14.9365 45.9637 12.2051 43.4605 10.7248Z"
  />
</svg>`,e3=(0,j.iv)`
  :host {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 104px;
    width: 104px;
    row-gap: ${({spacing:e})=>e[2]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: ${({borderRadius:e})=>e[5]};
    position: relative;
  }

  wui-shimmer[data-type='network'] {
    border: none;
    -webkit-clip-path: var(--apkt-path-network);
    clip-path: var(--apkt-path-network);
  }

  svg {
    position: absolute;
    width: 48px;
    height: 54px;
    z-index: 1;
  }

  svg > path {
    stroke: ${({tokens:e})=>e.theme.foregroundSecondary};
    stroke-width: 1px;
  }

  @media (max-width: 350px) {
    :host {
      width: 100%;
    }
  }
`;var e2=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let e4=class extends o.oi{constructor(){super(...arguments),this.type="wallet"}render(){return(0,o.dy)`
      ${this.shimmerTemplate()}
      <wui-shimmer width="80px" height="20px"></wui-shimmer>
    `}shimmerTemplate(){return"network"===this.type?(0,o.dy)` <wui-shimmer data-type=${this.type} width="48px" height="54px"></wui-shimmer>
        ${e1}`:(0,o.dy)`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}};e4.styles=[I.ET,I.ZM,e3],e2([(0,i.Cb)()],e4.prototype,"type",void 0),e4=e2([(0,P.M)("wui-card-select-loader")],e4);var e5=r(54754);let e6=(0,o.iv)`
  :host {
    display: grid;
    width: inherit;
    height: inherit;
  }
`;var e8=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let e9=class extends o.oi{render(){return this.style.cssText=`
      grid-template-rows: ${this.gridTemplateRows};
      grid-template-columns: ${this.gridTemplateColumns};
      justify-items: ${this.justifyItems};
      align-items: ${this.alignItems};
      justify-content: ${this.justifyContent};
      align-content: ${this.alignContent};
      column-gap: ${this.columnGap&&`var(--apkt-spacing-${this.columnGap})`};
      row-gap: ${this.rowGap&&`var(--apkt-spacing-${this.rowGap})`};
      gap: ${this.gap&&`var(--apkt-spacing-${this.gap})`};
      padding-top: ${this.padding&&e5.H.getSpacingStyles(this.padding,0)};
      padding-right: ${this.padding&&e5.H.getSpacingStyles(this.padding,1)};
      padding-bottom: ${this.padding&&e5.H.getSpacingStyles(this.padding,2)};
      padding-left: ${this.padding&&e5.H.getSpacingStyles(this.padding,3)};
      margin-top: ${this.margin&&e5.H.getSpacingStyles(this.margin,0)};
      margin-right: ${this.margin&&e5.H.getSpacingStyles(this.margin,1)};
      margin-bottom: ${this.margin&&e5.H.getSpacingStyles(this.margin,2)};
      margin-left: ${this.margin&&e5.H.getSpacingStyles(this.margin,3)};
    `,(0,o.dy)`<slot></slot>`}};e9.styles=[I.ET,e6],e8([(0,i.Cb)()],e9.prototype,"gridTemplateRows",void 0),e8([(0,i.Cb)()],e9.prototype,"gridTemplateColumns",void 0),e8([(0,i.Cb)()],e9.prototype,"justifyItems",void 0),e8([(0,i.Cb)()],e9.prototype,"alignItems",void 0),e8([(0,i.Cb)()],e9.prototype,"justifyContent",void 0),e8([(0,i.Cb)()],e9.prototype,"alignContent",void 0),e8([(0,i.Cb)()],e9.prototype,"columnGap",void 0),e8([(0,i.Cb)()],e9.prototype,"rowGap",void 0),e8([(0,i.Cb)()],e9.prototype,"gap",void 0),e8([(0,i.Cb)()],e9.prototype,"padding",void 0),e8([(0,i.Cb)()],e9.prototype,"margin",void 0),e9=e8([(0,P.M)("wui-grid")],e9);var e7=r(28993);let te=(0,c.iv)`
  button {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    width: 104px;
    row-gap: ${({spacing:e})=>e["2"]};
    padding: ${({spacing:e})=>e["3"]} ${({spacing:e})=>e["0"]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    border-radius: clamp(0px, ${({borderRadius:e})=>e["4"]}, 20px);
    transition:
      color ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: background-color, color, border-radius;
    outline: none;
    border: none;
  }

  button > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textPrimary};
    max-width: 86px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    justify-content: center;
  }

  button > wui-flex > wui-text.certified {
    max-width: 66px;
  }

  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  button:disabled > wui-flex > wui-text {
    color: ${({tokens:e})=>e.core.glass010};
  }

  [data-selected='true'] {
    background-color: ${({colors:e})=>e.accent020};
  }

  @media (hover: hover) and (pointer: fine) {
    [data-selected='true']:hover:enabled {
      background-color: ${({colors:e})=>e.accent010};
    }
  }

  [data-selected='true']:active:enabled {
    background-color: ${({colors:e})=>e.accent010};
  }

  @media (max-width: 350px) {
    button {
      width: 100%;
    }
  }
`;var tt=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tr=class extends o.oi{constructor(){super(),this.observer=new IntersectionObserver(()=>void 0),this.visible=!1,this.imageSrc=void 0,this.imageLoading=!1,this.isImpressed=!1,this.explorerId="",this.walletQuery="",this.certified=!1,this.displayIndex=0,this.wallet=void 0,this.observer=new IntersectionObserver(e=>{e.forEach(e=>{e.isIntersecting?(this.visible=!0,this.fetchImageSrc(),this.sendImpressionEvent()):this.visible=!1})},{threshold:.01})}firstUpdated(){this.observer.observe(this)}disconnectedCallback(){this.observer.disconnect()}render(){let e=this.wallet?.badge_type==="certified";return(0,o.dy)`
      <button>
        ${this.imageTemplate()}
        <wui-flex flexDirection="row" alignItems="center" justifyContent="center" gap="1">
          <wui-text
            variant="md-regular"
            color="inherit"
            class=${(0,d.o)(e?"certified":void 0)}
            >${this.wallet?.name}</wui-text
          >
          ${e?(0,o.dy)`<wui-icon size="sm" name="walletConnectBrown"></wui-icon>`:null}
        </wui-flex>
      </button>
    `}imageTemplate(){return(this.visible||this.imageSrc)&&!this.imageLoading?(0,o.dy)`
      <wui-wallet-image
        size="lg"
        imageSrc=${(0,d.o)(this.imageSrc)}
        name=${(0,d.o)(this.wallet?.name)}
        .installed=${this.wallet?.installed??!1}
        badgeSize="sm"
      >
      </wui-wallet-image>
    `:this.shimmerTemplate()}shimmerTemplate(){return(0,o.dy)`<wui-shimmer width="56px" height="56px"></wui-shimmer>`}async fetchImageSrc(){this.wallet&&(this.imageSrc=y.f.getWalletImage(this.wallet),this.imageSrc||(this.imageLoading=!0,this.imageSrc=await y.f.fetchWalletImage(this.wallet.image_id),this.imageLoading=!1))}sendImpressionEvent(){this.wallet&&!this.isImpressed&&(this.isImpressed=!0,f.X.sendWalletImpressionEvent({name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.explorerId,view:g.RouterController.state.view,query:this.walletQuery,certified:this.certified,displayIndex:this.displayIndex}))}};tr.styles=te,tt([(0,i.SB)()],tr.prototype,"visible",void 0),tt([(0,i.SB)()],tr.prototype,"imageSrc",void 0),tt([(0,i.SB)()],tr.prototype,"imageLoading",void 0),tt([(0,i.SB)()],tr.prototype,"isImpressed",void 0),tt([(0,i.Cb)()],tr.prototype,"explorerId",void 0),tt([(0,i.Cb)()],tr.prototype,"walletQuery",void 0),tt([(0,i.Cb)()],tr.prototype,"certified",void 0),tt([(0,i.Cb)()],tr.prototype,"displayIndex",void 0),tt([(0,i.Cb)({type:Object})],tr.prototype,"wallet",void 0),tr=tt([(0,c.Mo)("w3m-all-wallets-list-item")],tr);let to=(0,c.iv)`
  wui-grid {
    max-height: clamp(360px, 400px, 80vh);
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  w3m-all-wallets-list-item {
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-inout-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  wui-loading-spinner {
    padding-top: ${({spacing:e})=>e["4"]};
    padding-bottom: ${({spacing:e})=>e["4"]};
    justify-content: center;
    grid-column: 1 / span 4;
  }
`;var ti=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tn="local-paginator",tl=class extends o.oi{constructor(){super(),this.unsubscribe=[],this.paginationObserver=void 0,this.loading=!a.ApiController.state.wallets.length,this.wallets=a.ApiController.state.wallets,this.recommended=a.ApiController.state.recommended,this.featured=a.ApiController.state.featured,this.filteredWallets=a.ApiController.state.filteredWallets,this.mobileFullScreen=l.OptionsController.state.enableMobileFullScreen,this.unsubscribe.push(a.ApiController.subscribeKey("wallets",e=>this.wallets=e),a.ApiController.subscribeKey("recommended",e=>this.recommended=e),a.ApiController.subscribeKey("featured",e=>this.featured=e),a.ApiController.subscribeKey("filteredWallets",e=>this.filteredWallets=e))}firstUpdated(){this.initialFetch(),this.createPaginationObserver()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.paginationObserver?.disconnect()}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),(0,o.dy)`
      <wui-grid
        data-scroll=${!this.loading}
        .padding=${["0","3","3","3"]}
        gap="2"
        justifyContent="space-between"
      >
        ${this.loading?this.shimmerTemplate(16):this.walletsTemplate()}
        ${this.paginationLoaderTemplate()}
      </wui-grid>
    `}async initialFetch(){this.loading=!0;let e=this.shadowRoot?.querySelector("wui-grid");e&&(await a.ApiController.fetchWalletsByPage({page:1}),await e.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.loading=!1,e.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}shimmerTemplate(e,t){return[...Array(e)].map(()=>(0,o.dy)`
        <wui-card-select-loader type="wallet" id=${(0,d.o)(t)}></wui-card-select-loader>
      `)}getWallets(){let e=[...this.featured,...this.recommended];this.filteredWallets?.length>0?e.push(...this.filteredWallets):e.push(...this.wallets);let t=n.j.uniqueBy(e,"id"),r=e7.J.markWalletsAsInstalled(t);return e7.J.markWalletsWithDisplayIndex(r)}walletsTemplate(){return this.getWallets().map((e,t)=>(0,o.dy)`
        <w3m-all-wallets-list-item
          data-testid="wallet-search-item-${e.id}"
          @click=${()=>this.onConnectWallet(e)}
          .wallet=${e}
          explorerId=${e.id}
          certified=${"certified"===this.badge}
          displayIndex=${t}
        ></w3m-all-wallets-list-item>
      `)}paginationLoaderTemplate(){let{wallets:e,recommended:t,featured:r,count:o,mobileFilteredOutWalletsLength:i}=a.ApiController.state,n=window.innerWidth<352?3:4,l=e.length+t.length,s=Math.ceil(l/n)*n-l+n;return(s-=e.length?r.length%n:0,0===o&&r.length>0)?null:0===o||[...r,...e,...t].length<o-(i??0)?this.shimmerTemplate(s,tn):null}createPaginationObserver(){let e=this.shadowRoot?.querySelector(`#${tn}`);e&&(this.paginationObserver=new IntersectionObserver(([e])=>{if(e?.isIntersecting&&!this.loading){let{page:e,count:t,wallets:r}=a.ApiController.state;r.length<t&&a.ApiController.fetchWalletsByPage({page:e+1})}}),this.paginationObserver.observe(e))}onConnectWallet(e){h.ConnectorController.selectWalletConnector(e)}};tl.styles=to,ti([(0,i.SB)()],tl.prototype,"loading",void 0),ti([(0,i.SB)()],tl.prototype,"wallets",void 0),ti([(0,i.SB)()],tl.prototype,"recommended",void 0),ti([(0,i.SB)()],tl.prototype,"featured",void 0),ti([(0,i.SB)()],tl.prototype,"filteredWallets",void 0),ti([(0,i.SB)()],tl.prototype,"badge",void 0),ti([(0,i.SB)()],tl.prototype,"mobileFullScreen",void 0),tl=ti([(0,c.Mo)("w3m-all-wallets-list")],tl),r(31617);let ta=(0,o.iv)`
  wui-grid,
  wui-loading-spinner,
  wui-flex {
    height: 360px;
  }

  wui-grid {
    overflow: scroll;
    scrollbar-width: none;
    grid-auto-rows: min-content;
    grid-template-columns: repeat(auto-fill, 104px);
  }

  :host([data-mobile-fullscreen='true']) wui-grid {
    max-height: none;
    height: auto;
  }

  wui-grid[data-scroll='false'] {
    overflow: hidden;
  }

  wui-grid::-webkit-scrollbar {
    display: none;
  }

  wui-loading-spinner {
    justify-content: center;
    align-items: center;
  }

  @media (max-width: 350px) {
    wui-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
`;var ts=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tc=class extends o.oi{constructor(){super(...arguments),this.prevQuery="",this.prevBadge=void 0,this.loading=!0,this.mobileFullScreen=l.OptionsController.state.enableMobileFullScreen,this.query=""}render(){return this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.onSearch(),this.loading?(0,o.dy)`<wui-loading-spinner color="accent-primary"></wui-loading-spinner>`:this.walletsTemplate()}async onSearch(){(this.query.trim()!==this.prevQuery.trim()||this.badge!==this.prevBadge)&&(this.prevQuery=this.query,this.prevBadge=this.badge,this.loading=!0,await a.ApiController.searchWallet({search:this.query,badge:this.badge}),this.loading=!1)}walletsTemplate(){let{search:e}=a.ApiController.state,t=e7.J.markWalletsAsInstalled(e);return e.length?(0,o.dy)`
      <wui-grid
        data-testid="wallet-list"
        .padding=${["0","3","3","3"]}
        rowGap="4"
        columngap="2"
        justifyContent="space-between"
      >
        ${t.map((e,t)=>(0,o.dy)`
            <w3m-all-wallets-list-item
              @click=${()=>this.onConnectWallet(e)}
              .wallet=${e}
              data-testid="wallet-search-item-${e.id}"
              explorerId=${e.id}
              certified=${"certified"===this.badge}
              walletQuery=${this.query}
              displayIndex=${t}
            ></w3m-all-wallets-list-item>
          `)}
      </wui-grid>
    `:(0,o.dy)`
        <wui-flex
          data-testid="no-wallet-found"
          justifyContent="center"
          alignItems="center"
          gap="3"
          flexDirection="column"
        >
          <wui-icon-box size="lg" color="default" icon="wallet"></wui-icon-box>
          <wui-text data-testid="no-wallet-found-text" color="secondary" variant="md-medium">
            No Wallet found
          </wui-text>
        </wui-flex>
      `}onConnectWallet(e){h.ConnectorController.selectWalletConnector(e)}};tc.styles=ta,ts([(0,i.SB)()],tc.prototype,"loading",void 0),ts([(0,i.SB)()],tc.prototype,"mobileFullScreen",void 0),ts([(0,i.Cb)()],tc.prototype,"query",void 0),ts([(0,i.Cb)()],tc.prototype,"badge",void 0),tc=ts([(0,c.Mo)("w3m-all-wallets-search")],tc);var td=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tu=class extends o.oi{constructor(){super(...arguments),this.search="",this.badge=void 0,this.onDebouncedSearch=n.j.debounce(e=>{this.search=e})}render(){let e=this.search.length>=2;return(0,o.dy)`
      <wui-flex .padding=${["1","3","3","3"]} gap="2" alignItems="center">
        <wui-search-bar @inputChange=${this.onInputChange.bind(this)}></wui-search-bar>
        <wui-certified-switch
          ?checked=${"certified"===this.badge}
          @certifiedSwitchChange=${this.onCertifiedSwitchChange.bind(this)}
          data-testid="wui-certified-switch"
        ></wui-certified-switch>
        ${this.qrButtonTemplate()}
      </wui-flex>
      ${e||this.badge?(0,o.dy)`<w3m-all-wallets-search
            query=${this.search}
            .badge=${this.badge}
          ></w3m-all-wallets-search>`:(0,o.dy)`<w3m-all-wallets-list .badge=${this.badge}></w3m-all-wallets-list>`}
    `}onInputChange(e){this.onDebouncedSearch(e.detail)}onCertifiedSwitchChange(e){e.detail?(this.badge="certified",S.SnackController.showSvg("Only WalletConnect certified",{icon:"walletConnectBrown",iconColor:"accent-100"})):this.badge=void 0}qrButtonTemplate(){return n.j.isMobile()?(0,o.dy)`
        <wui-icon-box
          size="xl"
          iconSize="xl"
          color="accent-primary"
          icon="qrCode"
          border
          borderColor="wui-accent-glass-010"
          @click=${this.onWalletConnectQr.bind(this)}
        ></wui-icon-box>
      `:null}onWalletConnectQr(){g.RouterController.push("ConnectingWalletConnect")}};td([(0,i.SB)()],tu.prototype,"search",void 0),td([(0,i.SB)()],tu.prototype,"badge",void 0),tu=td([(0,c.Mo)("w3m-all-wallets-view")],tu);let th=(0,j.iv)`
  :host {
    width: 100%;
  }

  button {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: ${({spacing:e})=>e[3]};
    width: 100%;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-radius: ${({borderRadius:e})=>e[4]};
    transition:
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      scale ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color, scale;
  }

  wui-text {
    text-transform: capitalize;
  }

  wui-image {
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  @media (hover: hover) {
    button:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    }
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var tp=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l};let tf=class extends o.oi{constructor(){super(...arguments),this.imageSrc="google",this.loading=!1,this.disabled=!1,this.rightIcon=!0,this.rounded=!1,this.fullSize=!1}render(){return this.dataset.rounded=this.rounded?"true":"false",(0,o.dy)`
      <button
        ?disabled=${!!this.loading||!!this.disabled}
        data-loading=${this.loading}
        tabindex=${(0,d.o)(this.tabIdx)}
      >
        <wui-flex gap="2" alignItems="center">
          ${this.templateLeftIcon()}
          <wui-flex gap="1">
            <slot></slot>
          </wui-flex>
        </wui-flex>
        ${this.templateRightIcon()}
      </button>
    `}templateLeftIcon(){return this.icon?(0,o.dy)`<wui-image
        icon=${this.icon}
        iconColor=${(0,d.o)(this.iconColor)}
        ?boxed=${!0}
        ?rounded=${this.rounded}
      ></wui-image>`:(0,o.dy)`<wui-image
      ?boxed=${!0}
      ?rounded=${this.rounded}
      ?fullSize=${this.fullSize}
      src=${this.imageSrc}
    ></wui-image>`}templateRightIcon(){return this.rightIcon?this.loading?(0,o.dy)`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:(0,o.dy)`<wui-icon name="chevronRight" size="lg" color="default"></wui-icon>`:null}};tf.styles=[I.ET,I.ZM,th],tp([(0,i.Cb)()],tf.prototype,"imageSrc",void 0),tp([(0,i.Cb)()],tf.prototype,"icon",void 0),tp([(0,i.Cb)()],tf.prototype,"iconColor",void 0),tp([(0,i.Cb)({type:Boolean})],tf.prototype,"loading",void 0),tp([(0,i.Cb)()],tf.prototype,"tabIdx",void 0),tp([(0,i.Cb)({type:Boolean})],tf.prototype,"disabled",void 0),tp([(0,i.Cb)({type:Boolean})],tf.prototype,"rightIcon",void 0),tp([(0,i.Cb)({type:Boolean})],tf.prototype,"rounded",void 0),tp([(0,i.Cb)({type:Boolean})],tf.prototype,"fullSize",void 0),tf=tp([(0,P.M)("wui-list-item")],tf);let tg=class extends o.oi{constructor(){super(...arguments),this.wallet=g.RouterController.state.data?.wallet}render(){if(!this.wallet)throw Error("w3m-downloads-view");return(0,o.dy)`
      <wui-flex gap="2" flexDirection="column" .padding=${["3","3","4","3"]}>
        ${this.chromeTemplate()} ${this.iosTemplate()} ${this.androidTemplate()}
        ${this.homepageTemplate()}
      </wui-flex>
    `}chromeTemplate(){return this.wallet?.chrome_store?(0,o.dy)`<wui-list-item
      variant="icon"
      icon="chromeStore"
      iconVariant="square"
      @click=${this.onChromeStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Chrome Extension</wui-text>
    </wui-list-item>`:null}iosTemplate(){return this.wallet?.app_store?(0,o.dy)`<wui-list-item
      variant="icon"
      icon="appStore"
      iconVariant="square"
      @click=${this.onAppStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">iOS App</wui-text>
    </wui-list-item>`:null}androidTemplate(){return this.wallet?.play_store?(0,o.dy)`<wui-list-item
      variant="icon"
      icon="playStore"
      iconVariant="square"
      @click=${this.onPlayStore.bind(this)}
      chevron
    >
      <wui-text variant="md-medium" color="primary">Android App</wui-text>
    </wui-list-item>`:null}homepageTemplate(){return this.wallet?.homepage?(0,o.dy)`
      <wui-list-item
        variant="icon"
        icon="browser"
        iconVariant="square-blue"
        @click=${this.onHomePage.bind(this)}
        chevron
      >
        <wui-text variant="md-medium" color="primary">Website</wui-text>
      </wui-list-item>
    `:null}openStore(e){e.href&&this.wallet&&(f.X.sendEvent({type:"track",event:"GET_WALLET",properties:{name:this.wallet.name,walletRank:this.wallet.order,explorerId:this.wallet.id,type:e.type}}),n.j.openHref(e.href,"_blank"))}onChromeStore(){this.wallet?.chrome_store&&this.openStore({href:this.wallet.chrome_store,type:"chrome_store"})}onAppStore(){this.wallet?.app_store&&this.openStore({href:this.wallet.app_store,type:"app_store"})}onPlayStore(){this.wallet?.play_store&&this.openStore({href:this.wallet.play_store,type:"play_store"})}onHomePage(){this.wallet?.homepage&&this.openStore({href:this.wallet.homepage,type:"homepage"})}};tg=function(e,t,r,o){var i,n=arguments.length,l=n<3?t:null===o?o=Object.getOwnPropertyDescriptor(t,r):o;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)l=Reflect.decorate(e,t,r,o);else for(var a=e.length-1;a>=0;a--)(i=e[a])&&(l=(n<3?i(l):n>3?i(t,r,l):i(t,r))||l);return n>3&&l&&Object.defineProperty(t,r,l),l}([(0,c.Mo)("w3m-downloads-view")],tg)}};