---
applies_to: [work:Naval Research Laboratory]
topics: [underwater acoustics, image-to-image translation, RAG, LangChain, context optimization, local models, classified environments]
---

## The image-to-image insight

This was the first time I did ML research at a job, and it was incredible seeing a problem that required deep technical ML work. The problem was reconstructing transmission loss graphs from a sound speed profile of underwater acoustics. It was a novel approach because it used image-to-image translation models to replace physics simulators. Nowhere before had I seen such an interdisciplinary application of machine learning. Completely unrelated disciplines you would never imagine connecting, yet it found an application and actually showed improvement in computational complexity over the difficult and slow physics simulators.

The biggest insight came from my technical lead: you could represent information about the acoustic space as colors in an RGB dimension, and the space itself as a two-dimensional image around the instrument. That's what made the whole thing work.

What I took away from watching that kind of thinking is that the best researchers are able to abstract away a problem, treating data and vectors as just numbers being mapped to each other, not images, not sound data. At their core, they're all just signals, and they can be mapped to each other and used in conjunction. It's very rare that someone transfers a whole architecture from one domain to another. Architectures travel between fields when you find the right representation. Acoustic data became a 2D RGB image, and an image-to-image translation model could do the work of a physics simulator.

## Building RAG before RAG was mainstream

My work at NRL also included building a LangChain RAG system for classified document retrieval, and the timing mattered: LangChain had come out probably a few months before my internship started. I was using it at its very inception to build out RAG systems with vector databases and chunking strategies, before any of that became mainstream, before knowledge graphs and large context windows existed. The models available back then were quite bad. We were using LLaMA 2, which performed poorly, but it still taught me a lot about how those models work at their core.

What that primitive tooling forced me to understand is the importance of context optimization. With "unlimited" token budgets now, people do basically whatever they want with as much context as possible. There are tradeoffs. It's hard to deterministically say what needs to be included in context and what doesn't, but there is real value in optimizing context injection. We experience Jevons paradox: as models get better and context windows grow, people inject more and more. When you disregard optimization, it becomes impossible to filter unnecessary information, and you leave that filtering in the hands of a nondeterministic model.

## The classified hardware constraint

Building inside a classified environment meant we couldn't use any APIs. None of the state-of-the-art models at the time were usable, and open source simply wasn't there yet. The GPUs we had were slow, so output was slow and low quality. It was a real constraint.

What that experience tells me about the future: the gap between what you can run locally and what the APIs give you is closing as models become easier to run locally. Eventually, the hope is that frontier-level intelligence will be able to perform on machines in every office. Every developer would have their own local model. And a lack of surveillance by third parties actually improves security rather than hurting it, especially for high-stakes classified environments. The counterargument is real — democratizing frontier models locally makes it risky because bad actors could take advantage without regulation or oversight. But more freedom also means more innovation, and intelligence on demand becomes a lot cheaper and usable by the majority of the population.
