---
applies_to: [work:Peraton Labs]
topics: [reinforcement-learning, cybersecurity, malware-detection, IoT, agents, control, defense, invisible-work]
---

## The control question

During the summer, I began work on a new kind of malware detection program. Our program was a first-of-its-kind reinforcement-learning agent to intelligently navigate complex IoT device environments. A question came up time and time again: how much control should our agent have? Most technical AI applications deal with very high-level functions. The more actions and control you give an agent, the more often it will mess up, but it will also be able to carry out far more tasks than with a small set of high-level operations. A simple analogy is the difference between a rigid customer service tree and an LLM chatbot: one is perfect for limited applications, while the other is great for customized requests.

For our agent, we wanted it to have access to almost everything. We wanted it to be able to traverse an IoT network with full knowledge of the surrounding state and complete control over what it's able to do. It made learning harder, but that low-level control is truly what enables an agent to be effective and flexible.

## Implications for robotics

This decision about control in an AI system feels increasingly central to robotics. Most robotics systems today rely on precise, pre-programmed sequences or high-level planners that assume the world will cooperate. But as robots move into unstructured environments like homes, disaster zones, and dynamic factories, we need agents that can operate at a much more granular level. That means giving up some predictability. It means building systems that learn to control rather than just follow control scripts. And it means accepting that real-world intelligence will never be nearly as clean as the text-oriented LLM world we're exploring today. The future of agents lies in control.

## On unflashy work

The ML work that goes into cybersecurity is so detail-oriented and gritty. It's not flashy. There's no cool results that are easy to view, like bounding boxes or generated text. It's an abstract model exploring an abstract space using abstract actions.

It's definitely frustrating to not have easily visible output. Especially in the scenario in which I worked, a defense research contract in a classified work environment, there was no product, no public information, and nothing I can show to the world. However, the work is undoubtedly important, and the best work is invisible.

That's a broader belief. The most important work that keeps our world's systems running is completely invisible, and massive organizations have critical dependencies on these gritty, high-importance problems that need solving.

## Why RL for IoT malware

RL approaches to malware detection don't cover the same use case. On a single device, traditional malware detection works reasonably well. But on an IoT network, where devices connect and dynamically transmit malicious data and lie dormant across devices, we can't feasibly explore everything. Thus, it falls upon a well-trained agent to explore the space well enough to detect the malware present.

"Well enough" is just an improving metric based on what we can already do. It just needs to beat a baseline brute-force search at pure speed and discovery of malware, and based on those metrics, we did achieve results.
