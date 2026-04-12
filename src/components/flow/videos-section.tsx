'use client'

import { motion } from 'framer-motion'
import { Play, Instagram, Facebook } from 'lucide-react'

const videos = [
  {
    platform: 'instagram',
    icon: Instagram,
    title: 'FlowAutónomos en Instagram',
    description: 'Descubre nuestros reels con tips para autónomos, estrategias de IA aplicadas al día a día y contenido inspirador para emprendedores.',
    embedUrl: 'https://www.instagram.com/reel/DCJ6BvnSxSF/embed/',
    color: 'from-pink-500 via-purple-500 to-orange-400',
    bgColor: 'from-pink-500/10 to-purple-500/10',
  },
  {
    platform: 'facebook',
    icon: Facebook,
    title: 'FlowAutónomos en Facebook',
    description: 'Mira nuestros vídeos sobre automatización, herramientas IA para pymes y autónomos, y casos de éxito reales.',
    embedUrl: 'https://www.facebook.com/plugins/video.php?href=https://www.facebook.com/watch/?v=1234567890&show_text=false&width=560',
    color: 'from-blue-600 to-blue-400',
    bgColor: 'from-blue-500/10 to-blue-600/10',
  },
]

export default function VideosSection() {
  return (
    <section id="videos" className="relative py-24 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-flow-dark" />
      <div className="absolute top-0 left-0 right-0 section-divider" />

      <div className="absolute top-20 left-1/4 w-80 h-80 rounded-full bg-flow-pink/5 blur-[100px]" />
      <div className="absolute bottom-20 right-1/4 w-72 h-72 rounded-full bg-flow-cyan/5 blur-[80px]" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="inline-block px-4 py-1.5 rounded-full glass text-flow-pink text-sm font-medium mb-4">
            🎥 Contenido Multimedia
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
            <span className="text-white">Nuestros</span>{' '}
            <span className="text-gradient-cyan">Vídeos</span>
          </h2>
          <p className="text-white/50 text-lg max-w-xl mx-auto">
            Contenido real en redes sociales. Tips, herramientas y estrategias 
            para autónomos que quieren crecer con la ayuda de la IA.
          </p>
        </motion.div>

        {/* Videos grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {videos.map((video, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.15 }}
              className="group"
            >
              <div className="relative overflow-hidden rounded-2xl glass hover:bg-white/[0.08] transition-all duration-500">
                {/* Video embed area */}
                <div className="relative aspect-video bg-black/40 overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${video.color} flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500 cursor-pointer`}>
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                  </div>
                  {/* Decorative gradient overlay */}
                  <div className={`absolute inset-0 bg-gradient-to-t ${video.bgColor} opacity-50`} />
                  
                  {/* Platform badge */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full glass">
                    <video.icon className="w-4 h-4 text-white" />
                    <span className="text-xs text-white/80 capitalize">{video.platform}</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-6">
                  <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-gradient-cyan transition-all">
                    {video.title}
                  </h3>
                  <p className="text-white/50 text-sm leading-relaxed">
                    {video.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
