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

      <div className="flex flex-col h-screen w-full max-w-3xl mx-auto px-4">
        {/* Header - fades out when chat starts */}
        <div
          className={`flex flex-col items-center justify-center transition-all duration-700 ease-in-out ${
            messages.length === 0 ? 'flex-grow' : 'flex-shrink-0 h-0 opacity-0 overflow-hidden'
          }`}
        >
          <h1 className="text-4xl font-bold text-white mb-4 text-center">Hi, I&apos;m Karthik!</h1>
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">Welcome to my digital archive.</h2>
        </div>

        {/* Messages container - grows to full height when chat starts */}
        <div
          className={`flex-grow overflow-y-auto mb-4 transition-all duration-700 ease-in-out custom-scrollbar ${
            messages.length === 0 ? 'opacity-0 h-0' : 'opacity-100'
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
          {isLoading && (
            <div className="text-left mb-4 animate-fadeIn">
              <div className="inline-block p-3 rounded-lg max-w-[80%] text-white"
                style={{ backgroundColor: "rgba(8, 8, 8, 0.6)", backdropFilter: "blur(4px)" }}>
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

        {/* Input bar - always at bottom */}
        <form
          onSubmit={handleSubmit}
          className={`flex gap-2 pb-6 transition-all duration-700 ease-in-out ${
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