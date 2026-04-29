---
applies_to: [work:Memories.ai]
topics: [computer-vision, video-ai, vlms, long-form-video, retrieval, video-understanding, personal-ai, python, open-source]
---

## pymavi SDK

The SDK was honestly just a wrapper around a shaky API. It required some duct taping, but it was nothing special. It just made it easier to use in development. The work was about retry handling, wrapping API shakiness in the SDK to make it easy for users.

## What the work actually was

I worked with VLMs processing long-form video. We did so much with key frame extraction, dynamic segmentation, CLIP indexing, and recording real signals in video using YOLO and SAM to document high volumes of data.

It's not about just feeding in all the video as if it'll just work. It's more about employing smart strategies to index the data in a way that's easily parseable. That means transcriptions, dynamic sampling, capturing faces and objects, indexing them all together in abstract space, and then querying them effectively.

## Indexing and retrieval

It's separate spaces with a joint layer that embeds higher level representations of similarly clustered extractions together. On the querying side, it was mostly just prompt rewriting and RAG-esque search, with some graph exploration based retrieval. The graph retrieval was literally anything, such as scenes, common objects, named entities, etc.

## Why long context isn't the answer

Gemini handles long video, but not 4–6 hours of it. That's too many frames for any standard VLM to take in directly. Long context isn't the answer yet.

## What it taught me about personal AI

More broadly speaking, it made me realize how much information we as humans process throughout our daily lives, and how far personal AI is from accomplishing the task of successfully indexing everything we do. In an ideal world, I'd be able to meet someone once, and all the structured context from the interaction with that person would be saved forever, including time, scenario, name, any qualitative aspects, etc. Everything I did in a day could be easily queried and analyzed. There is so much that goes on in everyday life, and I think soon we will see a game changing personal AI that is able to tell you anything about your physical life.

## What I'd do differently

The only thing I wish I had done differently is to continue working with the company. I got busy with school and couldn't sustain good development work on a part time schedule.
