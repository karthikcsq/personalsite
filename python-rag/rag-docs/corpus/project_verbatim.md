---
applies_to: [project:verbatim]
topics: [video, translation, lip-sync, hackathon, boilermake, ai-apis, product-discovery, parallelization]
---

## Origin and what it does

We built Verbatim at BoilerMake — a video understanding platform that goes beyond simple transcription. We didn't win, but our frustration turned into determination, and we took our hackathon project further. Verbatim translates speech in videos into 20+ languages, summarizes content for quick insights, creates a digital clone that lip-syncs perfectly in the target language in the original speaker's voice, and uses memory-level video embeddings for real-time Q&A and topic search. The team was Pranav Neti, Sonny Chen, and Cindy Yang, who also coined the name.

## Why we built it

Our goal was to fix dubbing, because too often, people who speak different languages hear dubs that don't match the tone or lip movement of the speaker. It creates an uncanny, unpleasant experience for viewers.

## Why we kept going past the hackathon, and why it died

We wanted to see if we could take it further. We got pretty far in our work, but we quickly realized that the use case for international creators already existed on a large scale at production grade. We couldn't figure out a differentiator, and so the idea died out shortly thereafter.

## What I'd do differently

The biggest thing that didn't work out well was that we didn't look for a real use case before building out the platform. We didn't clearly articulate the benefit to the customer (which may be why we didn't win) and also didn't realize that there was already a production grade product that existed on the market.

The rule now, before I start building anything: Who needs this? What problem does it solve? What already exists that is solving this problem?

## The technical bet I'd defend

Something incredible that we did was to parallelize the voice cloning and translation, followed by splitting the video into segments and performing lip sync on all segments with the translated speech in parallel, before combining them at the end. It reduced wait times by a TON, and since it was server side, the user wasn't affected by low latency.
