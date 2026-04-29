---
applies_to: [project:veritas]
topics: [clinical-research, fraud-detection, world-id, ml, hackathon, proof-of-human, mom-test, customer-discovery]
---

## The problem

Clinical trials have a serious trust problem. An estimated 4% of volunteers are "professional patients," and up to 25% of trial data may be problematic or fabricated. Current fraud detection relies on basic attention checks that are easily gamed. We set out to solve one of the biggest blind spots in modern research, in 36 hours at Catapult 2026.

## How it works

Veritas combines cryptographic proof-of-personhood with ML-powered response quality scoring to give researchers clean, trustworthy data. Identity verification uses World ID iris biometrics to enforce one-person-one-enrollment. An intelligent scoring pipeline analyzes coherence, effort, consistency, and specificity for every response. Similarity detection uses vector embeddings to flag duplicate responses across enrollments. The result: Veritas walked away with Best Proof-of-Human Application at Catapult 2026, Purdue's premier AI/ML hackathon.

## Why this problem fit the hackathon

We wanted to figure out a real problem that could be nearly completely solved with proof-of-personhood, using World ID, one of the sponsors for the hackathon. We realized we needed to find a high-economic-impact area of fraud that also has low digital adoption and operates virtually at scale. There was one field that caught our eye, because the person themselves matters so much to the quality of the data, which is clinical trials. There are $35B in the clinical trial industry, and up to 4% is fraud.

Going tool-first like this is definitely specifically a hackathon move. In the real world, it's better to look for a problem first, and then a solution. For the hackathon specifically, we opted for this approach.

## Talking to clinical researchers

We actually spoke with clinical researchers. They mentioned a lot about fraud, and how they do IP deduplication, and have to worry about chargebacks for fraudulent data. The other thing that was talked about, though, was quality of the data. That's why part of Veritas is a helpful AI assistant that grades the quality of the responses, guiding them to a better response where necessary or letting them take a break if the responses are going through too quickly or quality degrades.

The thing that we did that you generally shouldn't do as a builder is to talk to your customer about the solution before the problem. You need to ask them questions from a genuinely "naive" standpoint. It's called the Mom Test, and it's about asking your customers about specific experiences from their life that could lead you to discover the real problem they have.

It's because of our thesis and extensive research that we were able to get away with the Mom-test-type questions. Even through questioning, we discovered that the real part of the problem was quality, and in a production-grade solution, we might have focused on that instead. As a result, the core of our product was split, which is not amazing for a real-world solution meant to solve a single problem.

## The contradiction questions

The part of Veritas that I'm most proud of is the ability to assist the researcher with creating surveys by making "contradiction questions," i.e. questions that ask "over the past month, pain has negatively affected my ability to work" and "over the past month, pain has not affected my ability to work," then measuring the direction of the responses to each question to see if there's a contradiction. For example, if the user says "strongly agree" to both, then something is off, and their confidence score goes down. Same thing with helping researchers improve the specificity of their questions after creating a draft. The goal of this is to make the questions as clear as possible to the respondent so there's no confusion about timeframe, mismatch between question type and the content of the question, or language about what the question is asking.

## What hackathons are actually for

Hackathons are made to show off a solution, not to solve a problem. You create a solution for the sake of creating one, without genuinely taking time to identify if the problem exists for many people. That's not to say that they are bad, as there are genuinely good products that come out of hackathons. But for a revenue-generating business, it's not the best method to guarantee customers.

## The flashy vs. real debate

We had a big decision and debate about whether the project would even be flashy enough to impress judges. I said that a real problem that was solved completely would be impressive enough to wow the judges, and my teammates disagreed, saying that it wasn't technically complex enough.
