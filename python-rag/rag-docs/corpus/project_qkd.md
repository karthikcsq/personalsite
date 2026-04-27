---
applies_to: [project:qkd]
topics: [quantum, cryptography, photonics, research, high-school, arxiv]
---

## The project

This project started in an unlikely place: a high school laboratory. Using lasers, polarizers, beamsplitters, and a handful of other optical components, we built and aligned a prototype capable of performing polarization-based quantum key exchange. On the software side, we wrote Python tools to parse oscilloscope data, apply a 0.004 mW cutoff, extract bit sequences, sift measurement bases, and analyze noise. It was both a crash course in photonics and an exercise in showing what can be achieved with modest resources.

## Why it matters

What makes this exciting isn't just the engineering, but the purpose. Quantum Key Distribution is one of the most promising technologies we have for securing communication in a post-quantum world. Classical encryption methods will eventually be vulnerable to quantum computers, but QKD provides something fundamentally different: security guaranteed by the laws of physics. Any attempt to eavesdrop on the key introduces measurable disturbances, alerting the users and preserving the integrity of the exchange.

By implementing even a simplified prototype in a high school setting, I learned firsthand that cutting-edge security isn't limited to expensive labs or corporate R&D divisions. Complex quantum protocols can be explored at a fraction of the expected cost, opening doors for students and educators to engage directly with the future of cryptography. Quantum is here, and it's hands-on.

## Theory and implementation

One of the things that surprised me most about the quantum hardware side is that the actual logic, in terms of hardware implementation, is pretty straightforward. If you look at the theory, on the other hand, it's so in-depth and mathematically complex. The math behind something like Shor's algorithm is incredible. The realistic implementation is pretty easily understandable and followable in a circuit.

That said, this isn't a sign that quantum computing is early. It's a sign that quantum computing is able to achieve certain specialized, extremely powerful results with relatively simple implementations. We selected an implementation that was reasonable and not highly complex, in terms of what the qubits needed to look like and what gates needed to be present. We could not have implemented something like Grover's or Shor's algorithm on photonic channels in a lab setup; that would require a specialized quantum computer like they have at IBM or Google. But the security result we were after was achievable, and that's the point. Certain results in quantum don't require the full complexity of the theory to realize in hardware.

## What we actually contributed

Honestly, our research wasn't groundbreaking. We didn't push forward the field in a meaningful way in terms of theory, algorithms, or the state of the art in implementation. What we did show was that a real, working quantum key distribution setup could be built using photonics for under $2,000. It may not be the most robust implementation in the world, and it was certainly bootstrapped and duct-taped together, but it worked, and it was incredibly cheap.

That matters because of what's coming. When Shor's algorithm becomes practical, RSA fails, and all information secured by classical encryption goes public. Every company, government, and bank in the world will need to move to quantum-secure communication. That transformation needs to happen at scale, and it needs to happen as cheaply and quickly as possible. An expensive, complex implementation will only slow that down. Showing that QKD is achievable on a modest budget is a contribution to the speed and accessibility of that transition.

## What research teaches

Doing real research in high school shows you one thing: that you, as a person, are able to do what real professionals do. That confidence doesn't come from understanding a topic better. It only comes from doing things like research, making a real impact in the world, and solving complex problems.

What makes research different from other hard things is scale. Hard math problems, difficult classes, and competitions all teach confidence too. But research is sustained. You work on something for nine months, and a lot of the time you make no progress. My experience shows you that even when the going gets tough and you feel stagnated, you can still eventually come out with a result that is meaningful and valuable.

Stagnation looked like adopting a strategy, then trying it for a month or two months. It often looked like thinking: if we put this polarizer right in front of the beam and feed it into this laser collimator, the setup will work. We would try to align it for two months. Eventually we would give up and ask whether we could try something else. What if we put the collimator right up to the laser and polarize the light inside the laser channel? Then we would see a little progress, try new things incrementally, give up on old things, start over often, until suddenly, all at once, everything came together into a real implementation.

Progress in doing hard things is almost always slow at first, then all at once. You find that progress is slow at first because you are assembling the foundation of what to do and what not to do. Eventually you try enough things that something works. When everything clicks, progress comes like dominoes falling, because that one blocker might have been the thing stopping ten million other things. Then everything falls into place at once.
