'use client';

import { useEffect, useState } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';
import { Check, Sparkles, Brain } from 'lucide-react';
import { SignupProgressBar } from '@/components/SignupProgressBar';
import Link from 'next/link';
import Script from 'next/script';

// FAQ data for both display and structured data
const faqData = [
  {
    question: "How quickly can I get started?",
    answer: "2 minutes. Connect your data sources and start asking questions immediately."
  },
  {
    question: "What happens after the free trial?",
    answer: "Choose to continue at $99-299/month or export your data. No surprises."
  },
  {
    question: "Is my data secure?",
    answer: "Yes. 5-layer encryption with decentralized storage. You own your data."
  },
  {
    question: "Do I need technical skills?",
    answer: "No. If you can use email, you can use our dashboard."
  }
];

// Generate FAQ schema for SEO
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqData.map((faq) => ({
    "@type": "Question",
    "name": faq.question,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.answer
    }
  }))
};

export default function HomePage() {
  const { authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);

  // Check onboarding status and redirect appropriately
  useEffect(() => {
    const checkOnboardingAndRedirect = async () => {
      if (!authenticated || !ready || hasRedirected || isCheckingOnboarding) return;

      const walletAddress = wallets?.[0]?.address;
      if (!walletAddress) return;

      setIsCheckingOnboarding(true);

      try {
        const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
        const response = await fetch(
          `${backendUrl}/api/v1/onboarding/status?wallet_address=${walletAddress}`
        );

        if (response.ok) {
          const data = await response.json();
          setHasRedirected(true);

          // If onboarding completed, go to dashboard; otherwise go to onboarding
          if (data.onboarding_completed) {
            window.location.href = '/dashboard';
          } else {
            window.location.href = '/onboarding';
          }
        } else {
          // If we can't check status, default to onboarding for new users
          setHasRedirected(true);
          window.location.href = '/onboarding';
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
        // On error, send to onboarding (safer for new users)
        setHasRedirected(true);
        window.location.href = '/onboarding';
      }
    };

    checkOnboardingAndRedirect();
  }, [authenticated, ready, wallets, hasRedirected, isCheckingOnboarding]);

  // Show loading state while checking onboarding status for authenticated users
  if (authenticated && ready && !hasRedirected) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground-secondary">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // If redirecting, show nothing
  if (hasRedirected) {
    return null;
  }

  return (
    <>
      {/* FAQ Schema for SEO (Google Rich Snippets) */}
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

    <div className="min-h-screen bg-background">
      {/* Hero Section - Conversion Focused */}
      <section className="relative min-h-[90vh] flex items-center overflow-hidden">
        {/* Background Effects - Same as Varity (responsive for mobile) */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-electric-400/5 via-background to-background" />
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[400px] md:w-[800px] h-[400px] md:h-[800px] bg-electric-400/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[300px] md:w-[600px] h-[300px] md:h-[600px] bg-brand-500/10 rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            
            {/* Left: Content */}
            <div className="animate-fade-in">
              {/* Back to Varity Link */}
              <div className="mb-6">
                <Link
                  href="https://www.varity.so"
                  className="inline-flex items-center gap-2 text-foreground-muted hover:text-foreground-secondary transition-colors text-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Varity
                </Link>
              </div>

              {/* Beta Badge */}
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-brand-500/10 to-electric-400/10 border border-brand-500/20 mb-6">
                <Sparkles className="h-3.5 w-3.5 text-brand-400" />
                <span className="text-sm font-medium text-brand-400">Beta Access Now Open</span>
              </div>

              {/* Headline - Value-focused (2025 best practice) */}
              <h1 className="text-display-lg md:text-display-xl font-bold tracking-tight text-foreground">
                Your Company&apos;s Own
                <br />
                <span className="bg-gradient-to-r from-brand-500 to-electric-400 bg-clip-text text-transparent">
                  AI Dashboard
                </span>
              </h1>

              {/* Subheadline - Benefit-focused */}
              <p className="mt-6 text-body-lg md:text-body-xl text-foreground-secondary max-w-lg">
                Connect your business tools. Ask questions in plain English.
                Get AI-powered insights in seconds. Private and secure on Web3.
              </p>

              {/* Benefits - Beta Focus */}
              <div className="mt-8 space-y-3">
                {[
                  "AI-powered business intelligence for your company",
                  "Connect QuickBooks, Slack, Google Workspace and more",
                  "Your data stays private with decentralized storage",
                  "Direct feedback channel with our development team",
                ].map((benefit) => (
                  <div key={benefit} className="flex items-center gap-3">
                    <div className="flex-shrink-0 p-1 rounded-full bg-brand-500/20">
                      <Check className="h-4 w-4 text-brand-400" />
                    </div>
                    <span className="text-body-md text-foreground">{benefit}</span>
                  </div>
                ))}
              </div>

              {/* Single CTA Section - Progress Bar with embedded CTA (2025 best practice: single focused CTA) */}
              <div className="mt-10 p-5 rounded-xl bg-background-secondary/50 border border-border">
                <SignupProgressBar
                  earlyAdopterSpots={100}
                  apiEndpoint="/api/v1/stats/signups"
                  pollingInterval={30000}
                />
              </div>

              {/* Secondary action - scroll to FAQ (keeps users on page) */}
              <div className="mt-4 flex items-center justify-center sm:justify-start">
                <a
                  href="#faq"
                  className="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground-secondary transition-colors"
                >
                  <span>Have questions?</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </a>
              </div>
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

                  {/* Quick Stats - Responsive grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
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
      <section id="faq" className="py-16 lg:py-24 border-t border-border scroll-mt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-display-md font-bold text-foreground">Quick Questions</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {faqData.map((faq) => (
              <div key={faq.question} className="p-6 rounded-lg bg-background-secondary border border-border">
                <h3 className="font-semibold text-foreground mb-2">{faq.question}</h3>
                <p className="text-sm text-foreground-secondary">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer with Social Links + DePin Branding */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Social Links */}
          <div className="flex justify-center gap-6 mb-6">
            <a href="https://x.com/VarityHQ" target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-brand-500 transition-colors" aria-label="Twitter">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </a>
            <a href="https://discord.gg/Uhjx6yhJ" target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-brand-500 transition-colors" aria-label="Discord">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/></svg>
            </a>
            <a href="https://www.linkedin.com/company/varity-labs" target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-brand-500 transition-colors" aria-label="LinkedIn">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </a>
            <a href="https://github.com/varity-labs" target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-brand-500 transition-colors" aria-label="GitHub">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
            <a href="https://www.youtube.com/@VarityHQ" target="_blank" rel="noopener noreferrer" className="text-foreground-muted hover:text-brand-500 transition-colors" aria-label="YouTube">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
            </a>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap justify-center gap-6 mb-6">
            <Link href="https://www.varity.so" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
              Varity Home
            </Link>
            <Link href="https://www.varity.so/dashboard" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
              Dashboard
            </Link>
            <Link href="https://www.varity.so/pricing" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
              Pricing
            </Link>
            <Link href="https://www.varity.so/contact" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
              Contact
            </Link>
            <Link href="https://www.varity.so/privacy" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
              Privacy Policy
            </Link>
            <Link href="https://www.varity.so/terms" className="text-sm text-foreground-muted hover:text-foreground-secondary transition-colors">
              Terms of Service
            </Link>
          </div>

          {/* DePin Branding */}
          <div className="text-center text-sm text-foreground-muted mb-4">
            Powered by{" "}
            <a href="https://akash.network" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-400 transition-colors">Akash</a>
            {" + "}
            <a href="https://filecoin.io" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-400 transition-colors">Filecoin</a>
            {" + "}
            <a href="https://arbitrum.io" target="_blank" rel="noopener noreferrer" className="text-brand-500 hover:text-brand-400 transition-colors">Arbitrum</a>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-foreground-muted">
            &copy; {new Date().getFullYear()} Varity. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}