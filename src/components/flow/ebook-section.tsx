'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'

export default function EbookSection() {
  return (
    <section id="ebook" className="relative" style={{ padding: '76px 32px' }}>
      <div className="absolute top-0 left-0 right-0 divider" />

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          {/* Title */}
          <h2
            className="mb-3"
            style={{
              fontFamily: 'var(--font-oswald), Oswald, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(1.85rem, 4.2vw, 2.9rem)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: '#FF6B35',
            }}
          >
            El desfibrilador del autónomo
          </h2>

          {/* Copy text — KEPT EXACTLY AS USER REQUESTED */}
          <p
            className="mb-8"
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: 'clamp(0.9rem, 1.9vw, 1.08rem)',
              color: 'rgba(234,236,238,0.72)',
              lineHeight: 1.75,
            }}
          >
            El e-book que dará un chispazo a tu negocio.
          </p>

          {/* Cover image */}
          <div
            className="mx-auto mb-6"
            style={{
              width: '220px',
              height: '330px',
              borderRadius: '10px',
              overflow: 'hidden',
              border: '1px solid rgba(68,196,120,0.2)',
              boxShadow: '0 8px 40px rgba(68,196,120,0.15), 0 2px 12px rgba(0,0,0,0.5)',
            }}
          >
            <Image
              src="/ebook-cover.jpg"
              alt="Portada - El desfibrilador del autónomo"
              width={220}
              height={330}
              className="w-full h-full object-cover"
              priority
            />
          </div>

          {/* Price */}
          <div
            className="mb-8 animate-neon-orange"
            style={{
              fontFamily: 'var(--font-oswald), Oswald, sans-serif',
              fontWeight: 700,
              fontSize: '3.1rem',
              color: '#FF6B35',
              lineHeight: 1,
            }}
          >
            9,99€
          </div>

          {/* Buy button — orange border style */}
          <a
            href="https://go.hotmart.com/M105158609F"
            target="_blank"
            rel="noopener noreferrer"
            className="hero-btn hero-btn-orange inline-block no-underline"
            style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif' }}
          >
            Comprar por 9,99€
          </a>
        </motion.div>
      </div>

      {/* Responsive padding */}
      <style jsx global>{`
        @media (max-width: 768px) {
          #ebook {
            padding: 54px 17px !important;
          }
        }
      `}</style>
    </section>
  )
}
