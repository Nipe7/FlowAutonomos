'use client'

import { motion } from 'framer-motion'

export default function IdeasRescate() {
  return (
    <section id="ideas" className="relative" style={{ padding: '76px 32px' }}>
      <div className="absolute top-0 left-0 right-0 divider" />

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-10"
        >
          <h2
            style={{
              fontFamily: 'var(--font-oswald), Oswald, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(1.85rem, 4.2vw, 2.9rem)',
              letterSpacing: '2.5px',
              textTransform: 'uppercase',
              color: '#566c83',
            }}
          >
            Ideas Rescate
          </h2>
          <p
            className="mt-2"
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: '0.88rem',
              color: 'rgba(234,236,238,0.5)',
            }}
          >
            Técnicas de marketing que hacen la diferencia.
          </p>
        </motion.div>

        {/* Instagram Reel Embed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="ig-embed-container mx-auto"
          style={{ maxWidth: '380px' }}
        >
          <div
            className="relative"
            style={{
              aspectRatio: '9/16',
              maxHeight: '450px',
              margin: '0 auto',
            }}
          >
            <iframe
              src="https://www.instagram.com/reel/DN5Wd0hCDD7/embed/"
              className="absolute inset-0 w-full h-full"
              allowFullScreen
              scrolling="no"
              style={{ border: 'none' }}
            />
          </div>
        </motion.div>
      </div>

      {/* Responsive padding */}
      <style jsx global>{`
        @media (max-width: 768px) {
          #ideas {
            padding: 54px 17px !important;
          }
        }
      `}</style>
    </section>
  )
}
