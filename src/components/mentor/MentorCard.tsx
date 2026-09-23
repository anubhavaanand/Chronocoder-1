"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useState, useRef } from "react";

interface MentorCardProps {
  id: string;
  name: string;
  era: string;
  icon: string;
  greeting: string;
  accentColor: string;
  expertise?: string;
}

export function MentorCard({ 
  id, 
  name, 
  era, 
  icon, 
  greeting,
  accentColor,
  expertise
}: MentorCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // Stagger animation delay based on index (simulated)
  const staggerDelay = Math.random() * 0.2;
  
  return (
    <Link href={`/workspace/${id}`}>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: staggerDelay }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative"
      >
        {/* Card Container */}
        <div
          className="relative h-full glass-effect rounded-xl overflow-hidden cursor-pointer border border-transparent hover:border-accent-cyan/50 transition-all duration-300"
          style={{
            boxShadow: isHovered 
              ? `0 8px 32px rgba(0, 243, 255, 0.15)` 
              : '0 4px 16px rgba(0, 0, 0, 0.3)'
          }}
        >
          {/* Banner Gradient Overlay */}
          <div 
            className="absolute inset-0 opacity-20 group-hover:opacity-30 transition-opacity duration-300"
            style={{ 
              background: `linear-gradient(135deg, ${accentColor} 0%, transparent 100%)`
            }}
          />
          
          {/* Scanline Effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300">
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNCIgaGVpZ2h0PSI0IiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSIxIiBmaWxsPSJyZ2JhKDI1NSwgMjU1LCAyNTUsIDAuMSkiLz4KPC9zdmc+')] bg-repeat-x" />
          </div>
          
          {/* Content Container */}
          <div className="relative z-10 p-6 h-full flex flex-col">
            {/* Icon with Glow Effect */}
            <motion.div
              className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300"
              whileHover={{ scale: 1.1, rotate: 5 }}
              style={{ textShadow: `0 0 20px ${accentColor}40` }}
            >
              {icon}
            </motion.div>
            
            {/* Name & Era */}
            <h3 className="text-xl font-bold text-white mb-1 group-hover:text-accent-cyan transition-colors">
              {name}
            </h3>
            
            <p className="text-xs font-mono text-gray-400 mb-3 uppercase tracking-wider">
              {era}
            </p>
            
            {/* Expertise (if available) */}
            {expertise && (
              <p className="text-xs text-accent-cyan mb-3 font-medium">
                {expertise}
              </p>
            )}
            
            {/* Greeting Quote */}
            <p className="text-sm text-gray-300 italic line-clamp-2 mb-auto leading-relaxed">
              "{greeting}"
            </p>
            
            {/* Decorative Corner Accent */}
            <div 
              className="absolute bottom-0 right-0 w-16 h-16 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `radial-gradient(circle at bottom right, ${accentColor}30 0%, transparent 70%)`
              }}
            />
          </div>
          
          {/* Hover Button */}
          <motion.div
            className="absolute bottom-0 left-0 right-0 p-4 bg-retro-darker/90 backdrop-blur-sm border-t border-retro-border translate-y-full group-hover:translate-y-0 transition-transform duration-300"
            initial={false}
            animate={isHovered ? { y: 0 } : { y: "100%" }}
          >
            <button className="w-full py-2 bg-gradient-primary text-white font-semibold text-sm rounded-lg hover:shadow-neon transition-shadow">
              Select Mentor
            </button>
          </motion.div>
        </div>
        
        {/* Ripple Effect Background */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl -z-10">
          <motion.div
            className="absolute -inset-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0, 0.1, 0],
            }}
            transition={{
              duration: 0.6,
              ease: "easeOut",
              repeat: 0,
            }}
            style={{
              background: `radial-gradient(circle, ${accentColor} 0%, transparent 70%)`,
            }}
          />
        </div>
      </motion.div>
    </Link>
  );
}
