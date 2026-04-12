'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const navLinks = [
  { label: 'Ayuda', href: '#ayuda' },
  { label: 'Herramientas', href: '#ayuda' },
  { label: 'Ideas', href: '#ideas' },
  { label: 'Sinergias', href: '#sinergias' },
  { label: 'Analizador', href: '#analizador' },
  { label: 'eBook', href: '#ebook' },
]

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-[999]"
      style={{
        padding: '14px 40px',
        background: 'rgba(2,2,2,0.9)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(68,196,120,0.09)',
      }}
    >
      <div className="mx-auto flex items-center justify-between" style={{ maxWidth: '1160px' }}>
        {/* Logo */}
        <a href="#inicio" className="flex items-center gap-1 no-underline">
          <span
            className="text-[#44c478]"
            style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif', fontWeight: 700, fontSize: '1.38rem', letterSpacing: '3px' }}
          >
            Flow
          </span>
          <span
            className="text-[#eaecee]"
            style={{ fontFamily: 'var(--font-oswald), Oswald, sans-serif', fontWeight: 700, fontSize: '1.38rem', letterSpacing: '3px' }}
          >
            Autónomos
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center" style={{ gap: '28px' }}>
          {navLinks.map((link) => (
            <a
              key={link.href + link.label}
              href={link.href}
              className="no-underline transition-colors duration-300"
              style={{
                fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                fontSize: '0.77rem',
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: 'rgba(234,236,238,0.6)',
              }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#44c478' }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(234,236,238,0.6)' }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Mobile Toggle - Hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden flex flex-col gap-[5px] p-2 bg-transparent border-none cursor-pointer"
          aria-label="Toggle menu"
        >
          <span className="hamburger-line" style={{ transform: mobileOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none' }} />
          <span className="hamburger-line" style={{ opacity: mobileOpen ? 0 : 1 }} />
          <span className="hamburger-line" style={{ transform: mobileOpen ? 'rotate(-45deg) translate(5px, -5px)' : 'none' }} />
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden overflow-hidden"
            style={{
              background: 'rgba(2,2,2,0.95)',
              backdropFilter: 'blur(14px)',
            }}
          >
            <div className="py-3" style={{ padding: '0 17px' }}>
              {navLinks.map((link) => (
                <a
                  key={link.href + link.label}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block no-underline transition-colors duration-300"
                  style={{
                    fontFamily: 'var(--font-oswald), Oswald, sans-serif',
                    fontSize: '0.77rem',
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: 'rgba(234,236,238,0.6)',
                    padding: '10px 0',
                  }}
                  onMouseEnter={(e) => { (e.target as HTMLElement).style.color = '#44c478' }}
                  onMouseLeave={(e) => { (e.target as HTMLElement).style.color = 'rgba(234,236,238,0.6)' }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}
