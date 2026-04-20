"use strict";exports.id=6284,exports.ids=[6284],exports.modules={96284:(e,t,o)=>{o.r(t),o.d(t,{AppKitModal:()=>eM,W3mListWallet:()=>eG,W3mModal:()=>ej,W3mModalBase:()=>eL,W3mRouterContainer:()=>eq,W3mUsageExceededView:()=>eV});var r=o(685),i=o(9829),a=o(83479),n=o(30288),s=o(905),l=o(77007),c=o(9346),d=o(28488),u=o(14212),p=o(35190),w=o(89355);let h={isUnsupportedChainView:()=>"UnsupportedChain"===u.RouterController.state.view||"SwitchNetwork"===u.RouterController.state.view&&u.RouterController.state.history.includes("UnsupportedChain"),async safeClose(){if(this.isUnsupportedChainView()||await w.w.isSIWXCloseDisabled()){s.I.shake();return}("DataCapture"===u.RouterController.state.view||"DataCaptureOtpConfirm"===u.RouterController.state.view)&&p.ConnectionController.disconnect(),s.I.close()}};var m=o(71106),g=o(61741),y=o(27011),b=o(20007),f=o(26898),v=o(64895),k=o(73372),C=o(72567),x=o(52180),T=o(16114),S=o(34862),$=o(17249);let A={getGasPriceInEther:(e,t)=>Number(t*e)/1e18,getGasPriceInUSD(e,t,o){let r=A.getGasPriceInEther(t,o);return f.C.bigNumber(e).times(r).toNumber()},getPriceImpact({sourceTokenAmount:e,sourceTokenPriceInUSD:t,toTokenPriceInUSD:o,toTokenAmount:r}){let i=f.C.bigNumber(e).times(t),a=f.C.bigNumber(r).times(o);return i.minus(a).div(i).times(100).toNumber()},getMaxSlippage(e,t){let o=f.C.bigNumber(e).div(100);return f.C.multiply(t,o).toNumber()},getProviderFee:(e,t=.0085)=>f.C.bigNumber(e).times(t).toString(),isInsufficientNetworkTokenForGas:(e,t)=>!!f.C.bigNumber(e).eq(0)||f.C.bigNumber(f.C.bigNumber(t||"0")).gt(e),isInsufficientSourceTokenForSwap(e,t,o){let r=o?.find(e=>e.address===t)?.quantity?.numeric;return f.C.bigNumber(r||"0").lt(e)}};var P=o(36943),R=o(15515),I=o(51672),E=o(77870);let O={initializing:!1,initialized:!1,loadingPrices:!1,loadingQuote:!1,loadingApprovalTransaction:!1,loadingBuildTransaction:!1,loadingTransaction:!1,switchingTokens:!1,fetchError:!1,approvalTransaction:void 0,swapTransaction:void 0,transactionError:void 0,sourceToken:void 0,sourceTokenAmount:"",sourceTokenPriceInUSD:0,toToken:void 0,toTokenAmount:"",toTokenPriceInUSD:0,networkPrice:"0",networkBalanceInUSD:"0",networkTokenSymbol:"",inputError:void 0,slippage:T.bq.CONVERT_SLIPPAGE_TOLERANCE,tokens:void 0,popularTokens:void 0,suggestedTokens:void 0,foundTokens:void 0,myTokensWithBalance:void 0,tokensPriceMap:{},gasFee:"0",gasPriceInUSD:0,priceImpact:void 0,maxSlippage:void 0,providerFee:void 0},N=(0,y.sj)({...O}),W={state:N,subscribe:e=>(0,y.Ld)(N,()=>e(N)),subscribeKey:(e,t)=>(0,b.VW)(N,e,t),getParams(){let e=l.R.state.activeChain,t=l.R.getAccountData(e)?.caipAddress??l.R.state.activeCaipAddress,o=S.j.getPlainAddress(t),r=(0,x.EO)(),i=c.ConnectorController.getConnectorId(l.R.state.activeChain);if(!o)throw Error("No address found to swap the tokens from.");let a=!N.toToken?.address||!N.toToken?.decimals,n=!N.sourceToken?.address||!N.sourceToken?.decimals||!f.C.bigNumber(N.sourceTokenAmount).gt(0),s=!N.sourceTokenAmount;return{networkAddress:r,fromAddress:o,fromCaipAddress:t,sourceTokenAddress:N.sourceToken?.address,toTokenAddress:N.toToken?.address,toTokenAmount:N.toTokenAmount,toTokenDecimals:N.toToken?.decimals,sourceTokenAmount:N.sourceTokenAmount,sourceTokenDecimals:N.sourceToken?.decimals,invalidToToken:a,invalidSourceToken:n,invalidSourceTokenAmount:s,availableToSwap:t&&!a&&!n&&!s,isAuthConnector:i===v.b.CONNECTOR_ID.AUTH}},async setSourceToken(e){if(!e){N.sourceToken=e,N.sourceTokenAmount="",N.sourceTokenPriceInUSD=0;return}N.sourceToken=e,await B.setTokenPrice(e.address,"sourceToken")},setSourceTokenAmount(e){N.sourceTokenAmount=e},async setToToken(e){if(!e){N.toToken=e,N.toTokenAmount="",N.toTokenPriceInUSD=0;return}N.toToken=e,await B.setTokenPrice(e.address,"toToken")},setToTokenAmount(e){N.toTokenAmount=e?f.C.toFixed(e,6):""},async setTokenPrice(e,t){let o=N.tokensPriceMap[e]||0;o||(N.loadingPrices=!0,o=await B.getAddressPrice(e)),"sourceToken"===t?N.sourceTokenPriceInUSD=o:"toToken"===t&&(N.toTokenPriceInUSD=o),N.loadingPrices&&(N.loadingPrices=!1),B.getParams().availableToSwap&&!N.switchingTokens&&B.swapTokens()},async switchTokens(){if(!N.initializing&&N.initialized&&!N.switchingTokens){N.switchingTokens=!0;try{let e=N.toToken?{...N.toToken}:void 0,t=N.sourceToken?{...N.sourceToken}:void 0,o=e&&""===N.toTokenAmount?"1":N.toTokenAmount;B.setSourceTokenAmount(o),B.setToTokenAmount(""),await B.setSourceToken(e),await B.setToToken(t),N.switchingTokens=!1,B.swapTokens()}catch(e){throw N.switchingTokens=!1,e}}},resetState(){N.myTokensWithBalance=O.myTokensWithBalance,N.tokensPriceMap=O.tokensPriceMap,N.initialized=O.initialized,N.initializing=O.initializing,N.switchingTokens=O.switchingTokens,N.sourceToken=O.sourceToken,N.sourceTokenAmount=O.sourceTokenAmount,N.sourceTokenPriceInUSD=O.sourceTokenPriceInUSD,N.toToken=O.toToken,N.toTokenAmount=O.toTokenAmount,N.toTokenPriceInUSD=O.toTokenPriceInUSD,N.networkPrice=O.networkPrice,N.networkTokenSymbol=O.networkTokenSymbol,N.networkBalanceInUSD=O.networkBalanceInUSD,N.inputError=O.inputError},resetValues(){let{networkAddress:e}=B.getParams(),t=N.tokens?.find(t=>t.address===e);B.setSourceToken(t),B.setToToken(void 0)},getApprovalLoadingState:()=>N.loadingApprovalTransaction,clearError(){N.transactionError=void 0},async initializeState(){if(!N.initializing){if(N.initializing=!0,!N.initialized)try{await B.fetchTokens(),N.initialized=!0}catch(e){N.initialized=!1,g.SnackController.showError("Failed to initialize swap"),u.RouterController.goBack()}N.initializing=!1}},async fetchTokens(){let{networkAddress:e}=B.getParams();await B.getNetworkTokenPrice(),await B.getMyTokensWithBalance();let t=N.myTokensWithBalance?.find(t=>t.address===e);t&&(N.networkTokenSymbol=t.symbol,B.setSourceToken(t),B.setSourceTokenAmount("0"))},async getTokenList(){let e=l.R.state.activeCaipNetwork?.caipNetworkId;if(N.caipNetworkId!==e||!N.tokens)try{N.tokensLoading=!0;let t=await $.n.getTokenList(e);N.tokens=t,N.caipNetworkId=e,N.popularTokens=t.sort((e,t)=>e.symbol<t.symbol?-1:e.symbol>t.symbol?1:0);let o=(e&&T.bq.SUGGESTED_TOKENS_BY_CHAIN?.[e]||[]).map(e=>t.find(t=>t.symbol===e)).filter(e=>!!e),r=(T.bq.SWAP_SUGGESTED_TOKENS||[]).map(e=>t.find(t=>t.symbol===e)).filter(e=>!!e).filter(e=>!o.some(t=>t.address===e.address));N.suggestedTokens=[...o,...r]}catch(e){N.tokens=[],N.popularTokens=[],N.suggestedTokens=[]}finally{N.tokensLoading=!1}},async getAddressPrice(e){let t=N.tokensPriceMap[e];if(t)return t;let o=await I.L.fetchTokenPrice({addresses:[e]}),r=o?.fungibles||[],i=[...N.tokens||[],...N.myTokensWithBalance||[]],a=i?.find(t=>t.address===e)?.symbol,n=parseFloat((r.find(e=>e.symbol.toLowerCase()===a?.toLowerCase())?.price||0).toString());return N.tokensPriceMap[e]=n,n},async getNetworkTokenPrice(){let{networkAddress:e}=B.getParams(),t=await I.L.fetchTokenPrice({addresses:[e]}).catch(()=>(g.SnackController.showError("Failed to fetch network token price"),{fungibles:[]})),o=t.fungibles?.[0],r=o?.price.toString()||"0";N.tokensPriceMap[e]=parseFloat(r),N.networkTokenSymbol=o?.symbol||"",N.networkPrice=r},async getMyTokensWithBalance(e){let t=await C.Q.getMyTokensWithBalance(e),o=$.n.mapBalancesToSwapTokens(t);o&&(await B.getInitialGasPrice(),B.setBalances(o))},setBalances(e){let{networkAddress:t}=B.getParams(),o=l.R.state.activeCaipNetwork;if(!o)return;let r=e.find(e=>e.address===t);e.forEach(e=>{N.tokensPriceMap[e.address]=e.price||0}),N.myTokensWithBalance=e.filter(e=>e.address.startsWith(o.caipNetworkId)),N.networkBalanceInUSD=r?f.C.multiply(r.quantity.numeric,r.price).toString():"0"},async getInitialGasPrice(){let e=await $.n.fetchGasPrice();if(!e)return{gasPrice:null,gasPriceInUSD:null};switch(l.R.state?.activeCaipNetwork?.chainNamespace){case v.b.CHAIN.SOLANA:return N.gasFee=e.standard??"0",N.gasPriceInUSD=f.C.multiply(e.standard,N.networkPrice).div(1e9).toNumber(),{gasPrice:BigInt(N.gasFee),gasPriceInUSD:Number(N.gasPriceInUSD)};case v.b.CHAIN.EVM:default:let t=e.standard??"0",o=BigInt(t),r=BigInt(15e4),i=A.getGasPriceInUSD(N.networkPrice,r,o);return N.gasFee=t,N.gasPriceInUSD=i,{gasPrice:o,gasPriceInUSD:i}}},async swapTokens(){let e=l.R.getAccountData()?.address,t=N.sourceToken,o=N.toToken,r=f.C.bigNumber(N.sourceTokenAmount).gt(0);if(r||B.setToTokenAmount(""),!o||!t||N.loadingPrices||!r||!e)return;N.loadingQuote=!0;let i=f.C.bigNumber(N.sourceTokenAmount).times(10**t.decimals).round(0);try{let r=await I.L.fetchSwapQuote({userAddress:e,from:t.address,to:o.address,gasPrice:N.gasFee,amount:i.toString()});N.loadingQuote=!1;let a=r?.quotes?.[0]?.toAmount;if(!a){R.AlertController.open({displayMessage:"Incorrect amount",debugMessage:"Please enter a valid amount"},"error");return}let n=f.C.bigNumber(a).div(10**o.decimals).toString();B.setToTokenAmount(n),B.hasInsufficientToken(N.sourceTokenAmount,t.address)?N.inputError="Insufficient balance":(N.inputError=void 0,B.setTransactionDetails())}catch(t){let e=await $.n.handleSwapError(t);N.loadingQuote=!1,N.inputError=e||"Insufficient balance"}},async getTransaction(){let{fromCaipAddress:e,availableToSwap:t}=B.getParams(),o=N.sourceToken,r=N.toToken;if(e&&t&&o&&r&&!N.loadingQuote)try{let t;return N.loadingBuildTransaction=!0,t=await $.n.fetchSwapAllowance({userAddress:e,tokenAddress:o.address,sourceTokenAmount:N.sourceTokenAmount,sourceTokenDecimals:o.decimals})?await B.createSwapTransaction():await B.createAllowanceTransaction(),N.loadingBuildTransaction=!1,N.fetchError=!1,t}catch(e){u.RouterController.goBack(),g.SnackController.showError("Failed to check allowance"),N.loadingBuildTransaction=!1,N.approvalTransaction=void 0,N.swapTransaction=void 0,N.fetchError=!0;return}},async createAllowanceTransaction(){let{fromCaipAddress:e,sourceTokenAddress:t,toTokenAddress:o}=B.getParams();if(e&&o){if(!t)throw Error("createAllowanceTransaction - No source token address found.");try{let r=await I.L.generateApproveCalldata({from:t,to:o,userAddress:e}),i=S.j.getPlainAddress(r.tx.from);if(!i)throw Error("SwapController:createAllowanceTransaction - address is required");let a={data:r.tx.data,to:i,gasPrice:BigInt(r.tx.eip155.gasPrice),value:BigInt(r.tx.value),toAmount:N.toTokenAmount};return N.swapTransaction=void 0,N.approvalTransaction={data:a.data,to:a.to,gasPrice:a.gasPrice,value:a.value,toAmount:a.toAmount},{data:a.data,to:a.to,gasPrice:a.gasPrice,value:a.value,toAmount:a.toAmount}}catch(e){u.RouterController.goBack(),g.SnackController.showError("Failed to create approval transaction"),N.approvalTransaction=void 0,N.swapTransaction=void 0,N.fetchError=!0;return}}},async createSwapTransaction(){let{networkAddress:e,fromCaipAddress:t,sourceTokenAmount:o}=B.getParams(),r=N.sourceToken,i=N.toToken;if(!t||!o||!r||!i)return;let a=p.ConnectionController.parseUnits(o,r.decimals)?.toString();try{let o=await I.L.generateSwapCalldata({userAddress:t,from:r.address,to:i.address,amount:a,disableEstimate:!0}),n=r.address===e,s=BigInt(o.tx.eip155.gas),l=BigInt(o.tx.eip155.gasPrice),c=S.j.getPlainAddress(o.tx.to);if(!c)throw Error("SwapController:createSwapTransaction - address is required");let d={data:o.tx.data,to:c,gas:s,gasPrice:l,value:n?BigInt(a??"0"):BigInt("0"),toAmount:N.toTokenAmount};return N.gasPriceInUSD=A.getGasPriceInUSD(N.networkPrice,s,l),N.approvalTransaction=void 0,N.swapTransaction=d,d}catch(e){u.RouterController.goBack(),g.SnackController.showError("Failed to create transaction"),N.approvalTransaction=void 0,N.swapTransaction=void 0,N.fetchError=!0;return}},onEmbeddedWalletApprovalSuccess(){g.SnackController.showLoading("Approve limit increase in your wallet"),u.RouterController.replace("SwapPreview")},async sendTransactionForApproval(e){let{fromAddress:t,isAuthConnector:o}=B.getParams();N.loadingApprovalTransaction=!0,o?u.RouterController.pushTransactionStack({onSuccess:B.onEmbeddedWalletApprovalSuccess}):g.SnackController.showLoading("Approve limit increase in your wallet");try{await p.ConnectionController.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:v.b.CHAIN.EVM}),await B.swapTokens(),await B.getTransaction(),N.approvalTransaction=void 0,N.loadingApprovalTransaction=!1}catch(e){N.transactionError=e?.displayMessage,N.loadingApprovalTransaction=!1,g.SnackController.showError(e?.displayMessage||"Transaction error"),E.X.sendEvent({type:"track",event:"SWAP_APPROVAL_ERROR",properties:{message:e?.displayMessage||e?.message||"Unknown",network:l.R.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:B.state.sourceToken?.symbol||"",swapToToken:B.state.toToken?.symbol||"",swapFromAmount:B.state.sourceTokenAmount||"",swapToAmount:B.state.toTokenAmount||"",isSmartAccount:(0,x.r9)(v.b.CHAIN.EVM)===k.y_.ACCOUNT_TYPES.SMART_ACCOUNT}})}},async sendTransactionForSwap(e){if(!e)return;let{fromAddress:t,toTokenAmount:o,isAuthConnector:r}=B.getParams();N.loadingTransaction=!0;let i=`Swapping ${N.sourceToken?.symbol} to ${f.C.formatNumberToLocalString(o,3)} ${N.toToken?.symbol}`,a=`Swapped ${N.sourceToken?.symbol} to ${f.C.formatNumberToLocalString(o,3)} ${N.toToken?.symbol}`;r?u.RouterController.pushTransactionStack({onSuccess(){u.RouterController.replace("Account"),g.SnackController.showLoading(i),W.resetState()}}):g.SnackController.showLoading("Confirm transaction in your wallet");try{let o=[N.sourceToken?.address,N.toToken?.address].join(","),i=await p.ConnectionController.sendTransaction({address:t,to:e.to,data:e.data,value:e.value,chainNamespace:v.b.CHAIN.EVM});return N.loadingTransaction=!1,g.SnackController.showSuccess(a),E.X.sendEvent({type:"track",event:"SWAP_SUCCESS",properties:{network:l.R.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:B.state.sourceToken?.symbol||"",swapToToken:B.state.toToken?.symbol||"",swapFromAmount:B.state.sourceTokenAmount||"",swapToAmount:B.state.toTokenAmount||"",isSmartAccount:(0,x.r9)(v.b.CHAIN.EVM)===k.y_.ACCOUNT_TYPES.SMART_ACCOUNT}}),W.resetState(),r||u.RouterController.replace("Account"),W.getMyTokensWithBalance(o),i}catch(e){N.transactionError=e?.displayMessage,N.loadingTransaction=!1,g.SnackController.showError(e?.displayMessage||"Transaction error"),E.X.sendEvent({type:"track",event:"SWAP_ERROR",properties:{message:e?.displayMessage||e?.message||"Unknown",network:l.R.state.activeCaipNetwork?.caipNetworkId||"",swapFromToken:B.state.sourceToken?.symbol||"",swapToToken:B.state.toToken?.symbol||"",swapFromAmount:B.state.sourceTokenAmount||"",swapToAmount:B.state.toTokenAmount||"",isSmartAccount:(0,x.r9)(v.b.CHAIN.EVM)===k.y_.ACCOUNT_TYPES.SMART_ACCOUNT}});return}},hasInsufficientToken:(e,t)=>A.isInsufficientSourceTokenForSwap(e,t,N.myTokensWithBalance),setTransactionDetails(){let{toTokenAddress:e,toTokenDecimals:t}=B.getParams();e&&t&&(N.gasPriceInUSD=A.getGasPriceInUSD(N.networkPrice,BigInt(N.gasFee),BigInt(15e4)),N.priceImpact=A.getPriceImpact({sourceTokenAmount:N.sourceTokenAmount,sourceTokenPriceInUSD:N.sourceTokenPriceInUSD,toTokenPriceInUSD:N.toTokenPriceInUSD,toTokenAmount:N.toTokenAmount}),N.maxSlippage=A.getMaxSlippage(N.slippage,N.toTokenAmount),N.providerFee=A.getProviderFee(N.sourceTokenAmount))}},B=(0,P.P)(W);var D=o(84194),z=o(3954),F=o(29669),U=o(88497);let L=(0,U.iv)`
  :host {
    display: block;
    border-radius: clamp(0px, ${({borderRadius:e})=>e["8"]}, 44px);
    box-shadow: 0 0 0 1px ${({tokens:e})=>e.theme.foregroundPrimary};
    overflow: hidden;
  }
`,j=class extends r.oi{render(){return(0,r.dy)`<slot></slot>`}};j.styles=[z.ET,L],j=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n}([(0,F.M)("wui-card")],j),o(69418),o(38790),o(18476),o(31243);let M=(0,U.iv)`
  :host {
    width: 100%;
  }

  :host > wui-flex {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: ${({spacing:e})=>e[2]};
    padding: ${({spacing:e})=>e[3]};
    border-radius: ${({borderRadius:e})=>e[6]};
    border: 1px solid ${({tokens:e})=>e.theme.borderPrimary};
    box-sizing: border-box;
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.25);
    color: ${({tokens:e})=>e.theme.textPrimary};
  }

  :host > wui-flex[data-type='info'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};

      wui-icon {
        color: ${({tokens:e})=>e.theme.iconDefault};
      }
    }
  }
  :host > wui-flex[data-type='success'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderSuccess};
      }
    }
  }
  :host > wui-flex[data-type='warning'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundWarning};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderWarning};
      }
    }
  }
  :host > wui-flex[data-type='error'] {
    .icon-box {
      background-color: ${({tokens:e})=>e.core.backgroundError};

      wui-icon {
        color: ${({tokens:e})=>e.core.borderError};
      }
    }
  }

  wui-flex {
    width: 100%;
  }

  wui-text {
    word-break: break-word;
    flex: 1;
  }

  .close {
    cursor: pointer;
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  .icon-box {
    height: 40px;
    width: 40px;
    border-radius: ${({borderRadius:e})=>e["2"]};
    background-color: var(--local-icon-bg-value);
  }
`;var H=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let V={info:"info",success:"checkmark",warning:"warningCircle",error:"warning"},_=class extends r.oi{constructor(){super(...arguments),this.message="",this.type="info"}render(){return(0,r.dy)`
      <wui-flex
        data-type=${(0,a.o)(this.type)}
        flexDirection="row"
        justifyContent="space-between"
        alignItems="center"
        gap="2"
      >
        <wui-flex columnGap="2" flexDirection="row" alignItems="center">
          <wui-flex
            flexDirection="row"
            alignItems="center"
            justifyContent="center"
            class="icon-box"
          >
            <wui-icon color="inherit" size="md" name=${V[this.type]}></wui-icon>
          </wui-flex>
          <wui-text variant="md-medium" color="inherit" data-testid="wui-alertbar-text"
            >${this.message}</wui-text
          >
        </wui-flex>
        <wui-icon
          class="close"
          color="inherit"
          size="sm"
          name="close"
          @click=${this.onClose}
        ></wui-icon>
      </wui-flex>
    `}onClose(){R.AlertController.close()}};_.styles=[z.ET,M],H([(0,i.Cb)()],_.prototype,"message",void 0),H([(0,i.Cb)()],_.prototype,"type",void 0),_=H([(0,F.M)("wui-alertbar")],_);let K=(0,D.iv)`
  :host {
    display: block;
    position: absolute;
    top: ${({spacing:e})=>e["3"]};
    left: ${({spacing:e})=>e["4"]};
    right: ${({spacing:e})=>e["4"]};
    opacity: 0;
    pointer-events: none;
  }
`;var G=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let X={info:{backgroundColor:"fg-350",iconColor:"fg-325",icon:"info"},success:{backgroundColor:"success-glass-reown-020",iconColor:"success-125",icon:"checkmark"},warning:{backgroundColor:"warning-glass-reown-020",iconColor:"warning-100",icon:"warningCircle"},error:{backgroundColor:"error-glass-reown-020",iconColor:"error-125",icon:"warning"}},Y=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.open=R.AlertController.state.open,this.onOpen(!0),this.unsubscribe.push(R.AlertController.subscribeKey("open",e=>{this.open=e,this.onOpen(!1)}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=R.AlertController.state,o=X[t];return(0,r.dy)`
      <wui-alertbar
        message=${e}
        backgroundColor=${o?.backgroundColor}
        iconColor=${o?.iconColor}
        icon=${o?.icon}
        type=${t}
      ></wui-alertbar>
    `}onOpen(e){this.open?(this.animate([{opacity:0,transform:"scale(0.85)"},{opacity:1,transform:"scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: auto"):e||(this.animate([{opacity:1,transform:"scale(1)"},{opacity:0,transform:"scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"}),this.style.cssText="pointer-events: none")}};Y.styles=K,G([(0,i.SB)()],Y.prototype,"open",void 0),Y=G([(0,D.Mo)("w3m-alertbar")],Y);var q=o(98673),Q=o(58488);let Z=(0,U.iv)`
  :host {
    position: relative;
  }

  button {
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: transparent;
    padding: ${({spacing:e})=>e[1]};
  }

  /* -- Colors --------------------------------------------------- */
  button[data-type='accent'] wui-icon {
    color: ${({tokens:e})=>e.core.iconAccentPrimary};
  }

  button[data-type='neutral'][data-variant='primary'] wui-icon {
    color: ${({tokens:e})=>e.theme.iconInverse};
  }

  button[data-type='neutral'][data-variant='secondary'] wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  button[data-type='success'] wui-icon {
    color: ${({tokens:e})=>e.core.iconSuccess};
  }

  button[data-type='error'] wui-icon {
    color: ${({tokens:e})=>e.core.iconError};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='xs'] {
    width: 16px;
    height: 16px;

    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='sm'] {
    width: 20px;
    height: 20px;
    border-radius: ${({borderRadius:e})=>e[1]};
  }

  button[data-size='md'] {
    width: 24px;
    height: 24px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='lg'] {
    width: 28px;
    height: 28px;
    border-radius: ${({borderRadius:e})=>e[2]};
  }

  button[data-size='xs'] wui-icon {
    width: 8px;
    height: 8px;
  }

  button[data-size='sm'] wui-icon {
    width: 12px;
    height: 12px;
  }

  button[data-size='md'] wui-icon {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] wui-icon {
    width: 20px;
    height: 20px;
  }

  /* -- Hover --------------------------------------------------- */
  @media (hover: hover) {
    button[data-type='accent']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    }

    button[data-variant='primary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }

    button[data-variant='secondary'][data-type='neutral']:hover:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }

    button[data-type='success']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.backgroundSuccess};
    }

    button[data-type='error']:hover:enabled {
      background-color: ${({tokens:e})=>e.core.backgroundError};
    }
  }

  /* -- Focus --------------------------------------------------- */
  button:focus-visible {
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent020};
  }

  /* -- Properties --------------------------------------------------- */
  button[data-full-width='true'] {
    width: 100%;
  }

  :host([fullWidth]) {
    width: 100%;
  }

  button[disabled] {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;var J=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let ee=class extends r.oi{constructor(){super(...arguments),this.icon="card",this.variant="primary",this.type="accent",this.size="md",this.iconSize=void 0,this.fullWidth=!1,this.disabled=!1}render(){return(0,r.dy)`<button
      data-variant=${this.variant}
      data-type=${this.type}
      data-size=${this.size}
      data-full-width=${this.fullWidth}
      ?disabled=${this.disabled}
    >
      <wui-icon color="inherit" name=${this.icon} size=${(0,a.o)(this.iconSize)}></wui-icon>
    </button>`}};ee.styles=[z.ET,z.ZM,Z],J([(0,i.Cb)()],ee.prototype,"icon",void 0),J([(0,i.Cb)()],ee.prototype,"variant",void 0),J([(0,i.Cb)()],ee.prototype,"type",void 0),J([(0,i.Cb)()],ee.prototype,"size",void 0),J([(0,i.Cb)()],ee.prototype,"iconSize",void 0),J([(0,i.Cb)({type:Boolean})],ee.prototype,"fullWidth",void 0),J([(0,i.Cb)({type:Boolean})],ee.prototype,"disabled",void 0),ee=J([(0,F.M)("wui-icon-button")],ee),o(49342);let et=(0,U.iv)`
  button {
    display: block;
    display: flex;
    align-items: center;
    padding: ${({spacing:e})=>e[1]};
    transition: background-color ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: background-color;
    border-radius: ${({borderRadius:e})=>e[32]};
  }

  wui-image {
    border-radius: 100%;
  }

  wui-text {
    padding-left: ${({spacing:e})=>e[1]};
  }

  .left-icon-container,
  .right-icon-container {
    width: 24px;
    height: 24px;
    justify-content: center;
    align-items: center;
  }

  wui-icon {
    color: ${({tokens:e})=>e.theme.iconDefault};
  }

  /* -- Sizes --------------------------------------------------- */
  button[data-size='lg'] {
    height: 32px;
  }

  button[data-size='md'] {
    height: 28px;
  }

  button[data-size='sm'] {
    height: 24px;
  }

  button[data-size='lg'] wui-image {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] wui-image {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] wui-image {
    width: 16px;
    height: 16px;
  }

  button[data-size='lg'] .left-icon-container {
    width: 24px;
    height: 24px;
  }

  button[data-size='md'] .left-icon-container {
    width: 20px;
    height: 20px;
  }

  button[data-size='sm'] .left-icon-container {
    width: 16px;
    height: 16px;
  }

  /* -- Variants --------------------------------------------------------- */
  button[data-type='filled-dropdown'] {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  button[data-type='text-dropdown'] {
    background-color: transparent;
  }

  /* -- Focus states --------------------------------------------------- */
  button:focus-visible:enabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    box-shadow: 0 0 0 4px ${({tokens:e})=>e.core.foregroundAccent040};
  }

  /* -- Hover & Active states ----------------------------------------------------------- */
  @media (hover: hover) and (pointer: fine) {
    button:hover:enabled,
    button:active:enabled {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  /* -- Disabled states --------------------------------------------------- */
  button:disabled {
    background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    opacity: 0.5;
  }
`;var eo=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let er={lg:"lg-regular",md:"md-regular",sm:"sm-regular"},ei={lg:"lg",md:"md",sm:"sm"},ea=class extends r.oi{constructor(){super(...arguments),this.imageSrc="",this.text="",this.size="lg",this.type="text-dropdown",this.disabled=!1}render(){return(0,r.dy)`<button ?disabled=${this.disabled} data-size=${this.size} data-type=${this.type}>
      ${this.imageTemplate()} ${this.textTemplate()}
      <wui-flex class="right-icon-container">
        <wui-icon name="chevronBottom"></wui-icon>
      </wui-flex>
    </button>`}textTemplate(){let e=er[this.size];return this.text?(0,r.dy)`<wui-text color="primary" variant=${e}>${this.text}</wui-text>`:null}imageTemplate(){if(this.imageSrc)return(0,r.dy)`<wui-image src=${this.imageSrc} alt="select visual"></wui-image>`;let e=ei[this.size];return(0,r.dy)` <wui-flex class="left-icon-container">
      <wui-icon size=${e} name="networkPlaceholder"></wui-icon>
    </wui-flex>`}};ea.styles=[z.ET,z.ZM,et],eo([(0,i.Cb)()],ea.prototype,"imageSrc",void 0),eo([(0,i.Cb)()],ea.prototype,"text",void 0),eo([(0,i.Cb)()],ea.prototype,"size",void 0),eo([(0,i.Cb)()],ea.prototype,"type",void 0),eo([(0,i.Cb)({type:Boolean})],ea.prototype,"disabled",void 0),ea=eo([(0,F.M)("wui-select")],ea),o(67387),o(8743);var en=o(18852);let es=(0,D.iv)`
  :host {
    height: 60px;
  }

  :host > wui-flex {
    box-sizing: border-box;
    background-color: var(--local-header-background-color);
  }

  wui-text {
    background-color: var(--local-header-background-color);
  }

  wui-flex.w3m-header-title {
    transform: translateY(0);
    opacity: 1;
  }

  wui-flex.w3m-header-title[view-direction='prev'] {
    animation:
      slide-down-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-down-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-flex.w3m-header-title[view-direction='next'] {
    animation:
      slide-up-out 120ms forwards ${({easings:e})=>e["ease-out-power-2"]},
      slide-up-in 120ms forwards ${({easings:e})=>e["ease-out-power-2"]};
    animation-delay: 0ms, 200ms;
  }

  wui-icon-button[data-hidden='true'] {
    opacity: 0 !important;
    pointer-events: none;
  }

  @keyframes slide-up-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(3px);
      opacity: 0;
    }
  }

  @keyframes slide-up-in {
    from {
      transform: translateY(-3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  @keyframes slide-down-out {
    from {
      transform: translateY(0px);
      opacity: 1;
    }
    to {
      transform: translateY(-3px);
      opacity: 0;
    }
  }

  @keyframes slide-down-in {
    from {
      transform: translateY(3px);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }
`;var el=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let ec=["SmartSessionList"],ed={PayWithExchange:D.gR.tokens.theme.foregroundPrimary};function eu(){let e=u.RouterController.state.data?.connector?.name,t=u.RouterController.state.data?.wallet?.name,o=u.RouterController.state.data?.network?.name,r=t??e,i=c.ConnectorController.getConnectors(),a=1===i.length&&i[0]?.id==="w3m-email",n=l.R.getAccountData()?.socialProvider;return{Connect:`Connect ${a?"Email":""} Wallet`,Create:"Create Wallet",ChooseAccountName:void 0,Account:void 0,AccountSettings:void 0,AllWallets:"All Wallets",ApproveTransaction:"Approve Transaction",BuyInProgress:"Buy",UsageExceeded:"Usage Exceeded",ConnectingExternal:r??"Connect Wallet",ConnectingWalletConnect:r??"WalletConnect",ConnectingWalletConnectBasic:"WalletConnect",ConnectingSiwe:"Sign In",Convert:"Convert",ConvertSelectToken:"Select token",ConvertPreview:"Preview Convert",Downloads:r?`Get ${r}`:"Downloads",EmailLogin:"Email Login",EmailVerifyOtp:"Confirm Email",EmailVerifyDevice:"Register Device",GetWallet:"Get a Wallet",Networks:"Choose Network",OnRampProviders:"Choose Provider",OnRampActivity:"Activity",OnRampTokenSelect:"Select Token",OnRampFiatSelect:"Select Currency",Pay:"How you pay",ProfileWallets:"Wallets",SwitchNetwork:o??"Switch Network",Transactions:"Activity",UnsupportedChain:"Switch Network",UpgradeEmailWallet:"Upgrade Your Wallet",UpdateEmailWallet:"Edit Email",UpdateEmailPrimaryOtp:"Confirm Current Email",UpdateEmailSecondaryOtp:"Confirm New Email",WhatIsABuy:"What is Buy?",RegisterAccountName:"Choose Name",RegisterAccountNameSuccess:"",WalletReceive:"Receive",WalletCompatibleNetworks:"Compatible Networks",Swap:"Swap",SwapSelectToken:"Select Token",SwapPreview:"Preview Swap",WalletSend:"Send",WalletSendPreview:"Review Send",WalletSendSelectToken:"Select Token",WalletSendConfirmed:"Confirmed",WhatIsANetwork:"What is a network?",WhatIsAWallet:"What is a Wallet?",ConnectWallets:"Connect Wallet",ConnectSocials:"All Socials",ConnectingSocial:n?n.charAt(0).toUpperCase()+n.slice(1):"Connect Social",ConnectingMultiChain:"Select Chain",ConnectingFarcaster:"Farcaster",SwitchActiveChain:"Switch Chain",SmartSessionCreated:void 0,SmartSessionList:"Smart Sessions",SIWXSignMessage:"Sign In",PayLoading:"Payment in Progress",DataCapture:"Profile",DataCaptureOtpConfirm:"Confirm Email",FundWallet:"Fund Wallet",PayWithExchange:"Deposit from Exchange",PayWithExchangeSelectAsset:"Select Asset"}}let ep=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.heading=eu()[u.RouterController.state.view],this.network=l.R.state.activeCaipNetwork,this.networkImage=q.f.getNetworkImage(this.network),this.showBack=!1,this.prevHistoryLength=1,this.view=u.RouterController.state.view,this.viewDirection="",this.unsubscribe.push(Q.W.subscribeNetworkImages(()=>{this.networkImage=q.f.getNetworkImage(this.network)}),u.RouterController.subscribeKey("view",e=>{setTimeout(()=>{this.view=e,this.heading=eu()[e]},en.b.ANIMATION_DURATIONS.HeaderText),this.onViewChange(),this.onHistoryChange()}),l.R.subscribeKey("activeCaipNetwork",e=>{this.network=e,this.networkImage=q.f.getNetworkImage(this.network)}))}disconnectCallback(){this.unsubscribe.forEach(e=>e())}render(){let e=ed[u.RouterController.state.view]??D.gR.tokens.theme.backgroundPrimary;return this.style.setProperty("--local-header-background-color",e),(0,r.dy)`
      <wui-flex
        .padding=${["0","4","0","4"]}
        justifyContent="space-between"
        alignItems="center"
      >
        ${this.leftHeaderTemplate()} ${this.titleTemplate()} ${this.rightHeaderTemplate()}
      </wui-flex>
    `}onWalletHelp(){E.X.sendEvent({type:"track",event:"CLICK_WALLET_HELP"}),u.RouterController.push("WhatIsAWallet")}async onClose(){await h.safeClose()}rightHeaderTemplate(){let e=n.OptionsController?.state?.features?.smartSessions;return"Account"===u.RouterController.state.view&&e?(0,r.dy)`<wui-flex>
      <wui-icon-button
        icon="clock"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${()=>u.RouterController.push("SmartSessionList")}
        data-testid="w3m-header-smart-sessions"
      ></wui-icon-button>
      ${this.closeButtonTemplate()}
    </wui-flex> `:this.closeButtonTemplate()}closeButtonTemplate(){return(0,r.dy)`
      <wui-icon-button
        icon="close"
        size="lg"
        type="neutral"
        variant="primary"
        iconSize="lg"
        @click=${this.onClose.bind(this)}
        data-testid="w3m-header-close"
      ></wui-icon-button>
    `}titleTemplate(){let e=ec.includes(this.view);return(0,r.dy)`
      <wui-flex
        view-direction="${this.viewDirection}"
        class="w3m-header-title"
        alignItems="center"
        gap="2"
      >
        <wui-text
          display="inline"
          variant="lg-regular"
          color="primary"
          data-testid="w3m-header-text"
        >
          ${this.heading}
        </wui-text>
        ${e?(0,r.dy)`<wui-tag variant="accent" size="md">Beta</wui-tag>`:null}
      </wui-flex>
    `}leftHeaderTemplate(){let{view:e}=u.RouterController.state,t="Connect"===e,o=n.OptionsController.state.enableEmbedded,i=n.OptionsController.state.enableNetworkSwitch;return"Account"===e&&i?(0,r.dy)`<wui-select
        id="dynamic"
        data-testid="w3m-account-select-network"
        active-network=${(0,a.o)(this.network?.name)}
        @click=${this.onNetworks.bind(this)}
        imageSrc=${(0,a.o)(this.networkImage)}
      ></wui-select>`:this.showBack&&!("ApproveTransaction"===e||"ConnectingSiwe"===e||t&&o)?(0,r.dy)`<wui-icon-button
        data-testid="header-back"
        id="dynamic"
        icon="chevronLeft"
        size="lg"
        iconSize="lg"
        type="neutral"
        variant="primary"
        @click=${this.onGoBack.bind(this)}
      ></wui-icon-button>`:(0,r.dy)`<wui-icon-button
      data-hidden=${!t}
      id="dynamic"
      icon="helpCircle"
      size="lg"
      iconSize="lg"
      type="neutral"
      variant="primary"
      @click=${this.onWalletHelp.bind(this)}
    ></wui-icon-button>`}onNetworks(){this.isAllowedNetworkSwitch()&&(E.X.sendEvent({type:"track",event:"CLICK_NETWORKS"}),u.RouterController.push("Networks"))}isAllowedNetworkSwitch(){let e=l.R.getAllRequestedCaipNetworks(),t=!!e&&e.length>1,o=e?.find(({id:e})=>e===this.network?.id);return t||!o}onViewChange(){let{history:e}=u.RouterController.state,t=en.b.VIEW_DIRECTION.Next;e.length<this.prevHistoryLength&&(t=en.b.VIEW_DIRECTION.Prev),this.prevHistoryLength=e.length,this.viewDirection=t}async onHistoryChange(){let{history:e}=u.RouterController.state,t=this.shadowRoot?.querySelector("#dynamic");e.length>1&&!this.showBack&&t?(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!0,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"})):e.length<=1&&this.showBack&&t&&(await t.animate([{opacity:1},{opacity:0}],{duration:200,fill:"forwards",easing:"ease"}).finished,this.showBack=!1,t.animate([{opacity:0},{opacity:1}],{duration:200,fill:"forwards",easing:"ease"}))}onGoBack(){u.RouterController.goBack()}};ep.styles=es,el([(0,i.SB)()],ep.prototype,"heading",void 0),el([(0,i.SB)()],ep.prototype,"network",void 0),el([(0,i.SB)()],ep.prototype,"networkImage",void 0),el([(0,i.SB)()],ep.prototype,"showBack",void 0),el([(0,i.SB)()],ep.prototype,"prevHistoryLength",void 0),el([(0,i.SB)()],ep.prototype,"view",void 0),el([(0,i.SB)()],ep.prototype,"viewDirection",void 0),ep=el([(0,D.Mo)("w3m-header")],ep),o(31617),o(22387);let ew=(0,U.iv)`
  :host {
    display: flex;
    align-items: center;
    gap: ${({spacing:e})=>e[1]};
    padding: ${({spacing:e})=>e[2]} ${({spacing:e})=>e[3]}
      ${({spacing:e})=>e[2]} ${({spacing:e})=>e[2]};
    border-radius: ${({borderRadius:e})=>e[20]};
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
    box-shadow:
      0px 0px 8px 0px rgba(0, 0, 0, 0.1),
      inset 0 0 0 1px ${({tokens:e})=>e.theme.borderPrimary};
    max-width: 320px;
  }

  wui-icon-box {
    border-radius: ${({borderRadius:e})=>e.round} !important;
    overflow: hidden;
  }

  wui-loading-spinner {
    padding: ${({spacing:e})=>e[1]};
    background-color: ${({tokens:e})=>e.core.foregroundAccent010};
    border-radius: ${({borderRadius:e})=>e.round} !important;
  }
`;var eh=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let em=class extends r.oi{constructor(){super(...arguments),this.message="",this.variant="success"}render(){return(0,r.dy)`
      ${this.templateIcon()}
      <wui-text variant="lg-regular" color="primary" data-testid="wui-snackbar-message"
        >${this.message}</wui-text
      >
    `}templateIcon(){return"loading"===this.variant?(0,r.dy)`<wui-loading-spinner size="md" color="accent-primary"></wui-loading-spinner>`:(0,r.dy)`<wui-icon-box
      size="md"
      color=${({success:"success",error:"error",warning:"warning",info:"default"})[this.variant]}
      icon=${({success:"checkmark",error:"warning",warning:"warningCircle",info:"info"})[this.variant]}
    ></wui-icon-box>`}};em.styles=[z.ET,ew],eh([(0,i.Cb)()],em.prototype,"message",void 0),eh([(0,i.Cb)()],em.prototype,"variant",void 0),em=eh([(0,F.M)("wui-snackbar")],em);let eg=(0,r.iv)`
  :host {
    display: block;
    position: absolute;
    opacity: 0;
    pointer-events: none;
    top: 11px;
    left: 50%;
    width: max-content;
  }
`;var ey=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eb=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.timeout=void 0,this.open=g.SnackController.state.open,this.unsubscribe.push(g.SnackController.subscribeKey("open",e=>{this.open=e,this.onOpen()}))}disconnectedCallback(){clearTimeout(this.timeout),this.unsubscribe.forEach(e=>e())}render(){let{message:e,variant:t}=g.SnackController.state;return(0,r.dy)` <wui-snackbar message=${e} variant=${t}></wui-snackbar> `}onOpen(){clearTimeout(this.timeout),this.open?(this.animate([{opacity:0,transform:"translateX(-50%) scale(0.85)"},{opacity:1,transform:"translateX(-50%) scale(1)"}],{duration:150,fill:"forwards",easing:"ease"}),this.timeout&&clearTimeout(this.timeout),g.SnackController.state.autoClose&&(this.timeout=setTimeout(()=>g.SnackController.hide(),2500))):this.animate([{opacity:1,transform:"translateX(-50%) scale(1)"},{opacity:0,transform:"translateX(-50%) scale(0.85)"}],{duration:150,fill:"forwards",easing:"ease"})}};eb.styles=eg,ey([(0,i.SB)()],eb.prototype,"open",void 0),eb=ey([(0,D.Mo)("w3m-snackbar")],eb);let ef=(0,y.sj)({message:"",open:!1,triggerRect:{width:0,height:0,top:0,left:0},variant:"shade"}),ev=(0,P.P)({state:ef,subscribe:e=>(0,y.Ld)(ef,()=>e(ef)),subscribeKey:(e,t)=>(0,b.VW)(ef,e,t),showTooltip({message:e,triggerRect:t,variant:o}){ef.open=!0,ef.message=e,ef.triggerRect=t,ef.variant=o},hide(){ef.open=!1,ef.message="",ef.triggerRect={width:0,height:0,top:0,left:0}}});o(49580);let ek=(0,D.iv)`
  :host {
    pointer-events: none;
  }

  :host > wui-flex {
    display: var(--w3m-tooltip-display);
    opacity: var(--w3m-tooltip-opacity);
    padding: 9px ${({spacing:e})=>e["3"]} 10px ${({spacing:e})=>e["3"]};
    border-radius: ${({borderRadius:e})=>e["3"]};
    color: ${({tokens:e})=>e.theme.backgroundPrimary};
    position: absolute;
    top: var(--w3m-tooltip-top);
    left: var(--w3m-tooltip-left);
    transform: translate(calc(-50% + var(--w3m-tooltip-parent-width)), calc(-100% - 8px));
    max-width: calc(var(--apkt-modal-width) - ${({spacing:e})=>e["5"]});
    transition: opacity ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
    opacity: 0;
    animation-duration: ${({durations:e})=>e.xl};
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-name: fade-in;
    animation-fill-mode: forwards;
  }

  :host([data-variant='shade']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  :host([data-variant='shade']) > wui-flex > wui-text {
    color: ${({tokens:e})=>e.theme.textSecondary};
  }

  :host([data-variant='fill']) > wui-flex {
    background-color: ${({tokens:e})=>e.theme.textPrimary};
    border: none;
  }

  wui-icon {
    position: absolute;
    width: 12px !important;
    height: 4px !important;
    color: ${({tokens:e})=>e.theme.foregroundPrimary};
  }

  wui-icon[data-placement='top'] {
    bottom: 0px;
    left: 50%;
    transform: translate(-50%, 95%);
  }

  wui-icon[data-placement='bottom'] {
    top: 0;
    left: 50%;
    transform: translate(-50%, -95%) rotate(180deg);
  }

  wui-icon[data-placement='right'] {
    top: 50%;
    left: 0;
    transform: translate(-65%, -50%) rotate(90deg);
  }

  wui-icon[data-placement='left'] {
    top: 50%;
    right: 0%;
    transform: translate(65%, -50%) rotate(270deg);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
`;var eC=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let ex=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.open=ev.state.open,this.message=ev.state.message,this.triggerRect=ev.state.triggerRect,this.variant=ev.state.variant,this.unsubscribe.push(ev.subscribe(e=>{this.open=e.open,this.message=e.message,this.triggerRect=e.triggerRect,this.variant=e.variant}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){this.dataset.variant=this.variant;let e=this.triggerRect.top,t=this.triggerRect.left;return this.style.cssText=`
    --w3m-tooltip-top: ${e}px;
    --w3m-tooltip-left: ${t}px;
    --w3m-tooltip-parent-width: ${this.triggerRect.width/2}px;
    --w3m-tooltip-display: ${this.open?"flex":"none"};
    --w3m-tooltip-opacity: ${this.open?1:0};
    `,(0,r.dy)`<wui-flex>
      <wui-icon data-placement="top" size="inherit" name="cursor"></wui-icon>
      <wui-text color="primary" variant="sm-regular">${this.message}</wui-text>
    </wui-flex>`}};ex.styles=[ek],eC([(0,i.SB)()],ex.prototype,"open",void 0),eC([(0,i.SB)()],ex.prototype,"message",void 0),eC([(0,i.SB)()],ex.prototype,"triggerRect",void 0),eC([(0,i.SB)()],ex.prototype,"variant",void 0),ex=eC([(0,D.Mo)("w3m-tooltip")],ex);let eT={getTabsByNamespace:e=>e&&e===v.b.CHAIN.EVM?n.OptionsController.state.remoteFeatures?.activity===!1?en.b.ACCOUNT_TABS.filter(e=>"Activity"!==e.label):en.b.ACCOUNT_TABS:[],isValidReownName:e=>/^[a-zA-Z0-9]+$/gu.test(e),isValidEmail:e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/gu.test(e),validateReownName:e=>e.replace(/\^/gu,"").toLowerCase().replace(/[^a-zA-Z0-9]/gu,""),hasFooter(){let e=u.RouterController.state.view;if(en.b.VIEWS_WITH_LEGAL_FOOTER.includes(e)){let{termsConditionsUrl:e,privacyPolicyUrl:t}=n.OptionsController.state,o=n.OptionsController.state.features?.legalCheckbox;return(!!e||!!t)&&!o}return en.b.VIEWS_WITH_DEFAULT_FOOTER.includes(e)}};o(99226);let eS=(0,D.iv)`
  :host wui-ux-by-reown {
    padding-top: 0;
  }

  :host wui-ux-by-reown.branding-only {
    padding-top: ${({spacing:e})=>e["3"]};
  }

  a {
    text-decoration: none;
    color: ${({tokens:e})=>e.core.textAccentPrimary};
    font-weight: 500;
  }
`;var e$=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eA=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.remoteFeatures=n.OptionsController.state.remoteFeatures,this.unsubscribe.push(n.OptionsController.subscribeKey("remoteFeatures",e=>this.remoteFeatures=e))}disconnectedCallback(){this.unsubscribe.forEach(e=>e())}render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=n.OptionsController.state,o=n.OptionsController.state.features?.legalCheckbox;return(e||t)&&!o?(0,r.dy)`
      <wui-flex flexDirection="column">
        <wui-flex .padding=${["4","3","3","3"]} justifyContent="center">
          <wui-text color="secondary" variant="md-regular" align="center">
            By connecting your wallet, you agree to our <br />
            ${this.termsTemplate()} ${this.andTemplate()} ${this.privacyTemplate()}
          </wui-text>
        </wui-flex>
        ${this.reownBrandingTemplate()}
      </wui-flex>
    `:(0,r.dy)`
        <wui-flex flexDirection="column"> ${this.reownBrandingTemplate(!0)} </wui-flex>
      `}andTemplate(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=n.OptionsController.state;return e&&t?"and":""}termsTemplate(){let{termsConditionsUrl:e}=n.OptionsController.state;return e?(0,r.dy)`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Terms of Service</a
    >`:null}privacyTemplate(){let{privacyPolicyUrl:e}=n.OptionsController.state;return e?(0,r.dy)`<a href=${e} target="_blank" rel="noopener noreferrer"
      >Privacy Policy</a
    >`:null}reownBrandingTemplate(e=!1){return this.remoteFeatures?.reownBranding?e?(0,r.dy)`<wui-ux-by-reown class="branding-only"></wui-ux-by-reown>`:(0,r.dy)`<wui-ux-by-reown></wui-ux-by-reown>`:null}};eA.styles=[eS],e$([(0,i.SB)()],eA.prototype,"remoteFeatures",void 0),eA=e$([(0,D.Mo)("w3m-legal-footer")],eA),o(89380);let eP=(0,r.iv)``,eR=class extends r.oi{render(){let{termsConditionsUrl:e,privacyPolicyUrl:t}=n.OptionsController.state;return e||t?(0,r.dy)`
      <wui-flex
        .padding=${["4","3","3","3"]}
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        gap="3"
      >
        <wui-text color="secondary" variant="md-regular" align="center">
          We work with the best providers to give you the lowest fees and best support. More options
          coming soon!
        </wui-text>

        ${this.howDoesItWorkTemplate()}
      </wui-flex>
    `:null}howDoesItWorkTemplate(){return(0,r.dy)` <wui-link @click=${this.onWhatIsBuy.bind(this)}>
      <wui-icon size="xs" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
      How does it work?
    </wui-link>`}onWhatIsBuy(){E.X.sendEvent({type:"track",event:"SELECT_WHAT_IS_A_BUY",properties:{isSmartAccount:(0,x.r9)(l.R.state.activeChain)===k.y_.ACCOUNT_TYPES.SMART_ACCOUNT}}),u.RouterController.push("WhatIsABuy")}};eR.styles=[eP],eR=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n}([(0,D.Mo)("w3m-onramp-providers-footer")],eR);let eI=(0,D.iv)`
  :host {
    display: block;
  }

  div.container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    overflow: hidden;
    height: auto;
    display: block;
  }

  div.container[status='hide'] {
    animation: fade-out;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: 0s;
  }

  div.container[status='show'] {
    animation: fade-in;
    animation-duration: var(--apkt-duration-dynamic);
    animation-timing-function: ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      filter: blur(6px);
    }
    to {
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes fade-out {
    from {
      opacity: 1;
      filter: blur(0px);
    }
    to {
      opacity: 0;
      filter: blur(6px);
    }
  }
`;var eE=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eO=class extends r.oi{constructor(){super(...arguments),this.resizeObserver=void 0,this.unsubscribe=[],this.status="hide",this.view=u.RouterController.state.view}firstUpdated(){this.status=eT.hasFooter()?"show":"hide",this.unsubscribe.push(u.RouterController.subscribeKey("view",e=>{this.view=e,this.status=eT.hasFooter()?"show":"hide","hide"===this.status&&document.documentElement.style.setProperty("--apkt-footer-height","0px")})),this.resizeObserver=new ResizeObserver(e=>{for(let t of e)if(t.target===this.getWrapper()){let e=`${t.contentRect.height}px`;document.documentElement.style.setProperty("--apkt-footer-height",e)}}),this.resizeObserver.observe(this.getWrapper())}render(){return(0,r.dy)`
      <div class="container" status=${this.status}>${this.templatePageContainer()}</div>
    `}templatePageContainer(){return eT.hasFooter()?(0,r.dy)` ${this.templateFooter()}`:null}templateFooter(){switch(this.view){case"Networks":return this.templateNetworksFooter();case"Connect":case"ConnectWallets":case"OnRampFiatSelect":case"OnRampTokenSelect":return(0,r.dy)`<w3m-legal-footer></w3m-legal-footer>`;case"OnRampProviders":return(0,r.dy)`<w3m-onramp-providers-footer></w3m-onramp-providers-footer>`;default:return null}}templateNetworksFooter(){return(0,r.dy)` <wui-flex
      class="footer-in"
      padding="3"
      flexDirection="column"
      gap="3"
      alignItems="center"
    >
      <wui-text variant="md-regular" color="secondary" align="center">
        Your connected wallet may not support some of the networks available for this dApp
      </wui-text>
      <wui-link @click=${this.onNetworkHelp.bind(this)}>
        <wui-icon size="sm" color="accent-primary" slot="iconLeft" name="helpCircle"></wui-icon>
        What is a network
      </wui-link>
    </wui-flex>`}onNetworkHelp(){E.X.sendEvent({type:"track",event:"CLICK_NETWORK_HELP"}),u.RouterController.push("WhatIsANetwork")}getWrapper(){return this.shadowRoot?.querySelector("div.container")}};eO.styles=[eI],eE([(0,i.SB)()],eO.prototype,"status",void 0),eE([(0,i.SB)()],eO.prototype,"view",void 0),eO=eE([(0,D.Mo)("w3m-footer")],eO);let eN=(0,D.iv)`
  :host {
    display: block;
    width: inherit;
  }
`;var eW=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eB=class extends r.oi{constructor(){super(),this.unsubscribe=[],this.viewState=u.RouterController.state.view,this.history=u.RouterController.state.history.join(","),this.unsubscribe.push(u.RouterController.subscribeKey("view",()=>{this.history=u.RouterController.state.history.join(","),document.documentElement.style.setProperty("--apkt-duration-dynamic","var(--apkt-durations-lg)")}))}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),document.documentElement.style.setProperty("--apkt-duration-dynamic","0s")}render(){return(0,r.dy)`${this.templatePageContainer()}`}templatePageContainer(){return(0,r.dy)`<w3m-router-container
      history=${this.history}
      .setView=${()=>{this.viewState=u.RouterController.state.view}}
    >
      ${this.viewTemplate(this.viewState)}
    </w3m-router-container>`}viewTemplate(e){switch(e){case"AccountSettings":return(0,r.dy)`<w3m-account-settings-view></w3m-account-settings-view>`;case"Account":return(0,r.dy)`<w3m-account-view></w3m-account-view>`;case"AllWallets":return(0,r.dy)`<w3m-all-wallets-view></w3m-all-wallets-view>`;case"ApproveTransaction":return(0,r.dy)`<w3m-approve-transaction-view></w3m-approve-transaction-view>`;case"BuyInProgress":return(0,r.dy)`<w3m-buy-in-progress-view></w3m-buy-in-progress-view>`;case"ChooseAccountName":return(0,r.dy)`<w3m-choose-account-name-view></w3m-choose-account-name-view>`;case"Connect":default:return(0,r.dy)`<w3m-connect-view></w3m-connect-view>`;case"Create":return(0,r.dy)`<w3m-connect-view walletGuide="explore"></w3m-connect-view>`;case"ConnectingWalletConnect":return(0,r.dy)`<w3m-connecting-wc-view></w3m-connecting-wc-view>`;case"ConnectingWalletConnectBasic":return(0,r.dy)`<w3m-connecting-wc-basic-view></w3m-connecting-wc-basic-view>`;case"ConnectingExternal":return(0,r.dy)`<w3m-connecting-external-view></w3m-connecting-external-view>`;case"ConnectingSiwe":return(0,r.dy)`<w3m-connecting-siwe-view></w3m-connecting-siwe-view>`;case"ConnectWallets":return(0,r.dy)`<w3m-connect-wallets-view></w3m-connect-wallets-view>`;case"ConnectSocials":return(0,r.dy)`<w3m-connect-socials-view></w3m-connect-socials-view>`;case"ConnectingSocial":return(0,r.dy)`<w3m-connecting-social-view></w3m-connecting-social-view>`;case"DataCapture":return(0,r.dy)`<w3m-data-capture-view></w3m-data-capture-view>`;case"DataCaptureOtpConfirm":return(0,r.dy)`<w3m-data-capture-otp-confirm-view></w3m-data-capture-otp-confirm-view>`;case"Downloads":return(0,r.dy)`<w3m-downloads-view></w3m-downloads-view>`;case"EmailLogin":return(0,r.dy)`<w3m-email-login-view></w3m-email-login-view>`;case"EmailVerifyOtp":return(0,r.dy)`<w3m-email-verify-otp-view></w3m-email-verify-otp-view>`;case"EmailVerifyDevice":return(0,r.dy)`<w3m-email-verify-device-view></w3m-email-verify-device-view>`;case"GetWallet":return(0,r.dy)`<w3m-get-wallet-view></w3m-get-wallet-view>`;case"Networks":return(0,r.dy)`<w3m-networks-view></w3m-networks-view>`;case"SwitchNetwork":return(0,r.dy)`<w3m-network-switch-view></w3m-network-switch-view>`;case"ProfileWallets":return(0,r.dy)`<w3m-profile-wallets-view></w3m-profile-wallets-view>`;case"Transactions":return(0,r.dy)`<w3m-transactions-view></w3m-transactions-view>`;case"OnRampProviders":return(0,r.dy)`<w3m-onramp-providers-view></w3m-onramp-providers-view>`;case"OnRampTokenSelect":return(0,r.dy)`<w3m-onramp-token-select-view></w3m-onramp-token-select-view>`;case"OnRampFiatSelect":return(0,r.dy)`<w3m-onramp-fiat-select-view></w3m-onramp-fiat-select-view>`;case"UpgradeEmailWallet":return(0,r.dy)`<w3m-upgrade-wallet-view></w3m-upgrade-wallet-view>`;case"UpdateEmailWallet":return(0,r.dy)`<w3m-update-email-wallet-view></w3m-update-email-wallet-view>`;case"UpdateEmailPrimaryOtp":return(0,r.dy)`<w3m-update-email-primary-otp-view></w3m-update-email-primary-otp-view>`;case"UpdateEmailSecondaryOtp":return(0,r.dy)`<w3m-update-email-secondary-otp-view></w3m-update-email-secondary-otp-view>`;case"UnsupportedChain":return(0,r.dy)`<w3m-unsupported-chain-view></w3m-unsupported-chain-view>`;case"Swap":return(0,r.dy)`<w3m-swap-view></w3m-swap-view>`;case"SwapSelectToken":return(0,r.dy)`<w3m-swap-select-token-view></w3m-swap-select-token-view>`;case"SwapPreview":return(0,r.dy)`<w3m-swap-preview-view></w3m-swap-preview-view>`;case"WalletSend":return(0,r.dy)`<w3m-wallet-send-view></w3m-wallet-send-view>`;case"WalletSendSelectToken":return(0,r.dy)`<w3m-wallet-send-select-token-view></w3m-wallet-send-select-token-view>`;case"WalletSendPreview":return(0,r.dy)`<w3m-wallet-send-preview-view></w3m-wallet-send-preview-view>`;case"WalletSendConfirmed":return(0,r.dy)`<w3m-send-confirmed-view></w3m-send-confirmed-view>`;case"WhatIsABuy":return(0,r.dy)`<w3m-what-is-a-buy-view></w3m-what-is-a-buy-view>`;case"WalletReceive":return(0,r.dy)`<w3m-wallet-receive-view></w3m-wallet-receive-view>`;case"WalletCompatibleNetworks":return(0,r.dy)`<w3m-wallet-compatible-networks-view></w3m-wallet-compatible-networks-view>`;case"WhatIsAWallet":return(0,r.dy)`<w3m-what-is-a-wallet-view></w3m-what-is-a-wallet-view>`;case"ConnectingMultiChain":return(0,r.dy)`<w3m-connecting-multi-chain-view></w3m-connecting-multi-chain-view>`;case"WhatIsANetwork":return(0,r.dy)`<w3m-what-is-a-network-view></w3m-what-is-a-network-view>`;case"ConnectingFarcaster":return(0,r.dy)`<w3m-connecting-farcaster-view></w3m-connecting-farcaster-view>`;case"SwitchActiveChain":return(0,r.dy)`<w3m-switch-active-chain-view></w3m-switch-active-chain-view>`;case"RegisterAccountName":return(0,r.dy)`<w3m-register-account-name-view></w3m-register-account-name-view>`;case"RegisterAccountNameSuccess":return(0,r.dy)`<w3m-register-account-name-success-view></w3m-register-account-name-success-view>`;case"SmartSessionCreated":return(0,r.dy)`<w3m-smart-session-created-view></w3m-smart-session-created-view>`;case"SmartSessionList":return(0,r.dy)`<w3m-smart-session-list-view></w3m-smart-session-list-view>`;case"SIWXSignMessage":return(0,r.dy)`<w3m-siwx-sign-message-view></w3m-siwx-sign-message-view>`;case"Pay":return(0,r.dy)`<w3m-pay-view></w3m-pay-view>`;case"PayLoading":return(0,r.dy)`<w3m-pay-loading-view></w3m-pay-loading-view>`;case"FundWallet":return(0,r.dy)`<w3m-fund-wallet-view></w3m-fund-wallet-view>`;case"PayWithExchange":return(0,r.dy)`<w3m-deposit-from-exchange-view></w3m-deposit-from-exchange-view>`;case"PayWithExchangeSelectAsset":return(0,r.dy)`<w3m-deposit-from-exchange-select-asset-view></w3m-deposit-from-exchange-select-asset-view>`;case"UsageExceeded":return(0,r.dy)`<w3m-usage-exceeded-view></w3m-usage-exceeded-view>`}}};eB.styles=[eN],eW([(0,i.SB)()],eB.prototype,"viewState",void 0),eW([(0,i.SB)()],eB.prototype,"history",void 0),eB=eW([(0,D.Mo)("w3m-router")],eB);let eD=(0,D.iv)`
  :host {
    z-index: ${({tokens:e})=>e.core.zIndex};
    display: block;
    backface-visibility: hidden;
    will-change: opacity;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    opacity: 0;
    background-color: ${({tokens:e})=>e.theme.overlay};
    backdrop-filter: blur(0px);
    transition:
      opacity ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      backdrop-filter ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]};
    will-change: opacity;
  }

  :host(.open) {
    opacity: 1;
    backdrop-filter: blur(8px);
  }

  :host(.appkit-modal) {
    position: relative;
    pointer-events: unset;
    background: none;
    width: 100%;
    opacity: 1;
  }

  wui-card {
    max-width: var(--apkt-modal-width);
    width: 100%;
    position: relative;
    outline: none;
    transform: translateY(4px);
    box-shadow: 0 2px 8px 0 rgba(0, 0, 0, 0.05);
    transition:
      transform ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-2"]},
      border-radius ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      background-color ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]},
      box-shadow ${({durations:e})=>e.lg}
        ${({easings:e})=>e["ease-out-power-1"]};
    will-change: border-radius, background-color, transform, box-shadow;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    padding: var(--local-modal-padding);
    box-sizing: border-box;
  }

  :host(.open) wui-card {
    transform: translateY(0px);
  }

  wui-card::before {
    z-index: 1;
    pointer-events: none;
    content: '';
    position: absolute;
    inset: 0;
    border-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    transition: box-shadow ${({durations:e})=>e.lg}
      ${({easings:e})=>e["ease-out-power-2"]};
    transition-delay: ${({durations:e})=>e.md};
    will-change: box-shadow;
  }

  :host([data-mobile-fullscreen='true']) wui-card::before {
    border-radius: 0px;
  }

  :host([data-border='true']) wui-card::before {
    box-shadow: inset 0px 0px 0px 4px ${({tokens:e})=>e.theme.foregroundSecondary};
  }

  :host([data-border='false']) wui-card::before {
    box-shadow: inset 0px 0px 0px 1px ${({tokens:e})=>e.theme.borderPrimaryDark};
  }

  :host([data-border='true']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-border var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: var(--apkt-duration-dynamic);
  }

  :host([data-border='false']) wui-card {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      card-background-default var(--apkt-duration-dynamic)
        ${({easings:e})=>e["ease-out-power-2"]};
    animation-fill-mode: backwards, both;
    animation-delay: 0s;
  }

  :host(.appkit-modal) wui-card {
    max-width: var(--apkt-modal-width);
  }

  wui-card[shake='true'] {
    animation:
      fade-in ${({durations:e})=>e.lg} ${({easings:e})=>e["ease-out-power-2"]},
      w3m-shake ${({durations:e})=>e.xl}
        ${({easings:e})=>e["ease-out-power-2"]};
  }

  wui-flex {
    overflow-x: hidden;
    overflow-y: auto;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  @media (max-height: 700px) and (min-width: 431px) {
    wui-flex {
      align-items: flex-start;
    }

    wui-card {
      margin: var(--apkt-spacing-6) 0px;
    }
  }

  @media (max-width: 430px) {
    :host([data-mobile-fullscreen='true']) {
      height: 100dvh;
    }
    :host([data-mobile-fullscreen='true']) wui-flex {
      align-items: stretch;
    }
    :host([data-mobile-fullscreen='true']) wui-card {
      max-width: 100%;
      height: 100%;
      border-radius: 0;
      border: none;
    }
    :host(:not([data-mobile-fullscreen='true'])) wui-flex {
      align-items: flex-end;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card {
      max-width: 100%;
      border-bottom: none;
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card[data-embedded='true'] {
      border-bottom-left-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
      border-bottom-right-radius: clamp(0px, var(--apkt-borderRadius-8), 44px);
    }

    :host(:not([data-mobile-fullscreen='true'])) wui-card:not([data-embedded='true']) {
      border-bottom-left-radius: 0px;
      border-bottom-right-radius: 0px;
    }

    wui-card[shake='true'] {
      animation: w3m-shake 0.5s ${({easings:e})=>e["ease-out-power-2"]};
    }
  }

  @keyframes fade-in {
    0% {
      transform: scale(0.99) translateY(4px);
    }
    100% {
      transform: scale(1) translateY(0);
    }
  }

  @keyframes w3m-shake {
    0% {
      transform: scale(1) rotate(0deg);
    }
    20% {
      transform: scale(1) rotate(-1deg);
    }
    40% {
      transform: scale(1) rotate(1.5deg);
    }
    60% {
      transform: scale(1) rotate(-1.5deg);
    }
    80% {
      transform: scale(1) rotate(1deg);
    }
    100% {
      transform: scale(1) rotate(0deg);
    }
  }

  @keyframes card-background-border {
    from {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
  }

  @keyframes card-background-default {
    from {
      background-color: ${({tokens:e})=>e.theme.foregroundSecondary};
    }
    to {
      background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    }
  }
`;var ez=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eF="scroll-lock",eU={PayWithExchange:"0",PayWithExchangeSelectAsset:"0"};class eL extends r.oi{constructor(){super(),this.unsubscribe=[],this.abortController=void 0,this.hasPrefetched=!1,this.enableEmbedded=n.OptionsController.state.enableEmbedded,this.open=s.I.state.open,this.caipAddress=l.R.state.activeCaipAddress,this.caipNetwork=l.R.state.activeCaipNetwork,this.shake=s.I.state.shake,this.filterByNamespace=c.ConnectorController.state.filterByNamespace,this.padding=D.gR.spacing[1],this.mobileFullScreen=n.OptionsController.state.enableMobileFullScreen,this.initializeTheming(),d.ApiController.prefetchAnalyticsConfig(),this.unsubscribe.push(s.I.subscribeKey("open",e=>e?this.onOpen():this.onClose()),s.I.subscribeKey("shake",e=>this.shake=e),l.R.subscribeKey("activeCaipNetwork",e=>this.onNewNetwork(e)),l.R.subscribeKey("activeCaipAddress",e=>this.onNewAddress(e)),n.OptionsController.subscribeKey("enableEmbedded",e=>this.enableEmbedded=e),c.ConnectorController.subscribeKey("filterByNamespace",e=>{this.filterByNamespace===e||l.R.getAccountData(e)?.caipAddress||(d.ApiController.fetchRecommendedWallets(),this.filterByNamespace=e)}),u.RouterController.subscribeKey("view",()=>{this.dataset.border=eT.hasFooter()?"true":"false",this.padding=eU[u.RouterController.state.view]??D.gR.spacing[1]}))}firstUpdated(){if(this.dataset.border=eT.hasFooter()?"true":"false",this.mobileFullScreen&&this.setAttribute("data-mobile-fullscreen","true"),this.caipAddress){if(this.enableEmbedded){s.I.close(),this.prefetch();return}this.onNewAddress(this.caipAddress)}this.open&&this.onOpen(),this.enableEmbedded&&this.prefetch()}disconnectedCallback(){this.unsubscribe.forEach(e=>e()),this.onRemoveKeyboardListener()}render(){return(this.style.setProperty("--local-modal-padding",this.padding),this.enableEmbedded)?(0,r.dy)`${this.contentTemplate()}
        <w3m-tooltip></w3m-tooltip> `:this.open?(0,r.dy)`
          <wui-flex @click=${this.onOverlayClick.bind(this)} data-testid="w3m-modal-overlay">
            ${this.contentTemplate()}
          </wui-flex>
          <w3m-tooltip></w3m-tooltip>
        `:null}contentTemplate(){return(0,r.dy)` <wui-card
      shake="${this.shake}"
      data-embedded="${(0,a.o)(this.enableEmbedded)}"
      role="alertdialog"
      aria-modal="true"
      tabindex="0"
      data-testid="w3m-modal-card"
    >
      <w3m-header></w3m-header>
      <w3m-router></w3m-router>
      <w3m-footer></w3m-footer>
      <w3m-snackbar></w3m-snackbar>
      <w3m-alertbar></w3m-alertbar>
    </wui-card>`}async onOverlayClick(e){e.target!==e.currentTarget||this.mobileFullScreen||await this.handleClose()}async handleClose(){await h.safeClose()}initializeTheming(){let{themeVariables:e,themeMode:t}=m.ThemeController.state,o=D.Hg.getColorTheme(t);(0,D.n)(e,o)}onClose(){this.open=!1,this.classList.remove("open"),this.onScrollUnlock(),g.SnackController.hide(),this.onRemoveKeyboardListener()}onOpen(){this.open=!0,this.classList.add("open"),this.onScrollLock(),this.onAddKeyboardListener()}onScrollLock(){let e=document.createElement("style");e.dataset.w3m=eF,e.textContent=`
      body {
        touch-action: none;
        overflow: hidden;
        overscroll-behavior: contain;
      }
      w3m-modal {
        pointer-events: auto;
      }
    `,document.head.appendChild(e)}onScrollUnlock(){let e=document.head.querySelector(`style[data-w3m="${eF}"]`);e&&e.remove()}onAddKeyboardListener(){this.abortController=new AbortController;let e=this.shadowRoot?.querySelector("wui-card");e?.focus(),window.addEventListener("keydown",t=>{if("Escape"===t.key)this.handleClose();else if("Tab"===t.key){let{tagName:o}=t.target;!o||o.includes("W3M-")||o.includes("WUI-")||e?.focus()}},this.abortController)}onRemoveKeyboardListener(){this.abortController?.abort(),this.abortController=void 0}async onNewAddress(e){let t=l.R.state.isSwitchingNamespace,o="ProfileWallets"===u.RouterController.state.view;e||t||o||s.I.close(),await w.w.initializeIfEnabled(e),this.caipAddress=e,l.R.setIsSwitchingNamespace(!1)}onNewNetwork(e){let t=this.caipNetwork,o=t?.caipNetworkId?.toString(),r=e?.caipNetworkId?.toString(),i="UnsupportedChain"===u.RouterController.state.view,a=s.I.state.open,n=!1;this.enableEmbedded&&"SwitchNetwork"===u.RouterController.state.view&&(n=!0),o!==r&&B.resetState(),a&&i&&(n=!0),n&&"SIWXSignMessage"!==u.RouterController.state.view&&u.RouterController.goBack(),this.caipNetwork=e}prefetch(){this.hasPrefetched||(d.ApiController.prefetch(),d.ApiController.fetchWalletsByPage({page:1}),this.hasPrefetched=!0)}}eL.styles=eD,ez([(0,i.Cb)({type:Boolean})],eL.prototype,"enableEmbedded",void 0),ez([(0,i.SB)()],eL.prototype,"open",void 0),ez([(0,i.SB)()],eL.prototype,"caipAddress",void 0),ez([(0,i.SB)()],eL.prototype,"caipNetwork",void 0),ez([(0,i.SB)()],eL.prototype,"shake",void 0),ez([(0,i.SB)()],eL.prototype,"filterByNamespace",void 0),ez([(0,i.SB)()],eL.prototype,"padding",void 0),ez([(0,i.SB)()],eL.prototype,"mobileFullScreen",void 0);let ej=class extends eL{};ej=ez([(0,D.Mo)("w3m-modal")],ej);let eM=class extends eL{};eM=ez([(0,D.Mo)("appkit-modal")],eM),o(55583);let eH=(0,D.iv)`
  .icon-box {
    width: 64px;
    height: 64px;
    border-radius: ${({borderRadius:e})=>e[5]};
    background-color: ${({colors:e})=>e.semanticError010};
  }
`,eV=class extends r.oi{constructor(){super()}render(){return(0,r.dy)`
      <wui-flex
        flexDirection="column"
        alignItems="center"
        gap="4"
        .padding="${["1","3","4","3"]}"
      >
        <wui-flex justifyContent="center" alignItems="center" class="icon-box">
          <wui-icon size="xxl" color="error" name="warningCircle"></wui-icon>
        </wui-flex>

        <wui-text variant="lg-medium" color="primary" align="center">
          The app isn't responding as expected
        </wui-text>
        <wui-text variant="md-regular" color="secondary" align="center">
          Try again or reach out to the app team for help.
        </wui-text>

        <wui-button
          variant="neutral-secondary"
          size="md"
          @click=${this.onTryAgainClick.bind(this)}
          data-testid="w3m-usage-exceeded-button"
        >
          <wui-icon color="inherit" slot="iconLeft" name="refresh"></wui-icon>
          Try Again
        </wui-button>
      </wui-flex>
    `}onTryAgainClick(){u.RouterController.goBack()}};eV.styles=eH,eV=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n}([(0,D.Mo)("w3m-usage-exceeded-view")],eV),o(39096);let e_=(0,D.iv)`
  :host {
    width: 100%;
  }
`;var eK=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eG=class extends r.oi{constructor(){super(...arguments),this.hasImpressionSent=!1,this.walletImages=[],this.imageSrc="",this.name="",this.size="md",this.tabIdx=void 0,this.disabled=!1,this.showAllWallets=!1,this.loading=!1,this.loadingSpinnerColor="accent-100",this.rdnsId="",this.displayIndex=void 0,this.walletRank=void 0}connectedCallback(){super.connectedCallback()}disconnectedCallback(){super.disconnectedCallback(),this.cleanupIntersectionObserver()}updated(e){super.updated(e),(e.has("name")||e.has("imageSrc")||e.has("walletRank"))&&(this.hasImpressionSent=!1),e.has("walletRank")&&this.walletRank&&!this.intersectionObserver&&this.setupIntersectionObserver()}setupIntersectionObserver(){this.intersectionObserver=new IntersectionObserver(e=>{e.forEach(e=>{!e.isIntersecting||this.loading||this.hasImpressionSent||this.sendImpressionEvent()})},{threshold:.1}),this.intersectionObserver.observe(this)}cleanupIntersectionObserver(){this.intersectionObserver&&(this.intersectionObserver.disconnect(),this.intersectionObserver=void 0)}sendImpressionEvent(){this.name&&!this.hasImpressionSent&&this.walletRank&&(this.hasImpressionSent=!0,(this.rdnsId||this.name)&&E.X.sendWalletImpressionEvent({name:this.name,walletRank:this.walletRank,rdnsId:this.rdnsId,view:u.RouterController.state.view,displayIndex:this.displayIndex}))}render(){return(0,r.dy)`
      <wui-list-wallet
        .walletImages=${this.walletImages}
        imageSrc=${(0,a.o)(this.imageSrc)}
        name=${this.name}
        size=${(0,a.o)(this.size)}
        tagLabel=${(0,a.o)(this.tagLabel)}
        .tagVariant=${this.tagVariant}
        .walletIcon=${this.walletIcon}
        .tabIdx=${this.tabIdx}
        .disabled=${this.disabled}
        .showAllWallets=${this.showAllWallets}
        .loading=${this.loading}
        loadingSpinnerColor=${this.loadingSpinnerColor}
      ></wui-list-wallet>
    `}};eG.styles=e_,eK([(0,i.Cb)({type:Array})],eG.prototype,"walletImages",void 0),eK([(0,i.Cb)()],eG.prototype,"imageSrc",void 0),eK([(0,i.Cb)()],eG.prototype,"name",void 0),eK([(0,i.Cb)()],eG.prototype,"size",void 0),eK([(0,i.Cb)()],eG.prototype,"tagLabel",void 0),eK([(0,i.Cb)()],eG.prototype,"tagVariant",void 0),eK([(0,i.Cb)()],eG.prototype,"walletIcon",void 0),eK([(0,i.Cb)()],eG.prototype,"tabIdx",void 0),eK([(0,i.Cb)({type:Boolean})],eG.prototype,"disabled",void 0),eK([(0,i.Cb)({type:Boolean})],eG.prototype,"showAllWallets",void 0),eK([(0,i.Cb)({type:Boolean})],eG.prototype,"loading",void 0),eK([(0,i.Cb)({type:String})],eG.prototype,"loadingSpinnerColor",void 0),eK([(0,i.Cb)()],eG.prototype,"rdnsId",void 0),eK([(0,i.Cb)()],eG.prototype,"displayIndex",void 0),eK([(0,i.Cb)()],eG.prototype,"walletRank",void 0),eG=eK([(0,D.Mo)("w3m-list-wallet")],eG);let eX=(0,D.iv)`
  :host {
    --local-duration-height: 0s;
    --local-duration: ${({durations:e})=>e.lg};
    --local-transition: ${({easings:e})=>e["ease-out-power-2"]};
  }

  .container {
    display: block;
    overflow: hidden;
    overflow: hidden;
    position: relative;
    height: var(--local-container-height);
    transition: height var(--local-duration-height) var(--local-transition);
    will-change: height, padding-bottom;
  }

  .container[data-mobile-fullscreen='true'] {
    overflow: scroll;
  }

  .page {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    width: inherit;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: ${({tokens:e})=>e.theme.backgroundPrimary};
    border-bottom-left-radius: var(--local-border-bottom-radius);
    border-bottom-right-radius: var(--local-border-bottom-radius);
    transition: border-bottom-left-radius var(--local-duration) var(--local-transition);
  }

  .page[data-mobile-fullscreen='true'] {
    height: 100%;
  }

  .page-content {
    display: flex;
    flex-direction: column;
    min-height: 100%;
  }

  .footer {
    height: var(--apkt-footer-height);
  }

  div.page[view-direction^='prev-'] .page-content {
    animation:
      slide-left-out var(--local-duration) forwards var(--local-transition),
      slide-left-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  div.page[view-direction^='next-'] .page-content {
    animation:
      slide-right-out var(--local-duration) forwards var(--local-transition),
      slide-right-in var(--local-duration) forwards var(--local-transition);
    animation-delay: 0ms, var(--local-duration, ${({durations:e})=>e.lg});
  }

  @keyframes slide-left-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-left-in {
    from {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }

  @keyframes slide-right-out {
    from {
      transform: translateX(0px) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
    to {
      transform: translateX(-8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
  }

  @keyframes slide-right-in {
    from {
      transform: translateX(8px) scale(0.99);
      opacity: 0;
      filter: blur(4px);
    }
    to {
      transform: translateX(0) translateY(0) scale(1);
      opacity: 1;
      filter: blur(0px);
    }
  }
`;var eY=function(e,t,o,r){var i,a=arguments.length,n=a<3?t:null===r?r=Object.getOwnPropertyDescriptor(t,o):r;if("object"==typeof Reflect&&"function"==typeof Reflect.decorate)n=Reflect.decorate(e,t,o,r);else for(var s=e.length-1;s>=0;s--)(i=e[s])&&(n=(a<3?i(n):a>3?i(t,o,n):i(t,o))||n);return a>3&&n&&Object.defineProperty(t,o,n),n};let eq=class extends r.oi{constructor(){super(...arguments),this.resizeObserver=void 0,this.transitionDuration="0.15s",this.transitionFunction="",this.history="",this.view="",this.setView=void 0,this.viewDirection="",this.historyState="",this.previousHeight="0px",this.mobileFullScreen=n.OptionsController.state.enableMobileFullScreen,this.onViewportResize=()=>{this.updateContainerHeight()}}updated(e){if(e.has("history")){let e=this.history;""!==this.historyState&&this.historyState!==e&&this.onViewChange(e)}e.has("transitionDuration")&&this.style.setProperty("--local-duration",this.transitionDuration),e.has("transitionFunction")&&this.style.setProperty("--local-transition",this.transitionFunction)}firstUpdated(){this.transitionFunction&&this.style.setProperty("--local-transition",this.transitionFunction),this.style.setProperty("--local-duration",this.transitionDuration),this.historyState=this.history,this.resizeObserver=new ResizeObserver(e=>{for(let t of e)if(t.target===this.getWrapper()){let e=t.contentRect.height,o=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0");this.mobileFullScreen?(e=(window.visualViewport?.height||window.innerHeight)-this.getHeaderHeight()-o,this.style.setProperty("--local-border-bottom-radius","0px")):(e+=o,this.style.setProperty("--local-border-bottom-radius",o?"var(--apkt-borderRadius-5)":"0px")),this.style.setProperty("--local-container-height",`${e}px`),"0px"!==this.previousHeight&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${e}px`}}),this.resizeObserver.observe(this.getWrapper()),this.updateContainerHeight(),window.addEventListener("resize",this.onViewportResize),window.visualViewport?.addEventListener("resize",this.onViewportResize)}disconnectedCallback(){let e=this.getWrapper();e&&this.resizeObserver&&this.resizeObserver.unobserve(e),window.removeEventListener("resize",this.onViewportResize),window.visualViewport?.removeEventListener("resize",this.onViewportResize)}render(){return(0,r.dy)`
      <div class="container" data-mobile-fullscreen="${(0,a.o)(this.mobileFullScreen)}">
        <div
          class="page"
          data-mobile-fullscreen="${(0,a.o)(this.mobileFullScreen)}"
          view-direction="${this.viewDirection}"
        >
          <div class="page-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `}onViewChange(e){let t=e.split(",").filter(Boolean),o=this.historyState.split(",").filter(Boolean),r=o.length,i=t.length,a=t[t.length-1]||"",n=D.Hg.cssDurationToNumber(this.transitionDuration),s="";i>r?s="next":i<r?s="prev":i===r&&t[i-1]!==o[r-1]&&(s="next"),this.viewDirection=`${s}-${a}`,setTimeout(()=>{this.historyState=e,this.setView?.(a)},n),setTimeout(()=>{this.viewDirection=""},2*n)}getWrapper(){return this.shadowRoot?.querySelector("div.page")}updateContainerHeight(){let e=this.getWrapper();if(!e)return;let t=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--apkt-footer-height")||"0"),o=0;this.mobileFullScreen?(o=(window.visualViewport?.height||window.innerHeight)-this.getHeaderHeight()-t,this.style.setProperty("--local-border-bottom-radius","0px")):(o=e.getBoundingClientRect().height+t,this.style.setProperty("--local-border-bottom-radius",t?"var(--apkt-borderRadius-5)":"0px")),this.style.setProperty("--local-container-height",`${o}px`),"0px"!==this.previousHeight&&this.style.setProperty("--local-duration-height",this.transitionDuration),this.previousHeight=`${o}px`}getHeaderHeight(){return 60}};eq.styles=[eX],eY([(0,i.Cb)({type:String})],eq.prototype,"transitionDuration",void 0),eY([(0,i.Cb)({type:String})],eq.prototype,"transitionFunction",void 0),eY([(0,i.Cb)({type:String})],eq.prototype,"history",void 0),eY([(0,i.Cb)({type:String})],eq.prototype,"view",void 0),eY([(0,i.Cb)({attribute:!1})],eq.prototype,"setView",void 0),eY([(0,i.SB)()],eq.prototype,"viewDirection",void 0),eY([(0,i.SB)()],eq.prototype,"historyState",void 0),eY([(0,i.SB)()],eq.prototype,"previousHeight",void 0),eY([(0,i.SB)()],eq.prototype,"mobileFullScreen",void 0),eq=eY([(0,D.Mo)("w3m-router-container")],eq)}};