'use client'

import Navbar from '@/components/flow/navbar'
import HeroSection from '@/components/flow/hero-section'
import HowWeHelp from '@/components/flow/how-we-help'
import IdeasRescate from '@/components/flow/ideas-rescate'
import SinergiasSection from '@/components/flow/synergies-section'
import AIAnalyzer from '@/components/flow/ai-analyzer'
import EbookSection from '@/components/flow/ebook-section'
import Footer from '@/components/flow/footer'

export default function Home() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#020202' }}>
      <Navbar />
      <HeroSection />
      <HowWeHelp />
      <IdeasRescate />
      <SinergiasSection />
      <AIAnalyzer />
      <EbookSection />
      <Footer />
    </div>
  )
}
