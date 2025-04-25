'use client';
import { useState, useRef, useEffect } from "react";
import ReactMarkdown from 'react-markdown';

export default function HomePage() {  
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  return (
    <div className="flex flex-col min-h-screen">
        {/* Background Image */}
        <div
          className="absolute top-0 left-0 w-full h-full bg-cover bg-center -z-10"
          style={{ 
            backgroundImage: "url('/sunrise.jpg')",
            backgroundAttachment: "fixed", 
          }}
        ></div>
      <main className="flex-grow p-4 max-w-3xl mx-auto w-full mt-30 items-center justify-center">
        <div className="rounded-lg shadow p-4 h-[70vh] flex flex-col"
            style={{ backgroundColor: "rgba(0, 0, 0, 0.3)", boxShadow: "0 0 10px rgba(100, 100, 100, 0.6), 0 0 20px rgba(100, 100, 100, 0.4)" }}
        >
          <div className="flex-grow overflow-y-auto mb-4">
            {messages.length === 0 ? (
              <div className="text-white text-center mt-20">
                <p>Hi! My name is Karthik. Feel free to explore my site, or ask me anything about my projects and knowledge base!</p>
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
                        code: ({inline, ...props}: any) => { // Removed 'node' and 'className'
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
              className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-white"
              disabled={isLoading}
            />
            <button
              type="submit"
              className="bg-red-900 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-700 disabled:opacity-50"
              disabled={isLoading || !input.trim()}
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}