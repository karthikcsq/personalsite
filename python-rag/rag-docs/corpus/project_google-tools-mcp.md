---
applies_to: [project:google-tools-mcp]
topics: [mcp, google-workspace, open-source, agents, auth, developer-tools]
---
## Why it exists

I got tired of the same problem everyone hits: you want your AI agent to touch Google Workspace, and suddenly you're wiring up 4-5 separate MCP servers, each with their own auth flow, their own config, their own quirks. Half of them only cover Drive. Maybe one does Gmail. Good luck getting Sheets and Slides in the same session. So I built google-tools-mcp. One server. One OAuth flow. Drive, Docs, Sheets, Slides, Gmail, Calendar, Forms: 169 tools, all available the moment it starts.

## What it does

My three favorite features: Auto re-auth on everything. Token expired mid-session? Handled. Added Slides and the OAuth scopes changed? Handled. You never see "please run logout and re-authenticate" again. It reads PDFs and Word docs straight from Drive, with no conversion step and no extra tools. Your agent pulls the content and keeps moving. And read-before-edit guards: your agent can't blindly overwrite a Drive file. It reads first. When it tries to edit a phrase that appears three times in a Doc, it lists all matches instead of silently picking the wrong one.

The result is an agent that can actually orchestrate across your whole workspace. It can read a PDF from Drive, summarize it into a Doc, pull data from a Sheet into a Slides deck, and email the whole thing to your team. One context. One server. No telemetry. Multi-account profiles. Service account support for team automation. MIT licensed.

## MCP discovery problem

MCP is context injection. That's the whole thing. You give a model tool definitions, endpoints, and schemas so it knows what to call and how to call it. So why am I manually installing servers, configuring JSON files, and wiring up auth before I can use a single tool? I should be able to search for a tool, or navigate to a site that exposes one, and the model reads the MCP endpoint, injects the context, and I start working. The protocol already standardizes the interface. Discovery and dynamic loading should be a natural extension of that. The model already understands tool schemas at runtime; let it discover them at runtime too.

Right now there's way too much friction between "this tool exists" and "I can actually use it in a conversation." Every MCP server I've set up has felt like installing software from 2009 when the actual interaction model is closer to visiting a URL.

## How it grew

I just wanted to read Google Docs easily. Claude only supported writing Word documents natively, which I'd then have to upload to Drive. I wanted it to be native and fast, so I made it work with Docs. Then I added Sheets, to be able to manage all the data I had in my Drive. Then I wanted to respond to emails from Claude Code, so Gmail came next. Calendar came shortly after. Now I have a massive suite of tools to manage everything I have in Google.

Most of the additions came from my own needs: triaging my inbox, responding to people with my availability, setting up calendar events. But a few came from users. I don't use Google Tasks myself, but one of my users requested it, and shortly after I added five new tools for it.

I act on everything I can feasibly do. Nothing a user requests is ever so outlandish that it's wrong, and the cost of developing it is so small. That's a general perspective, especially with the rise in AI coding. As software development becomes cheaper, it becomes more important to take user priorities seriously and act on as many as possible. Of course bloating and design fragmentation are real issues, but that's a job on the engineer's part, not the user's part. The user needs to have their task accomplished. The engineer's and designer's job is to make that work while maintaining seamless use.

## What I got wrong

Most of what I got wrong, I've fixed. One of the biggest issues was that I didn't have lazy authentication. Users had to run a manual auth command before doing anything. I replaced that with lazy auth: a permissions page that boots on first tool load. I've also worked hard to make onboarding as easy as possible, including a single setup command that walks people through all the sites they have to visit to configure the APIs in Google Console. If I could eliminate having to manually set up credentials in GCP at all, that would make it even easier. I just haven't figured out how to get that done yet.

## Who's actually using it

Only a few people right now. The biggest challenge is that not many people use AI agents in a filesystem context like Claude Code or Codex, especially for non-coding tasks. Most people gravitate toward the web versions or desktop apps, and that makes MCP integration difficult the way it currently works. For this to go mainstream, there needs to be a fundamental way to make MCP and external connections easier to configure. When that becomes easy, adoption will follow.

## How I'd describe it

I help you manage everything in your Google workspace with AI.

## The broader problem: agent-callable services

My agent still can't book me a table at a restaurant. Not really, anyway. Right now there are two paths and both are bad. Option one: somebody builds a custom integration, an MCP server for OpenTable, a Resy plugin, a Yelp connector. Now I can book a reservation, but only on platforms that someone decided to build a wrapper for. Every new service needs a new integration, maintained by someone, and the coverage is always going to be incomplete. Option two: browser automation. The agent opens a headless browser, navigates to the restaurant's website, takes screenshots, injects JavaScript, clicks buttons, and fills out forms pretending to be a human. It works sometimes. It's slow, brittle, and falls apart the second a site changes its layout or throws a CAPTCHA.

Both of these exist because the actual business on the other end doesn't expose a simple callable action. That's the missing piece. The restaurant should have a lightweight endpoint that says: here's how you book a table, here are the parameters, call it. Not an entire API platform. Not a developer partnership. A thin, standardized tool definition that any agent can discover and call. We already have the protocol for this. MCP defines exactly how to describe a tool so a model can use it. What we don't have is adoption on the business side. The internet was built for humans navigating pages. Agent interaction with the real world deserves a native interface, and we have the protocol to build one.
