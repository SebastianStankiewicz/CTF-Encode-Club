"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const cats = [
    // Cat 1
`     _._     _,-'""\`-._
    (,-.\`._,'(       |\\\`-/|
        \`-.-' \\ )-'\( , o o)
              \`-    \\\`_\`"'-`,
    // Cat 2
`    /\\_____/\\
   /  o   o  \\
  ( ==  ^  == )
   )         (
  (           )
 ( (  )   (  ) )
(__(__)___(__)__)`
  ];

  const [cat, setCat] = useState(cats[0]);

  useEffect(() => {
    // Pick a random cat on mount
    const randomIndex = Math.floor(Math.random() * cats.length);
    setCat(cats[randomIndex]);
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <pre className="text-center font-mono whitespace-pre-wrap">
{`  ┌─────────────────────────────┐
   Head to `}
        <a
          href="/challenges"
          className="underline text-white"
          style={{ display: "inline" }}
        >
          challenges
        </a>
{` to find a challenge! 
  └─────────────────────────────┘
${cat}`}
      </pre>
    </main>
  );
}