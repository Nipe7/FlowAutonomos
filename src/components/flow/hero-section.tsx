'use client'

import { motion, useScroll, useTransform } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useRef, useMemo } from 'react'

// Generador de partículas para cada zona del oficio
function generateParticles(type: 'sawdust' | 'steam' | 'clay' | 'water', count: number) {
  const particles = []
  for (let i = 0; i < count; i++) {
    const seed = Math.random()
    particles.push({
      id: i,
      className:
        type === 'sawdust' ? 'sawdust-particle' :
        type === 'steam' ? 'steam-wisp' :
        type === 'clay' ? 'clay-spin' : 'water-drop',
      // Posición dentro de la zona (en %)
      style: type === 'sawdust' ? {
        left: `${8 + seed * 18}%`,
        top: `${15 + seed * 25}%`,
        width: `${3 + seed * 4}px`,
        height: `${3 + seed * 4}px`,
        animationDuration: `${3.5 + seed * 3}s`,
        animationDelay: `${seed * 2.5}s`,
      } : type === 'steam' ? {
        left: `${5 + seed * 20}%`,
        top: `${60 + seed * 15}%`,
        width: `${8 + seed * 12}px`,
        height: `${6 + seed * 10}px`,
        animationDuration: `${4 + seed * 3}s`,
        animationDelay: `${seed * 2}s`,
      } : type === 'clay' ? {
        left: `${68 + seed * 18}%`,
        top: `${15 + seed * 25}%`,
        width: `${12 + seed * 18}px`,
        height: `${12 + seed * 18}px`,
        animationDuration: `${5 + seed * 4}s`,
        animationDelay: `${seed * 2}s`,
      } : {
        left: `${68 + seed * 18}%`,
        top: `${60 + seed * 20}%`,
        width: `${3 + seed * 5}px`,
        height: `${3 + seed * 5}px`,
        animationDuration: `${2 + seed * 3}s`,
        animationDelay: `${seed * 2.5}s`,
      },
    })
  }
  return particles
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null)

  // Parallax de scroll: la imagen se mueve más despacio que el scroll
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  })
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '15%'])
  const imageScale = useTransform(scrollYProgress, [0, 1], [1, 1.08])

  // Generar partículas (memoized para no regenerar cada render)
  const sawdustParticles = useMemo(() => generateParticles('sawdust', 8), [])
  const steamParticles = useMemo(() => generateParticles('steam', 6), [])
  const clayParticles = useMemo(() => generateParticles('clay', 4), [])
  const waterParticles = useMemo(() => generateParticles('water', 7), [])

  return (
    <section
      ref={sectionRef}
      id="inicio"
      className="relative flex items-center justify-center overflow-hidden"
      style={{ height: '100vh', minHeight: '560px' }}
    >
      {/* CINEMATIC IMAGE BACKGROUND with parallax */}
      <div className="hero-image-bg">
        <motion.img
          src="/hero-crafts.png"
          alt=""
          style={{ y: imageY, scale: imageScale }}
        />
      </div>

      {/* PARTICLE OVERLAYS - micro-movimientos por zona */}
      <div className="hero-particles">
        {/* Virutas de madera - zona carpintero (top-left) */}
        {sawdustParticles.map((p) => (
          <span key={`saw-${p.id}`} className={p.className} style={p.style} />
        ))}

        {/* Vapor de café - zona barista (bottom-left) */}
        {steamParticles.map((p) => (
          <span key={`stm-${p.id}`} className={p.className} style={p.style} />
        ))}

        {/* Giro de arcilla - zona ceramista (top-right) */}
        {clayParticles.map((p) => (
          <span key={`clay-${p.id}`} className={p.className} style={p.style} />
        ))}

        {/* Gotas de agua - zona fontanero (bottom-right) */}
        {waterParticles.map((p) => (
          <span key={`wat-${p.id}`} className={p.className} style={p.style} />
        ))}

        {/* Brillo sutil de textura sobre toda la imagen */}
        <div className="hero-texture-shimmer" />
      </div>

      {/* OVERLAY 1: Radial green-blue gradient */}
      <div
        className="absolute inset-0 z-[2] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(68,196,120,.09) 0%, rgba(86,108,131,.06) 40%, rgba(2,2,2,1) 78%)',
        }}
      />

      {/* OVERLAY 2: Dark vignette */}
      <div
        className="absolute inset-0 z-[3] pointer-events-none"
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
