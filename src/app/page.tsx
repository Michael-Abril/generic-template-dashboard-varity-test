'use client';

import { usePrivy } from '@privy-io/react-auth';
import { ArrowRight, Check, Sparkles, Brain } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  const { login, ready, authenticated } = usePrivy();

  // If already authenticated, redirect to dashboard
  if (authenticated) {
    if (typeof window !== 'undefined') {
      window.location.href = '/dashboard';
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Conversion Focused */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Effects - Same as Varity */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gradient-to-b from-electric-400/5 via-background to-background" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-electric-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left: Content */}
            <div className="animate-fade-in">
              {/* Back to Varity Link */}
              <div className="mb-6">
                <Link 
                  href="http://localhost:3000/dashboard" 
                  className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground-secondary transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Varity Marketing
                </Link>
              </div>

              {/* Beta Badge */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500/10 to-electric-400/10 border border-brand-500/20 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                <span className="text-sm font-medium text-brand-400">Beta Access - 1 Month Free</span>
              </div>

              {/* Headline */}
              <h1 className="text-display-lg md:text-display-xl font-bold tracking-tight text-foreground">
                Be a Beta Tester for
                <br />
                <span className="bg-gradient-to-r from-brand-500 to-electric-400 bg-clip-text text-transparent">
                  AI Dashboards
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mt-6 text-body-lg md:text-body-xl text-foreground-secondary max-w-lg">
                Join our exclusive beta program. Help shape the future of business intelligence 
                on Web3. Limited spots available on testnet.
              </p>

              {/* Benefits - Beta Focus */}
              <div className="mt-8 space-y-3">
                {[
                  "Early access to cutting-edge AI dashboard technology",
                  "Direct feedback channel with our development team",
                  "Free month of usage + 50% discount after beta",
                  "Help shape features for your industry",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="flex-shrink-0 p-1 rounded-full bg-brand-500/20">
                      <Check className="h-4 w-4 text-brand-400" />
                    </div>
                    <span className="text-body-md text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* CTAs */}
              <div className="mt-10 flex flex-col sm:flex-row items-start gap-4">
                <button
                  onClick={login}
                  disabled={!ready}
                  className={`
                    inline-flex items-center justify-center gap-2 
                    h-14 px-10 rounded-lg text-lg font-semibold
                    transition-all duration-200 ease-out
                    ${!ready 
                      ? 'bg-background-secondary text-foreground-disabled cursor-not-allowed' 
                      : 'bg-gradient-to-r from-brand-500 to-electric-400 text-slate-950 hover:from-brand-400 hover:to-electric-300 hover:shadow-glow-lg'
                    }
                  `}
                >
                  {!ready ? 'Loading...' : 'Join Beta Program'}
                  <ArrowRight className="h-5 w-5" />
                </button>
                
                <Link 
                  href="http://localhost:3000/contact"
                  className="inline-flex items-center justify-center gap-2 h-14 px-10 rounded-lg text-lg font-medium border border-border bg-transparent text-foreground hover:bg-background-quaternary hover:border-brand-500 transition-all duration-200"
                >
                  Learn More
                </Link>
              </div>

              <p className="mt-4 text-sm text-foreground-muted">
                Limited to 100 beta testers • Testnet only • No credit card required
              </p>
            </div>

            {/* Right: Dashboard Preview - Same Style as Marketing Site */}
            <div className="relative animate-slide-up">
              <div className="relative rounded-xl overflow-hidden border border-border bg-background-secondary shadow-2xl">
                {/* Browser Chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-background">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="flex-1 flex items-center justify-center">
                    <div className="px-4 py-1 rounded-md bg-background-secondary text-xs text-foreground-muted">
                      your-company.varity.app
                    </div>
                  </div>
                </div>

                {/* Dashboard Content */}
                <div className="p-6">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-500 to-electric-400 flex items-center justify-center">
                        <Brain className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-foreground">Your Company AI</div>
                        <div className="text-xs text-foreground-muted">Powered by Varity</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-xs text-foreground-muted">Online</span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-6">
                    {[
                      { label: "Revenue", value: "$1.2M", change: "+12%" },
                      { label: "Customers", value: "8.4K", change: "+8%" },
                      { label: "AI Queries", value: "45K", change: "+23%" },
                    ].map((stat) => (
                      <div key={stat.label} className="p-3 rounded-lg bg-background border border-border">
                        <div className="text-xs text-foreground-muted">{stat.label}</div>
                        <div className="text-lg font-bold text-foreground">{stat.value}</div>
                        <div className="text-xs text-brand-400">{stat.change}</div>
                      </div>
                    ))}
                  </div>

                  {/* AI Chat Preview */}
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-background-secondary/50 border border-border">
                      <div className="text-sm text-foreground">"What&apos;s our best performing product?"</div>
                    </div>
                    <div className="p-3 rounded-lg bg-brand-500/10 border border-brand-500/30">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 text-brand-400 mt-0.5" />
                        <div className="text-sm text-foreground">
                          Based on Q4 data, Widget Pro leads with $342K revenue and 23% margin improvement...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-500/20 via-electric-400/20 to-brand-500/20 rounded-2xl blur-2xl opacity-50 -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Simple FAQ Section - Conversion Focused */}
      <section className="py-16 lg:py-24 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-display-md font-bold text-foreground">Quick Questions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                q: "How quickly can I get started?",
                a: "2 minutes. Connect your data sources and start asking questions immediately."
              },
              {
                q: "What happens after the free trial?",
                a: "Choose to continue at $99-299/month or export your data. No surprises."
              },
              {
                q: "Is my data secure?",
                a: "Yes. 5-layer encryption with decentralized storage. You own your data."
              },
              {
                q: "Do I need technical skills?",
                a: "No. If you can use email, you can use our dashboard."
              }
            ].map((faq) => (
              <div key={faq.q} className="p-6 rounded-lg bg-background-secondary border border-border">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-sm text-foreground-secondary">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Simple Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link href="http://localhost:3000" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
                Varity Home
              </Link>
              <Link href="http://localhost:3000/dashboard" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
                Learn More
              </Link>
              <Link href="http://localhost:3000/pricing" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
                Pricing
              </Link>
            </div>
            <div className="text-sm text-foreground-muted">
              Powered by Varity - The Operating System for Web3
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}