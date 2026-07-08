---
applies_to: [work:Samsung Research America]
topics: [ambient-ai, on-device, routing, model-selection, agents]
---

## What ambient AI is

I'm building ambient AI, AI that's always on, can handle asynchronous tasks, and processes events that happen in your life without having to explicitly point it to doing something with each new item.

## Why it hasn't happened yet

It's a technical wall. Models can't run always-on on-device efficiently yet to filter out tons of signals, and people don't want to blaze through tokens. We're trying to change that with on-phone signal routing without using cloud model tokens. Recent breakthroughs in local model inferencing make this increasingly possible, which is why ambient AI is now starting to come up.

## Scoping to what the model can actually do

The hard part is having a system that allows the on-device model to exercise its limited intelligence to the best of its ability. Not stuff that's too complex, like decision making or orchestrating, but looking for and extracting clearly defined information is very doable, if scoped correctly. This needs to be something more than simple deterministic or keyword-based operations, and less than a full agent.

## Matching the task to the right model

It isn't justifiable, with the current cost of tokens, whether monetary or GPU usage, to use a fully powered frontier model for everything. Most tasks can get away with a less good, cheaper model. Tightly scoped, simple, repeatable tasks can get away with something tiny. Part of the problem is ensuring that the most intelligent agent only deals with what it needs to, and that's why routing and filtration is extra important for always-on AI.

## What I built

I built the router, the task scopes, and the eval harness. The on-device model is a plug-in from external providers. Since it's local, we don't need to worry about data privacy issues, and it allows us to stay on top of the latest advancements in on-device AI.
