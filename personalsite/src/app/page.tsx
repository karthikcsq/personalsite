'use client';
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';
import HomePageHead from '@/app/components/HomePageHead';

export default function HomePage() {  
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showMenuGuide, setShowMenuGuide] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Check if it's the first visit and show menu guide
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hasSeenMenuGuide');
    
    if (!hasSeenGuide) {
      setShowMenuGuide(true);
      // Hide popup after 30 seconds
      const timer = setTimeout(() => {
        setShowMenuGuide(false);
        localStorage.setItem('hasSeenMenuGuide', 'true');
      }, 30000);
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Auto-scroll to the bottom when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() === "") return;

    // Add user message to chat
    const userMessage = { role: "user", content: input };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // Call our API endpoint
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong");
      }

      // Add AI response to chat
      const aiMessage = { role: "assistant", content: data.answer };
      setMessages((prevMessages) => [...prevMessages, aiMessage]);
    } catch (error) {
      console.error("Error:", error);
      const errorMessage = { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      };
      setMessages((prevMessages) => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler to dismiss popup
  const dismissGuide = () => {
    setShowMenuGuide(false);
    localStorage.setItem('hasSeenMenuGuide', 'true');
  };

  return (
    <>
      <HomePageHead />
      <section className="relative flex flex-col min-h-screen text-white overflow-hidden">
      {/* Background Image */}
      <div
        className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-10"
        style={{ 
          backgroundImage: "url('/sunrise.jpg')",
          backgroundAttachment: "fixed", 
        }}
      ></div>

      {/* Menu Guide Popup */}
      {showMenuGuide && (
        <div 
          className="fixed top-16 right-4 z-50 bg-gray-900/95 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-gray-700 max-w-xs"
          style={{ 
            animation: 'fadeInDown 0.5s ease-out',
            boxShadow: '0 0 15px rgba(255, 255, 255, 0.3)' 
          }}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold pr-8">Welcome!</h3>
            <button 
              onClick={dismissGuide}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-300">
            Click the menu button in the top-right corner to navigate the site.
          </p>
          <div className="mt-3 flex justify-end">
            <div className="w-8 h-8 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
              </svg>
            </div>
          </div>
        </div>
      )}

      <div className="flex-grow p-4 max-w-3xl mx-auto w-full">
        <h1 className="text-4xl font-bold text-white mb-4 text-center mt-20">Hi, I&apos;m Karthik!</h1>
        <h2 className="text-2xl font-semibold text-white mb-6 text-center">Welcome to my digital archive.</h2>
        
        <div className="rounded-lg shadow p-4 h-[70vh] flex flex-col mb-8"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", backdropFilter: "blur(2px)", boxShadow: "0 0 10px rgba(100, 100, 100, 0.6), 0 0 20px rgba(100, 100, 100, 0.4)" }}
        >
          {/* Chat content remains the same... */}
          <div className="flex-grow overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-white text-center mt-20">
                <p>Ask me anything!</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div 
                  key={index} 
                  className={`mb-4 ${
                    message.role === "user" ? "text-right" : "text-left"
                  }`}
                >
                  <div
                    className={`inline-block p-3 mr-3 rounded-lg max-w-[80%] text-white`}
                    style = {{
                      backgroundColor: message.role === "user" ? "rgba(211, 31, 8, 0.6)" : "rgba(8, 8, 8, 0.6)"}}
                  >
                    {message.role === "user" ? (
                      message.content
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
              ))
            )}
            {isLoading && (
              <div className="text-left mb-4">
                <div className="inline-block p-3 rounded-lg max-w-[80%] text-white"
                  style={{ backgroundColor: "rgba(8, 8, 8, 0.6)" }}>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse"></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0.2s" }}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" style={{ animationDelay: "0.4s" }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask something..."
              className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-white bg-black/20 text-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-red-900 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:opacity-50 transition-colors"
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </div>

      {/* Add animation for popup */}
      <style jsx>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
    </>
  );
}