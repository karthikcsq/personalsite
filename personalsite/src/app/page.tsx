'use client';
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import HomePageHead from '@/app/components/HomePageHead';
import { Send, ArrowRight } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
}

export default function HomePage() {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-scroll to the bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Optimized particle system with reduced particle count and better performance
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    if (!ctx) return;

    // Use device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1;
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    resize();

    let resizeTimeout: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resize, 100);
    };
    window.addEventListener('resize', handleResize);

    // Increased particle count for futuristic effect
    const particleCount = Math.min(100, Math.floor(window.innerWidth / 15));
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.6, // Moderate speed
        vy: (Math.random() - 0.5) * 0.6, // Moderate speed
        size: Math.random() * 2 + 1
      });
    }

    // Optimized animation loop with requestAnimationFrame throttling
    let animationId: number;
    let lastTime = 0;
    const fps = 60;
    const interval = 1000 / fps;

    const animate = (currentTime: number) => {
      animationId = requestAnimationFrame(animate);

      const deltaTime = currentTime - lastTime;
      if (deltaTime < interval) return;
      lastTime = currentTime - (deltaTime % interval);

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Batch drawing operations with dark blue color
      ctx.fillStyle = 'rgba(59, 130, 246, 0.7)'; // Blue-500 with opacity
      particles.forEach((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > window.innerWidth) particle.vx *= -1;
        if (particle.y < 0 || particle.y > window.innerHeight) particle.vy *= -1;

        // Draw particle
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw connections (optimized to only check nearby particles)
      const connectionDistance = 200;
      for (let i = 0; i < particles.length; i++) {
        const particle = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const other = particles[j];
          const dx = particle.x - other.x;
          const dy = particle.y - other.y;

          // Quick distance check before sqrt
          const distSq = dx * dx + dy * dy;
          if (distSq < connectionDistance * connectionDistance) {
            const distance = Math.sqrt(distSq);
            ctx.strokeStyle = `rgba(59, 130, 246, ${0.5 * (1 - distance / connectionDistance)})`; // Blue connections
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        }
      }
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
      cancelAnimationFrame(animationId);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === "") return;

    // Add user message to chat
    const userMessage = { role: "user", content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    // Add a placeholder for the streaming response
    const assistantMessageIndex = messages.length + 1;
    setMessages((prevMessages) => [...prevMessages, { role: "assistant", content: "" }]);

    try {
      // Build conversation history including the new user message
      const updatedMessages = [...messages, userMessage];

      // Call our API endpoint with full conversation history
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          messages: updatedMessages
        }),
      });

      if (!response.ok) {
        throw new Error("Something went wrong");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                break;
              }
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  accumulatedContent += parsed.content;
                  // Update the assistant message with accumulated content
                  setMessages((prevMessages) => {
                    const newMessages = [...prevMessages];
                    newMessages[assistantMessageIndex] = {
                      role: "assistant",
                      content: accumulatedContent
                    };
                    return newMessages;
                  });
                }
              } catch (e) {
                console.error("Error parsing chunk:", e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prevMessages) => {
        const newMessages = [...prevMessages];
        newMessages[assistantMessageIndex] = {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again."
        };
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <HomePageHead />
      <section className="relative flex flex-col min-h-screen text-premium-100 overflow-hidden bg-gradient-to-br from-gray-950 via-blue-950 to-gray-950">
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Refined grid pattern */}
      <div className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px',
          zIndex: 0
        }}
      />

      <div className={`flex flex-col h-screen w-full max-w-4xl mx-auto px-6 md:px-8 transition-all duration-700 ease-out relative ${
        messages.length === 0 ? 'justify-center' : 'justify-start'
      }`} style={{ zIndex: 10 }}>
        {/* Header - fades out when chat starts */}
        <div
          className={`flex flex-col items-center transition-all duration-700 ease-out ${
            messages.length === 0 ? 'mb-12 opacity-100 scale-100' : 'h-0 mb-0 opacity-0 scale-95 overflow-hidden'
          }`}
        >
          <h1 className="text-5xl md:text-6xl font-light font-quicksand text-premium-50 mb-4 text-center tracking-tight">
            Hi, I&apos;m Karthik
          </h1>
          <h2 className="text-xl md:text-2xl font-light font-quicksand text-premium-300 mb-10 text-center max-w-2xl">
            Welcome to my digital archive
          </h2>

          {/* Premium CTA Button */}
          <a
            href="/about"
            className="group relative overflow-hidden px-8 py-4 bg-premium-800/40 border border-premium-700/40 backdrop-blur-sm rounded-xl transition-all duration-300 hover:bg-premium-800/60 hover:border-accent-600/40 hover:scale-105 shadow-premium-lg"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-accent-600/0 via-accent-600/10 to-accent-600/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-3">
              <span className="font-quicksand text-sm font-medium text-premium-100 tracking-wide">Read About Me</span>
              <ArrowRight className="w-4 h-4 text-accent-500 group-hover:translate-x-1 transition-transform duration-300" />
            </div>
          </a>
        </div>

        {/* Messages container with fade mask */}
        <div
          className={`relative flex-grow overflow-y-auto mb-6 transition-all duration-700 ease-out premium-scrollbar ${
            messages.length === 0 ? 'hidden' : 'opacity-100'
          }`}
          style={{
            paddingTop: messages.length > 0 ? '3rem' : '0',
            paddingBottom: '1rem',
            WebkitMaskImage: messages.length > 0 ? 'linear-gradient(to bottom, transparent 0%, black 40px)' : 'none',
            maskImage: messages.length > 0 ? 'linear-gradient(to bottom, transparent 0%, black 40px)' : 'none'
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-6 animate-fade-in ${
                message.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block px-6 py-4 rounded-2xl max-w-[85%] shadow-premium-md backdrop-blur-sm border ${
                  message.role === "user"
                    ? "bg-accent-600/20 border-accent-600/30 text-premium-50"
                    : "bg-premium-800/40 border-premium-700/30 text-premium-100"
                }`}
              >
                {message.role === "user" ? (
                  <span className="font-quicksand font-normal">{message.content}</span>
                ) : message.content === "" ? (
                  // Loading indicator with blue theme
                  <div className="flex items-center space-x-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                ) : (
                  <ReactMarkdown
                    components={{
                      a: ({...props}) => (
                        <a {...props} className="text-accent-400 hover:text-accent-300 underline transition-colors" target="_blank" rel="noopener noreferrer" />
                      ),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      code: ({inline, ...props}: any) => {
                        return inline ?
                          <code {...props} className="bg-premium-950/60 px-2 py-1 rounded text-sm font-mono text-accent-400" /> :
                          <code {...props} className="block bg-premium-950/60 p-4 rounded-lg text-sm font-mono overflow-x-auto border border-premium-700/30" />
                      },
                      ul: ({...props}) => (
                        <ul {...props} className="list-disc pl-6 mt-3 space-y-1" />
                      ),
                      ol: ({...props}) => (
                        <ol {...props} className="list-decimal pl-6 mt-3 space-y-1" />
                      ),
                      h1: ({...props}) => (
                        <h1 {...props} className="text-2xl font-semibold mt-4 mb-3 text-premium-50" />
                      ),
                      h2: ({...props}) => (
                        <h2 {...props} className="text-xl font-semibold mt-4 mb-2 text-premium-50" />
                      ),
                      p: ({...props}) => (
                        <p {...props} className="my-2 leading-relaxed font-quicksand" />
                      ),
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Premium Input bar */}
        <form
          onSubmit={handleSubmit}
          className={`flex gap-3 pb-8 transition-all duration-700 ease-out ${
            messages.length === 0 ? '' : 'sticky bottom-0'
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-grow px-6 py-4 border border-premium-700/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent-600/50 focus:border-accent-600/50 bg-premium-900/40 text-premium-100 placeholder-premium-400 backdrop-blur-sm transition-all font-quicksand shadow-premium-md"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-accent-600 text-premium-950 px-6 py-4 rounded-xl hover:bg-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all backdrop-blur-sm font-quicksand font-medium flex items-center gap-2 shadow-premium-md hover:scale-105"
            disabled={isLoading || !input.trim()}
          >
            <span className="hidden sm:inline">Send</span>
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

      {/* Hide scrollbar */}
      <style jsx global>{`
        .premium-scrollbar::-webkit-scrollbar {
          display: none;
        }

        /* Firefox scrollbar */
        .premium-scrollbar {
          scrollbar-width: none;
        }
      `}</style>
    </section>
    </>
  );
}
