import { motion } from "motion/react";

export function ObsidianCore() {
  return (
    <div className="relative w-32 h-32">
      {/* Outer electric blue glow ring */}
      <motion.div
        className="absolute inset-0 rounded-full opacity-30 blur-2xl"
        style={{
          background: "radial-gradient(circle, rgba(59, 130, 246, 0.6) 0%, rgba(37, 99, 235, 0.3) 50%, transparent 100%)"
        }}
        animate={{
          scale: [1, 1.3, 1],
          opacity: [0.3, 0.6, 0.3],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Middle rotating ring with cyber effect */}
      <motion.div
        className="absolute inset-4 rounded-full border-2"
        style={{
          borderColor: "rgba(59, 130, 246, 0.4)",
          boxShadow: "0 0 20px rgba(59, 130, 246, 0.3)"
        }}
        animate={{
          rotate: 360,
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      >
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full"
          style={{
            background: "linear-gradient(135deg, #60A5FA, #3B82F6)",
            boxShadow: "0 0 15px rgba(59, 130, 246, 0.8)"
          }}
        />
        <div 
          className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full"
          style={{
            background: "rgba(59, 130, 246, 0.6)",
            boxShadow: "0 0 10px rgba(59, 130, 246, 0.5)"
          }}
        />
      </motion.div>
      
      {/* Core crystal - Electric blue gradient */}
      <motion.div
        className="absolute inset-8 rounded-full"
        style={{
          background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 50%, #1D4ED8 100%)"
        }}
        animate={{
          boxShadow: [
            "0 0 30px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.2)",
            "0 0 50px rgba(59, 130, 246, 0.7), inset 0 0 30px rgba(59, 130, 246, 0.4)",
            "0 0 30px rgba(59, 130, 246, 0.4), inset 0 0 20px rgba(59, 130, 246, 0.2)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Inner highlight - Bright electric blue reflection */}
      <div 
        className="absolute inset-10 rounded-full opacity-70"
        style={{
          background: "linear-gradient(135deg, #60A5FA 0%, transparent 60%)"
        }}
      />
      
      {/* Cyber shimmer overlay */}
      <motion.div
        className="absolute inset-8 rounded-full"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(96, 165, 250, 0.6) 50%, transparent 100%)"
        }}
        animate={{
          rotate: [0, 360],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      {/* Particle effects around core */}
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full"
          style={{
            background: "#60A5FA",
            boxShadow: "0 0 6px rgba(59, 130, 246, 0.8)",
            left: "50%",
            top: "50%",
            marginLeft: "-2px",
            marginTop: "-2px",
          }}
          animate={{
            x: [0, Math.cos((i / 8) * Math.PI * 2) * 50],
            y: [0, Math.sin((i / 8) * Math.PI * 2) * 50],
            opacity: [0, 1, 0],
            scale: [0, 1, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.25,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}
