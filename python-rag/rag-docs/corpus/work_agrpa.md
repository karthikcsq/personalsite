---
applies_to: [work:AgRPA]
topics: [ml, data, hardtech, drones, agtech]
---

## Data is the real problem

It's so incredibly difficult to gather good data for drone imagery. We had to do multiple test flights to even get enough to fine-tune a YOLO model. On top of that, the real difficulty was flying the drone in such a way that the images we gathered were actually usable. YOLO is an incredible model that's easy to fine-tune on good data, but without the good data, it's pointless. I would say all ML is really a data gathering problem.

## The drone tradeoff

If the drone was too fast, the images would blur. If we flew too high for better coverage, the camera quality wouldn't be good enough to detect weeds. If we made the drone too big to carry better equipment, sensors, and cameras, then it could be too expensive. In the end, we settled on having high altitude, medium speed, and a high quality camera with sensors to boost performance beyond pure image analysis.

## Multi-stream beats single-stream

Adding the sensors was a concession, but it wasn't a huge change. In reality it was just another camera (infrared), which we were able to produce better results with in combination with the others. It's always important, especially in real world ML, to take advantage of as many distinguishable data streams as possible to improve accuracy.

## What hardtech ML costs that software ML doesn't

The hard part of working with hardtech is that there are real limitations to what you can do in the real world. Gathering data takes a long time (right season, expensive flight costs). If something errors, those conditions don't line up properly. If the results don't come out well, you can't just retry it either.

## Over-collecting as a discipline

We collected as much data as we could in the flight. We captured more FPS than realistic in flight for better training data. I brought this back into my software data collection by over-collecting as much data as I can, so I can do more with it down the line without recollecting. For example, when building RL agents at Peraton Labs, I worked hard to identify how many different quantitative and qualitative aspects about a file could be inputted into a model to detect if it was malware. That meant the binary signature, its location in the filesystem, the name of the file, outputs of different scripts run on the file, and so on.

## Advice for first-time hardtech ML

To a younger student doing their first hardtech ML project, I'd say to focus on really good, analyzable data, with as many relevant data streams as possible.
