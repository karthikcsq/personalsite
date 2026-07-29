---
applies_to: [work:Samsung Research America]
topics: [ambient-ai, on-device, routing, model-selection, agents, xr, orchestration, sdk, platform, permissions, trust, voice, safety]
---

# Project one: on-device signal router for ambient AI

## What ambient AI is

I'm building ambient AI, AI that's always on, can handle asynchronous tasks, and processes events that happen in your life without having to explicitly point it to doing something with each new item.

## Why it hasn't happened yet

It's a technical wall. Models can't run always-on on-device efficiently yet to filter out tons of signals, and people don't want to blaze through tokens. We're trying to change that with on-phone signal routing without using cloud model tokens. Recent breakthroughs in local model inferencing make this increasingly possible, which is why ambient AI is now starting to come up.

## Scoping to what the model can actually do

The hard part is having a system that allows the on-device model to exercise its limited intelligence to the best of its ability. Not stuff that's too complex, like decision making or orchestrating, but looking for and extracting clearly defined information is very doable, if scoped correctly. This needs to be something more than simple deterministic or keyword-based operations, and less than a full agent.

## Matching the task to the right model

It isn't justifiable, with the current cost of tokens, whether monetary or GPU usage, to use a fully powered frontier model for everything. Most tasks can get away with a less good, cheaper model. Tightly scoped, simple, repeatable tasks can get away with something tiny. Part of the problem is ensuring that the most intelligent agent only deals with what it needs to, and that's why routing and filtration is extra important for always-on AI.

## What I built on the signal router

I built the router, the task scopes, and the eval harness. The on-device model is a plug-in from external providers. Since it's local, we don't need to worry about data privacy issues, and it allows us to stay on top of the latest advancements in on-device AI.

## Why ambient needs approval somewhere in the chain

At some point you need to know what to look out for. Otherwise, just trying to act on everything that comes to you as an ambient agent is completely out of left field. While I think that AI agents can do that, I don't think user trust is there at the level at which a proactive agent or an ambient agent can just operate on your behalf for most people, without some sort of explicit approval at some point in the chain. Whether it's an initial approval by saying, "Do XYZ when this happens," or if it's later down in the chain after that action is about to be taken, requesting explicit approval before you can continue.

## What ambient AI is actually good for

It's a general adoption thing. I think people need to figure out what the actual use cases are in which ambience and proactivity can be useful and then also trusted.

One of the things that I foresee being a big deal is an ambient note taker that observes everything you're listening to. While maintaining complete security and privacy, it is able to learn from what you want to remember throughout your day and store it long term. Throughout all your conversations, it remembers the important stuff.

But just generally speaking about all notifications and responding to them autonomously, I don't think that will be the majority use case unless having an AI agent there is genuinely beneficial. For example, business emails may be something that's valuable. Personal texts and replies really need you to be involved as a human being. Ambient AI applied to that is more of a duct tape solution to something that could probably be taken in a different way, and people will probably not trust it on the mass market for a while.

# Project two: general agent orchestrator

## The orchestrator, and why it's general

This project is helping build Samsung's own agent orchestrator, starting with use in XR glasses. It's generalizable. This orchestrator will be usable by glasses, phone, and any smart device or developer that wants to build on top of it.

Everyone developing agents needs a good orchestration layer. Just building it for one application isn't enough. As more and more teams want to build intelligent use cases, the demand for something that can easily be built on goes up. That's why starting out with that interface now reduces future work.

## What makes orchestration hard

Orchestration needs sandboxing, permissions, and security, especially for consumer-grade applications that touch everything, not just a codebase.

## Exposing capability without flooding context

The other hard part is to figure out how to show the agent everything it can do without overfilling context constantly. You can't just dump everything into context. You can use creative approaches like discovery, or categories with subcategories (like a tree). Anyone who puts effort into solving this can find plenty of good solutions, and many do. It's just equally important to highlight that it's necessary.

## My piece of the orchestrator

My specific piece is building out the SDK for any developer to register tools, skills, and A2UI. I'm also helping rewrite a number of prototypes into a single unified orchestrator that takes the best from all of them.

## Driving the phone directly

An agent that can navigate the phone UI can access anything you can on your phone. This means that even if something isn't hardwired into a tool, the agent can find a way to get it done. The hardest part is security. We thoroughly gate so many actions on so many apps to ensure that the agent cannot cause undue harm. There's something similar for web search too. We put a lot of time into evaluating whether or not a website is safe to access.

## Designing for glasses

There's a lot of interesting things that come up when you work with XR glasses. The main one is that you have to ensure that the voice interaction is seamless and that the stuff shown to the user is relevant and direct. Explaining every step of the process is not good for a voice system.

## What the user actually needs to see

Permissions and task completions are essential. The average user doesn't need to see the entire chain of thought of the model. More and more AI chat products are moving towards this anyway right now.

## When to ask permission

Asking too often is often a lot worse, which is why we spend a lot of time trying to categorize exactly what the difficulty and worst-case scenario of everything is. If something is unsafe and irreversible, then yes, that requires questioning. But for things that are already instructed by the user explicitly, and where there's a pretty clear mapping as to what the output should be, approval may not be needed. For example, "reply to the text" is a very clear indication of approval. There's not much drift that can go on there.

It's all about scoping how much difference there is between the user intent and what the model could possibly do, as well as the reversibility of the action.

## Consumer permissions versus coding-agent permissions

Building permission systems for consumer use is completely different from building permission systems for coding agents. We have good documentation on how dangerous commands are, and it's fairly easy to train classifiers on them. Permission systems for your average consumer depend on their preferences, and need to learn from them over time. For now, we err on the side of caution and only act with approval.
