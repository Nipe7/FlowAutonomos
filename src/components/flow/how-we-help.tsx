'use client'

import { motion } from 'framer-motion'
import { ExternalLink } from 'lucide-react'

const tools = [
  {
    emoji: '🗺️',
    name: 'Google My Business',
    desc: 'Aparece en Google Maps y búsquedas locales.',
    url: 'https://www.google.com/business/',
    cardClass: 'tc-green',
    color: '#44c478',
  },
  {
    emoji: '🎨',
    name: 'Canva',
    desc: 'Crea posts e historias sin saber diseño.',
    url: 'https://www.canva.com',
    cardClass: 'tc-blue',
    color: '#566c83',
  },
  {
    emoji: '🎬',
    name: 'CapCut Web',
    desc: 'Edita vídeos para Reels y TikTok.',
    url: 'https://www.capcut.com',
    cardClass: 'tc-orange',
    color: '#FF6B35',
  },
  {
    emoji: '🤖',
    name: 'Grok',
    desc: 'IA gratuita para generar ideas de contenido.',
    url: 'https://grok.com',
    cardClass: 'tc-green',
    color: '#44c478',
  },
  {
    emoji: '📅',
    name: 'Buffer',
    desc: 'Programa publicaciones en todas las redes.',
    url: 'https://buffer.com',
    cardClass: 'tc-blue',
    color: '#566c83',
  },
]

export default function HowWeHelp() {
  return (
    <section id="ayuda" className="relative" style={{ padding: '76px 32px' }}>
      <div className="absolute top-0 left-0 right-0 divider" />

      <div style={{ maxWidth: '1160px', margin: '0 auto' }}>
        {/* Section Header */}
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
              color: '#44c478',
            }}
          >
            ¿Cómo te ayudamos?
          </h2>
          <p
            className="mt-2"
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: '0.88rem',
              color: 'rgba(234,236,238,0.5)',
            }}
          >
            Herramientas gratis que potencian tu marketing
          </p>
        </motion.div>

        {/* Panel with fuchsia border */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="panel mb-10"
        >
          <p
            style={{
              fontFamily: 'var(--font-inter), Inter, sans-serif',
              fontSize: '1.04rem',
              lineHeight: 1.95,
              opacity: 0.88,
            }}
          >
            La ayuda es gratis, si te la cobran pasa a ser negocio. Aquí encontrarás mucha ayuda con diferentes herramientas para{' '}
            <strong style={{ color: '#44c478' }}>refrescar la ilusión de abrir puertas cada día</strong>.
            Si lo que quieres es negociar conmigo, te dejo abajo mi ebook y mis redes para que contactes.
          </p>
        </motion.div>

        {/* Tools Grid: 5 columns */}
        <div
          className="grid gap-[14px]"
          style={{
            gridTemplateColumns: 'repeat(5, 1fr)',
          }}
        >
          {/* Responsive overrides via style media queries - using CSS approach */}
          {tools.map((tool, i) => (
            <motion.a
              key={i}
              href={tool.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`${tool.cardClass} flex flex-col items-center text-center no-underline transition-all duration-300`}
              style={{
                padding: '24px 14px 20px',
              }}
            >
              <span className="text-2xl mb-3">{tool.emoji}</span>
              <h4
                className="mb-2 flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  letterSpacing: '1px',
                  textTransform: 'uppercase',
                  color: tool.color,
                }}
              >
                {tool.name}
                <ExternalLink style={{ width: '12px', height: '12px', opacity: 0.5 }} />
              </h4>
              <p
                style={{
                  fontFamily: 'var(--font-inter), Inter, sans-serif',
                  fontSize: '0.74rem',
                  color: 'rgba(234,236,238,0.6)',
                  lineHeight: 1.5,
                }}
              >
                {tool.desc}
              </p>
            </motion.a>
          ))}
        </div>
      </div>

      {/* Responsive grid overrides */}
      <style jsx global>{`
        @media (max-width: 1050px) {
          #ayuda .grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          #ayuda .grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #ayuda {
            padding: 54px 17px !important;
          }
        }
      `}</style>
    </section>
  )
}
