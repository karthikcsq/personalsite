'use client';
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import HomePageHead from '@/app/components/HomePageHead';

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

  // Particle system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Initialize particles
    const particleCount = 80;
    const particles: Particle[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 2.5 + 1.5
      });
    }

    // Animation loop
    let animationId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle, i) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Bounce off edges
        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

        // Draw particle
        ctx.fillStyle = 'rgba(239, 68, 68, 0.6)';
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connections
        particles.slice(i + 1).forEach(otherParticle => {
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            ctx.strokeStyle = `rgba(239, 68, 68, ${0.4 * (1 - distance / 200)})`;
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(otherParticle.x, otherParticle.y);
            ctx.stroke();
          }
        });
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
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
          message: input, // Keep for backward compatibility
          messages: updatedMessages // Send full conversation history
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
                // Skip malformed JSON
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
      <section className="relative flex flex-col min-h-screen text-white overflow-hidden bg-gradient-to-br from-gray-950 via-black to-gray-950">
      {/* Particle Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />

      {/* Subtle grid pattern */}
      <div className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: '50px 50px',
          zIndex: 0
        }}
      />

      <div className={`flex flex-col h-screen w-full max-w-3xl mx-auto px-4 transition-all duration-1000 ease-out relative ${
        messages.length === 0 ? 'justify-center' : 'justify-start'
      }`} style={{ zIndex: 10 }}>
        {/* Header - fades out when chat starts */}
        <div
          className={`flex flex-col items-center transition-all duration-1000 ease-out ${
            messages.length === 0 ? 'mb-8 opacity-100 scale-100' : 'h-0 mb-0 opacity-0 scale-95 overflow-hidden'
          }`}
        >
          <h1 className="text-4xl font-bold text-white mb-4 text-center transition-all duration-1000 ease-out">Hi, I&apos;m Karthik!</h1>
          <h2 className="text-2xl font-semibold text-white mb-6 text-center transition-all duration-1000 ease-out">Welcome to my digital archive.</h2>

          {/* Read About Me Button */}
          <a
            href="/about"
            className="group relative overflow-hidden px-6 py-3 mb-4 bg-white/5 border border-white/20 hover:border-red-500/50 backdrop-blur-sm transition-all duration-300 hover:scale-105"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/10 to-red-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <span className="font-quicksand text-sm font-light text-white/80 group-hover:text-white transition-colors">Read About Me</span>
              <svg className="w-4 h-4 text-white/60 group-hover:text-red-400 group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </a>
        </div>

        {/* Messages container - grows to full height when chat starts */}
        <div
          className={`flex-grow overflow-y-auto mb-4 transition-all duration-1000 ease-out custom-scrollbar ${
            messages.length === 0 ? 'hidden' : 'opacity-100'
          }`}
          style={{
            paddingTop: messages.length > 0 ? '2rem' : '0',
            paddingBottom: '1rem'
          }}
        >
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-4 animate-fadeIn ${
                message.role === "user" ? "text-right" : "text-left"
              }`}
            >
              <div
                className={`inline-block p-3 rounded-lg max-w-[80%] text-white shadow-lg`}
                style={{
                  backgroundColor: message.role === "user" ? "rgba(211, 31, 8, 0.6)" : "rgba(8, 8, 8, 0.6)",
                  backdropFilter: "blur(4px)"
                }}
              >
                {message.role === "user" ? (
                  message.content
                ) : message.content === "" ? (
                  // Show loading indicator for empty assistant messages
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                ) : (
                  <ReactMarkdown
                    components={{
                      a: ({...props}) => (
                        <a {...props} className="text-blue-300 hover:text-blue-200 underline" target="_blank" rel="noopener noreferrer" />
                      ),
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      code: ({inline, ...props}: any) => {
                        return inline ?
                          <code {...props} className="bg-gray-800 px-1 py-0.5 rounded text-sm" /> :
                          <code {...props} className="block bg-gray-800 p-2 rounded-md text-sm overflow-x-auto" />
                      },
                      ul: ({...props}) => (
                        <ul {...props} className="list-disc pl-6 mt-2" />
                      ),
                      ol: ({...props}) => (
                        <ol {...props} className="list-decimal pl-6 mt-2" />
                      ),
                      h1: ({...props}) => (
                        <h1 {...props} className="text-xl font-bold mt-3 mb-2" />
                      ),
                      h2: ({...props}) => (
                        <h2 {...props} className="text-lg font-bold mt-3 mb-1" />
                      ),
                      p: ({...props}) => (
                        <p {...props} className="my-2 prose prose-invert max-w-none" />
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

        {/* Input bar - always at bottom */}
        <form
          onSubmit={handleSubmit}
          className={`flex gap-2 pb-6 transition-all duration-1000 ease-out ${
            messages.length === 0 ? '' : 'sticky bottom-0'
          }`}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask me anything..."
            className="flex-grow p-3 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-white/50 bg-black/30 text-white placeholder-gray-400 backdrop-blur-sm transition-all"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="bg-red-900/80 text-white px-6 py-3 rounded-xl hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:opacity-50 transition-all backdrop-blur-sm"
            disabled={isLoading || !input.trim()}
          >
            Send
          </button>
        </form>
      </div>

      {/* Add animations and custom scrollbar */}
      <style jsx global>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out;
        }

        /* Custom scrollbar styles */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }

        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 3px;
          transition: background 0.2s ease;
        }

        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.4);
        }

        /* Firefox scrollbar */
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
        }
      `}</style>
    </section>
    </>
  );
}