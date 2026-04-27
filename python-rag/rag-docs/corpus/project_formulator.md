---
applies_to: [project:formulator]
topics: [computer vision, pose estimation, hackathon, form coaching, product design]
---

## Origin and hackathon context

FORMulator was the first hackathon I did at Purdue, and I was super excited. The idea started as Just Dance but using a camera that tracked your pose and compared it in real time. Midway through, we had a realization: the same approach could generalize to anything where form matters — golf, basketball, ballet, playing the cello. We ran with that. We didn't make as much progress as I would have liked, since it was our first college-level hackathon, but we won a prize and learned a lot about PoseNET and real-time video streaming.

## Core thesis

The thing about form is that, given a reference, you can grade a person's form in comparison to it. There's enough reference content on the internet to cover nearly anything from beginner to advanced. Where computer vision steps in is for the large differences, the nuanced comparisons where the gap between your form and the reference is visible but hard to articulate in writing. That's what CV handles that written instruction alone can't.

## What I'd build now

If I picked FORMulator back up today, I'd think first about the use case, analyze the form of target users, and design from first principles. That would mean being more deterministic: picking apart key distance and angle metrics for hand and foot movement, along with timing and speed. I'd focus on one type of form before trying to generalize, perhaps ballet or golf.
