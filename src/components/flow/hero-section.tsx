'use client'

import { motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export default function HeroSection() {
  return (
    <section
      id="inicio"
      className="relative flex items-center justify-center overflow-hidden"
      style={{ height: '100vh', minHeight: '560px' }}
    >
      {/* VIDEO BACKGROUND */}
      <div className="hero-video">
        <video autoPlay loop muted playsInline>
          <source src="https://assets.mixkit.co/videos/4735/4735-720.mp4" type="video/mp4" />
        </video>
      </div>

      {/* OVERLAY 1: Radial green-blue gradient */}
      <div
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(68,196,120,.09) 0%, rgba(86,108,131,.06) 40%, rgba(2,2,2,1) 78%)',
        }}
      />

      {/* OVERLAY 2: Dark vignette */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, transparent, rgba(2,2,2,.58))',
        }}
      />

      {/* OVERLAY 3: Scan lines */}
      <div className="hero-scanlines" />

      {/* CONTENT */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center"
        style={{ padding: '0 32px', maxWidth: '1160px', margin: '0 auto', width: '100%' }}
      >
        {/* Hero badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.1 }}
          className="mb-6"
        >
          <span
            className="inline-block rounded-full"
            style={{
              fontFamily: 'var(--font-oswald), Oswald, sans-serif',
              fontSize: '0.69rem',
              letterSpacing: '3px',
              textTransform: 'uppercase',
              color: '#FF1493',
              border: '1px solid rgba(255,20,147,0.3)',
              background: 'rgba(255,20,147,0.05)',
              padding: '6px 16px',
            }}
          >
            Marketing consciente para autónomos
          </span>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.25 }}
          className="mb-6"
          style={{
            fontFamily: 'var(--font-oswald), Oswald, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(2.1rem, 7vw, 4.6rem)',
            lineHeight: 1.0,
            textTransform: 'uppercase',
          }}
        >
          <span className="block" style={{ color: '#eaecee' }}>Sube tu negocio</span>
          <span className="block" style={{ color: 'white' }}>sin bajar</span>
          <span className="block" style={{ color: '#eaecee' }}>la moral</span>
          <span
            className="block"
            style={{
              color: '#FF6B35',
              fontSize: '0.53em',
              letterSpacing: '0.15em',
            }}
          >
            ni las cuentas.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.4 }}
          className="mb-10 max-w-2xl"
          style={{
            fontFamily: 'var(--font-inter), Inter, sans-serif',
            fontSize: 'clamp(0.9rem, 1.9vw, 1.08rem)',
            color: 'rgba(234,236,238,0.72)',
            lineHeight: 1.75,
          }}
        >
          Aquí las ideas son gratis, reales y hechas para que el flow vuelva a tu negocio.
        </motion.p>

        {/* 3 Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.85, delay: 0.55 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <a
            href="#sinergias"
            className="hero-btn hero-btn-green"
            style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif' }}
          >
            Sinergias
          </a>
          <a
            href="#ebook"
            className="hero-btn hero-btn-orange"
            style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif' }}
          >
            eBook
          </a>
          <a
            href="#analizador"
            className="hero-btn hero-btn-blue"
            style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif' }}
          >
            Analizador
          </a>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        className="absolute bottom-6 left-1/2 z-10"
        style={{ transform: 'translateX(-50%)' }}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <a href="#ayuda" style={{ color: 'rgba(68,196,120,0.4)' }} className="no-underline transition-colors duration-300 hover:text-[#44c478]">
          <ChevronDown className="w-6 h-6" />
        </a>
      </motion.div>
    </section>
  )
}
