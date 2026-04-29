---
applies_to: [project:kmeans-som]
topics: [clustering, machine-learning, research, undergrad-research]
---

## Why dimensionality is the real problem with k-means

In high dimensional data, distances are large, and thus, clustering can often be led astray by the sheer magnitude that Euclidean distance scales to. By using self organizing maps, we can reduce the dimensionality of the problem in an intelligent fashion, allowing for the scale of distances to be far more applicable for clustering.

Preserving topology matters for data with high dimensionality and underlying structure. Dimensionality reduction without preserving that underlying structure can introduce nonexistent patterns into the data.

## Why SOMs over PCA or t-SNE

The primary benefit of a SOM is that it preserves topology by using a neural network architecture, rather than deterministic dimensionality reduction like PCA or probabilistic reduction like t-SNE.

## The honest origin story

It was a test, and it seemed to work. There's no reason NOT to try a SOM, after all.

A lot of papers tend to overclaim underlying reasoning for testing a hypothesis when the origination of the idea came from "why not try this instead?" Finding the reasoning behind a promising result is important, but let's not fool ourselves that many successful discoveries weren't just exploratory miracles.

## On exploratory motivation in research

I don't think it's a bad thing to explain a theoretical motivation. After all, they were looking in that area because their research found a gap in the space. It's just important to keep in mind as researchers that you don't need to know everything about the possible results of an experiment before trying it, because sometimes the process will explain itself with results.

## What the paper got wrong

The paper definitely didn't go deep enough, and additionally, wasn't on the "cutting edge" of research. Such algorithms are decades old, and have likely been used in conjunction in practice somewhere, just no one had written a good paper on it. That's part of why we never published it.

## Undergrad research and the cutting-edge bias

I'm not sure. It could just be that we didn't look hard enough. It also might be the case that undergrad research can publish good results with simple ideas that are ignored as a result of the push of academia to be on the cutting edge.
