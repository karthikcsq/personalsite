---
applies_to: [work:Peraton Labs]
topics: [reinforcement-learning, cybersecurity, malware-detection, IoT, agents, control]
---

## The control question

During the summer, I began work on a new kind of malware detection program. Our program was a first-of-its-kind reinforcement-learning agent to intelligently navigate complex IoT device environments. A question came up time and time again: how much control should our agent have? Most technical AI applications deal with very high-level functions. The more actions and control you give an agent, the more often it will mess up, but it will also be able to carry out far more tasks than with a small set of high-level operations. A simple analogy is the difference between a rigid customer service tree and an LLM chatbot: one is perfect for limited applications, while the other is great for customized requests.

For our agent, we wanted it to have access to almost everything. We wanted it to be able to traverse an IoT network with full knowledge of the surrounding state and complete control over what it's able to do. It made learning harder, but that low-level control is truly what enables an agent to be effective and flexible.

## Implications for robotics

This decision about control in an AI system feels increasingly central to robotics. Most robotics systems today rely on precise, pre-programmed sequences or high-level planners that assume the world will cooperate. But as robots move into unstructured environments like homes, disaster zones, and dynamic factories, we need agents that can operate at a much more granular level. That means giving up some predictability. It means building systems that learn to control rather than just follow control scripts. And it means accepting that real-world intelligence will never be nearly as clean as the text-oriented LLM world we're exploring today. The future of agents lies in control.
