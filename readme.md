# SVGConvexDecompositon.js
This repository exists only for demo and historical purposes, check [this link][poly-decomp] if you are looking for a working code. It is also may be a reinvention of the wheel. You've been warned.

[Convex decomposition demo](https://raw.githack.com/danillissimo/SVGConvexDecompositon.js/main/polygonSimplifyTest.html)
[Bézier curve approximation demo](https://raw.githack.com/danillissimo/SVGConvexDecompositon.js/main/bezierApproximationTest.html)
## Convex decomposition
This is a cleaned-up version, still requiring a heavy refactor, of my student work, which took me approximately six months to develop from zero. The algorithm is pretty simple:
1) Build a list of concave vertices
2) Until list is empty, select next concave vertex
3) Select traversal direction. If first neighbor of the selected concave vertex in this direction is not concave as well, build a triangle from the selected vertex and its first 2 neighbors in the selected direction
4) Test this triangle for other polygon vertcies - this is the basis for a convex segment. In case of failure, try choosing the opposite direction on step 3, then return to step 2
5) If triangle contains 2 concave vertices, then segment construction is over, proceed to the last step
6) Select each vertex in previously chosen direction, starting from the one immediately after the base triangle
7) If this vertex is concave, then segment construction is over, proceed to the last step
8) Build a triangle from:
-Selected vertex, last added vertex, selected concave vertex
-Selected vertex, last added vertex, the first vertex after the selected concave vertex (relative to the chosen traversal direction)
9) Test both triangles for other polygon vertices. If none, add selected vertex to the currently build convex segment and return to step 6
10) Recalculate convexity directions of selected concave vertex, and last successfully added vertex. Update list of concave vertices accordingly. Return to step 2

Wait, that doesn't sound simple. Ok, here's the principle description __(TL;DR)__:
1) Start building a new segment from a concave vertex
2) Walk along polygon outline in any direction from selected concave vertex, adding each vertex to builded segment, until this causes the segment to become concave, or to include other vertices of the polygon
3) Make sure you've got at least 3 vertices before detaching the segment from the polygon
4) Repeat!

Isn't _that_ simple?
While cleaning the code, I noticed that the second triangle test on steps 8-9 can be optimized: the idea of the original test is to detect the moment, when selected concave vertex becomes concave relative to the currently build segment. Once this happens, this vertex will start falling into the second triangle. A closer look to this test shows, that the line, drawn on the selected concave vertex and its first neighbor, forms a horizon, that is no vertex, wishing to join currently build segment, is allowed to trespass. Thus, a triangle test, a series of tripple halfplane tests, can be replaced with 1 halfplane test. Still, it's subject for a deeper examination, though it's highly likely to be true.
##### Triangle testing
An adequate way to do it would be using some kind of a search tree. I used a less efficient, but a simpler approach: sorted vertex sequences. Each vertex knows its ordinal number among all vertices along each axis. Then a triangle test looks this way:
1) Project the tested triangle on both axes
2) Select two most distant vertices for each axis
3) Among two pairs, select the one with the smallest index spread
4) Test all vertices, falling into index range of the selected pair, traversing the sequnce of corresponding axis

In demo, I visualise the selected range with long straight lines, crossing the whole testing field.
##### Performance
This part is based on nothing, but my inaccurate memories, so __you can boldly skip it__.
- First of all, I was using normal, not demo version. But I lost it, and I don't see any reasons to recreate it. May be I'll upload it later if find, but that's unlikely. However, it didn't really differ from the demo version
- I don't remember the algorithms I was competing with, except [Stefan Hedman's port of Mark Penner's algorithm][poly-decomp]
- What I do remember, is that it worked surprisingly and consistently well: smaller execution times, less output segments, less memory consumption. The more difficult the task was, the more it was ahead of other algorithms. But I guess the reason for that is relative simplicity: my algorithm doesn't add new vertices nor it cares about decomposition uniformity. On the other hand, refactoring should speed it up even more, and then it can be used where time really matters

##### 3D
Algorithm is potentially propogetable to 3D, though it will require some notable additions to handle cases like [Schönhardt polyhedron][polyhedron].
## SVG
I did some work of my own as well, but you better check [this][bezier.js]. 2 components I've implemented:
- Cubic Bézier curve approximation algorithm: splitts the curve in 4 parts, then recursively splits this segments in halfs, until each angle, built on any 3 consecutive vertices, does not deviate from 180 degrees by a value, that meets the specified threshold
- SVG parser: builds a set of vertices from a valid closed SVG path, using the mentioned above algorithm to approximate Bézier curves

### Special thanks
Well, six months were spent on this anyway. And they would be a waste if not:
- [Mark Penner][mpen], whose [work][bayazit] still illuminates the problem for all seekers
- [Stefan Hedman][schteppe], whose [demo][poly-decomp-demo] helped and inspired
- Various people from all over the world, whose names I mostly cannot remember, but whose efforts have helped me in my research
- Of course [Wikipedia](https://www.wikipedia.org/) writers, for providing all the knowledge I did lack
- And, especially, all the mathematicians from past centuries, who originally developed this knowledge

[poly-decomp]: <https://github.com/schteppe/poly-decomp.js>
[poly-decomp-demo]: <http://schteppe.github.io/poly-decomp.js/#path=160,150/118,108/78,154/32,48/192,40>
[polyhedron]: <https://en.wikipedia.org/wiki/Sch%C3%B6nhardt_polyhedron>
[bezier.js]: <https://pomax.github.io/bezierjs/>
[mpen]: <https://mpen.ca/>
[bayazit]: <https://mpen.ca/406/overview>
[schteppe]: <https://github.com/schteppe>
