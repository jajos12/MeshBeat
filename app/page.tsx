'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Radio, Smartphone, ArrowRight, Waves, Zap, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();

  const features = [
    {
      icon: Waves,
      title: 'Sub-ms Sync',
      description: 'NTP-style clock synchronization for perfect audio alignment',
    },
    {
      icon: Zap,
      title: 'Zero Config',
      description: 'Scan QR, join instantly. No app download required',
    },
    {
      icon: Shield,
      title: 'P2P Direct',
      description: 'Device-to-device streaming via WebRTC. No servers',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-3xl mx-auto"
      >
        {/* Logo/Brand */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="mb-8 inline-flex items-center justify-center"
        >
          <div className="relative">
            {/* Animated rings */}
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[--color-accent]"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full border-2 border-[--color-accent-secondary]"
              animate={{
                scale: [1, 1.8, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 0.3,
              }}
            />
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[--color-gradient-start] to-[--color-gradient-mid] flex items-center justify-center glow-cyan">
              <Waves className="w-10 h-10 text-black" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-4"
        >
          <span className="text-gradient">Mesh</span>
          <span className="text-[--color-text-primary]">Beat</span>
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-xl md:text-2xl text-[--color-text-secondary] mb-12 max-w-xl mx-auto"
        >
          Transform every device into a{' '}
          <span className="text-[--color-accent]">synchronized speaker</span>.
          Perfect audio sync across the room.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
        >
          {/* Host Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/host')}
            className={cn(
              'group relative flex items-center gap-3 px-8 py-4 rounded-2xl',
              'text-black font-semibold text-lg',
              'transition-all duration-300'
            )}
            style={{
              background: 'linear-gradient(135deg, var(--color-gradient-start), var(--color-gradient-mid))',
            }}
          >
            <Radio className="w-5 h-5" />
            <span>Host a Room</span>
            <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />

            {/* Glow effect */}
            <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10 blur-xl"
              style={{ background: 'linear-gradient(135deg, var(--color-accent-glow), var(--color-accent-glow-purple))' }} />
          </motion.button>

          {/* Join Button */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/join')}
            className={cn(
              'group flex items-center gap-3 px-8 py-4 rounded-2xl',
              'font-semibold text-lg',
              'bg-[--color-surface] border border-[--color-border]',
              'hover:border-[--color-border-hover] hover:bg-[--color-surface-hover]',
              'transition-all duration-300'
            )}
          >
            <Smartphone className="w-5 h-5 text-[--color-accent]" />
            <span>Join a Room</span>
            <ArrowRight className="w-5 h-5 text-[--color-text-muted] transition-transform group-hover:translate-x-1" />
          </motion.button>
        </motion.div>

        {/* Features */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
              className={cn(
                'group p-6 rounded-2xl',
                'bg-[--color-surface]/50 border border-[--color-border]',
                'hover:border-[--color-border-hover] hover:bg-[--color-surface]',
                'transition-all duration-300'
              )}
            >
              <div className={cn(
                'w-12 h-12 rounded-xl mb-4 flex items-center justify-center',
                'bg-gradient-to-br from-[--color-surface-elevated] to-[--color-surface-hover]',
                'border border-[--color-border] group-hover:border-[--color-accent]/30',
                'transition-all duration-300'
              )}>
                <feature.icon className="w-6 h-6 text-[--color-accent]" />
              </div>
              <h3 className="font-semibold text-[--color-text-primary] mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-[--color-text-muted]">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 0.5 }}
        className="absolute bottom-6 text-center"
      >
        <p className="text-xs text-[--color-text-muted]">
          Built with WebRTC & Tone.js • No data stored on servers
        </p>
      </motion.footer>
    </div>
  );
}
