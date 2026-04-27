---
applies_to: [project:caladrius]
topics: [healthcare, triage, hackathon, hackgt, privacy, ai-agents, multi-agent, hipaa, pitch]
---

## HackGT story

HackGT was the first time I decided to just go big with my hack. We built Caladrius, a privacy-first AI triage assistant for hospitals. We worked with encrypted medical passports on mobile devices, secure QR code transmission of data, AI medical agents, injecting real-time information into reasoning, and giving human control to the medical professionals that make everything run. We won 2nd place in the Curator's Cause track for social impact. Working with Avyukta Nagrath, Michael Chan, and Joshua Okonkwo, even through hours of frustration, scrapping ideas, and merge conflicts, we were able to put it all together in the end. Over 900 hackers at HackGT, and we still made something that mattered.

## Why triage

My teammate had just been to the hospital. He remembered sitting down and filling out a long form. Then, after he got a room, the nurse read the form, left, spoke with another person about the symptoms, and only then came back to order some initial tests. We were talking and thought, what if that entire setup process was taken care of? That meant loading the medical history quickly and seamlessly, intelligently asking questions based on symptoms and medical history, and then writing up an initial prognosis along with reasoning, adjustable priority, and recommended next steps. Since this initial screening is largely general medical knowledge, we can automate a significant amount of the initial data gathering and decision making with an agentic system using a medical model.

There was no reason for a sick person to do unneeded data entry, or for the nurse to then spend time making a general knowledge-based medical prognosis and sifting through the patient's medical history to make an informed decision. It was inefficient and wasted time that the nurse could have spent caring for the patient.

## Why HIPAA was non-negotiable

We wanted it to be as realistic as possible. Every person we called about the problem (teammate's mom works in hospital data processing, teammate's dad was a doctor) mentioned that the entire difficulty of building good healthcare products is that we need to maintain HIPAA compliance. So, we took the first step to modeling that reality.

## Multi-agent architecture

We needed a questioning loop with feedback. One agent evaluates the Q&A to see if it has enough information to produce a diagnosis, and if not, it identifies a missing information gap. The other agent then questions the user interactively in order to fill that gap, and the loop repeats. Finally, a third agent compares the result against the other existing diagnoses in a certain severity category to assign it to a precise priority that's adjustable by the triage nurses. The point of the multi-agent system is to separate the evaluator from the questioner and the diagnoser, reducing bias and overfitting in the reasoning process.

## The pitch

The judges latched on to the fact that we were solving a real problem and accounted for real factors that affected the industry in practice. This meant things like encryption, deleting data after processing, using local models, separating bias, and the human-in-the-loop involvement throughout the process, especially at the end during the adjustable priority of diagnoses in the triaging room.

Our pitch went something like this: Imagine you're sitting in a triage room, sick and dizzy, and you're given a form that's 20 questions. It doesn't seem that long, but then after that form is submitted, it gets processed into a computer. After that, the computer reads the data, and the nurse has to look at it. They then pull your history, take your symptoms, and compare all three of those things together. Maybe in stages, maybe other people do it who have no context of the situation. After all that is done, finally, after two hours, they order some tests.

Imagine how much of that process could be streamlined if the questions were intelligent, the history was easily pulled, and the general knowledge-based diagnosis was automatic with priority baked in.

I knew it landed when the judge for our track had worked at a medical practice and knew exactly the challenge we were talking about. He saw how we carefully dealt with the exact priorities and issues that a real doctor and a real triage nurse would care about in that scenario. We wouldn't have known that unless we spoke with the people we did, doctors and real hospital data processing workers.
