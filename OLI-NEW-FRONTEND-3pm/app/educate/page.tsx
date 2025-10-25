"use client";

import { useState } from "react";
import Link from "next/link";

export default function EducatePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", name: "All Resources" },
    { id: "web", name: "Web Exploitation" },
    { id: "crypto", name: "Cryptography" },
    { id: "pwn", name: "Binary Exploitation" },
    { id: "reverse", name: "Reverse Engineering" },
    { id: "forensics", name: "Forensics" },
    { id: "osint", name: "OSINT" },
    { id: "misc", name: "Miscellaneous" },
  ];

  const resources = [
    // Web Exploitation
    {
      id: 1,
      category: "web",
      title: "SQL Injection Fundamentals",
      description: "Learn the basics of SQL injection attacks and how to exploit vulnerable databases.",
      difficulty: "Beginner",
      duration: "30 min",
      type: "Tutorial",
      link: "https://portswigger.net/web-security/sql-injection",
    },
    {
      id: 2,
      category: "web",
      title: "Cross-Site Scripting (XSS)",
      description: "Understand XSS vulnerabilities and how to identify and exploit them.",
      difficulty: "Beginner",
      duration: "45 min",
      type: "Tutorial",
      link: "https://portswigger.net/web-security/cross-site-scripting",
    },
    {
      id: 3,
      category: "web",
      title: "OWASP Top 10",
      description: "Comprehensive guide to the most critical web application security risks.",
      difficulty: "Intermediate",
      duration: "2 hours",
      type: "Guide",
      link: "https://owasp.org/www-project-top-ten/",
    },

    // Cryptography
    {
      id: 4,
      category: "crypto",
      title: "Introduction to Cryptography",
      description: "Learn the fundamentals of encryption, hashing, and cryptographic protocols.",
      difficulty: "Beginner",
      duration: "1 hour",
      type: "Course",
      link: "https://cryptohack.org/",
    },
    {
      id: 5,
      category: "crypto",
      title: "RSA Encryption Explained",
      description: "Deep dive into RSA encryption algorithm and common attack vectors.",
      difficulty: "Intermediate",
      duration: "45 min",
      type: "Tutorial",
      link: "https://www.youtube.com/watch?v=wXB-V_Keiu8",
    },
    {
      id: 6,
      category: "crypto",
      title: "Classical Ciphers",
      description: "Understanding Caesar, Vigenère, and other historical encryption methods.",
      difficulty: "Beginner",
      duration: "30 min",
      type: "Tutorial",
      link: "https://cryptohack.org/courses/intro/",
    },

    // Binary Exploitation
    {
      id: 7,
      category: "pwn",
      title: "Buffer Overflow Basics",
      description: "Learn how buffer overflows work and how to exploit them.",
      difficulty: "Intermediate",
      duration: "1.5 hours",
      type: "Tutorial",
      link: "https://www.youtube.com/watch?v=1S0aBV-Waeo",
    },
    {
      id: 8,
      category: "pwn",
      title: "Return-Oriented Programming (ROP)",
      description: "Advanced technique for exploiting binary vulnerabilities.",
      difficulty: "Advanced",
      duration: "2 hours",
      type: "Guide",
      link: "https://ropemporium.com/",
    },

    // Reverse Engineering
    {
      id: 9,
      category: "reverse",
      title: "Introduction to Assembly",
      description: "Learn x86/x64 assembly language fundamentals for reverse engineering.",
      difficulty: "Beginner",
      duration: "2 hours",
      type: "Course",
      link: "https://www.youtube.com/watch?v=VQAKkuLL31g",
    },
    {
      id: 10,
      category: "reverse",
      title: "Using Ghidra",
      description: "Master the Ghidra reverse engineering tool for analyzing binaries.",
      difficulty: "Intermediate",
      duration: "1 hour",
      type: "Tutorial",
      link: "https://ghidra-sre.org/",
    },

    // Forensics
    {
      id: 11,
      category: "forensics",
      title: "Digital Forensics Basics",
      description: "Introduction to analyzing files, memory dumps, and network traffic.",
      difficulty: "Beginner",
      duration: "1 hour",
      type: "Tutorial",
      link: "https://trailofbits.github.io/ctf/forensics/",
    },
    {
      id: 12,
      category: "forensics",
      title: "Steganography Techniques",
      description: "Learn how data is hidden in images, audio, and other files.",
      difficulty: "Beginner",
      duration: "45 min",
      type: "Tutorial",
      link: "https://www.youtube.com/watch?v=TWEXCYQKyDc",
    },

    // OSINT
    {
      id: 13,
      category: "osint",
      title: "OSINT Framework",
      description: "Comprehensive collection of OSINT tools and techniques.",
      difficulty: "Beginner",
      duration: "30 min",
      type: "Resource",
      link: "https://osintframework.com/",
    },
    {
      id: 14,
      category: "osint",
      title: "Google Dorking",
      description: "Advanced Google search techniques for information gathering.",
      difficulty: "Beginner",
      duration: "30 min",
      type: "Guide",
      link: "https://www.exploit-db.com/google-hacking-database",
    },

    // Miscellaneous
    {
      id: 15,
      category: "misc",
      title: "CTF Handbook",
      description: "Complete guide to participating in Capture The Flag competitions.",
      difficulty: "Beginner",
      duration: "1 hour",
      type: "Guide",
      link: "https://trailofbits.github.io/ctf/",
    },
    {
      id: 16,
      category: "misc",
      title: "PicoCTF Practice",
      description: "Free practice CTF challenges for all experience levels.",
      difficulty: "All Levels",
      duration: "Ongoing",
      type: "Platform",
      link: "https://picoctf.org/",
    },
  ];

  const platforms = [
    {
      name: "HackTheBox",
      description: "Online platform for penetration testing and cybersecurity training.",
      url: "https://www.hackthebox.com/",
      difficulty: "All Levels",
    },
    {
      name: "TryHackMe",
      description: "Guided cybersecurity training with hands-on exercises.",
      url: "https://tryhackme.com/",
      difficulty: "Beginner-Friendly",
    },
    {
      name: "CryptoHack",
      description: "Platform focused on cryptography challenges.",
      url: "https://cryptohack.org/",
      difficulty: "All Levels",
    },
    {
      name: "OverTheWire",
      description: "War games for learning security concepts.",
      url: "https://overthewire.org/",
      difficulty: "Beginner to Advanced",
    },
    {
      name: "pwn.college",
      description: "Learn binary exploitation and reverse engineering.",
      url: "https://pwn.college/",
      difficulty: "Intermediate",
    },
    {
      name: "CTFtime",
      description: "Archive of CTF competitions and team rankings.",
      url: "https://ctftime.org/",
      difficulty: "All Levels",
    },
  ];

  const tools = [
    { name: "Burp Suite", category: "Web", description: "Web application security testing tool." },
    { name: "Wireshark", category: "Network", description: "Network protocol analyzer." },
    { name: "Ghidra", category: "Reverse Engineering", description: "Software reverse engineering framework." },
    { name: "John the Ripper", category: "Crypto", description: "Password cracking tool." },
    { name: "Metasploit", category: "Exploitation", description: "Penetration testing framework." },
    { name: "Binwalk", category: "Forensics", description: "Firmware analysis tool." },
    { name: "CyberChef", category: "Misc", description: "Web app for encryption, encoding, and data analysis." },
    { name: "Nmap", category: "Network", description: "Network discovery and security auditing." },
  ];

  const filteredResources =
    selectedCategory === "all"
      ? resources
      : resources.filter((r) => r.category === selectedCategory);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case "beginner":
        return "bg-green-500/10 text-green-400 border-green-500/20";
      case "intermediate":
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "advanced":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      default:
        return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-2">CTF Learning Hub</h1>
        <p className="text-foreground/60">
          Curated collection of external resources, guides, and platforms to help you learn and practice Capture The Flag (CTF) challenges.
        </p>
      </div>

      {/* Category Filter */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                selectedCategory === cat.id
                  ? "bg-blue-600 text-white"
                  : "bg-foreground/5 border border-foreground/10 text-foreground/70 hover:bg-foreground/10"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-12">
        {/* Learning Resources */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Recommended Learning Resources</h2>
            <p className="text-foreground/60">
              External tutorials, guides, and courses selected for different CTF categories.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResources.map((resource) => (
              <a
                key={resource.id}
                href={resource.link}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-400 transition">
                    {resource.title}
                  </h3>
                </div>

                <p className="text-sm text-foreground/70 mb-4">
                  {resource.description}
                </p>

                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded border ${getDifficultyColor(
                      resource.difficulty
                    )}`}
                  >
                    {resource.difficulty}
                  </span>
                  <span className="px-2 py-1 text-xs font-mono bg-foreground/5 border border-foreground/10 text-foreground/60 rounded">
                    {resource.type}
                  </span>
                  <span className="px-2 py-1 text-xs font-mono bg-foreground/5 border border-foreground/10 text-foreground/60 rounded">
                    {resource.duration}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* Practice Platforms */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Practice Platforms</h2>
            <p className="text-foreground/60">
              Hands-on training sites and CTF competition platforms.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {platforms.map((platform) => (
              <a
                key={platform.name}
                href={platform.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 bg-foreground/5 border border-foreground/10 rounded-lg hover:bg-foreground/10 transition-all group"
              >
                <h3 className="text-lg font-semibold text-foreground group-hover:text-blue-400 transition mb-2">
                  {platform.name}
                </h3>
                <p className="text-sm text-foreground/70 mb-3">
                  {platform.description}
                </p>
                <span className="inline-block px-3 py-1 text-xs font-semibold rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  {platform.difficulty}
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Essential Tools */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Essential Tools</h2>
            <p className="text-foreground/60">
              Commonly used tools for CTF challenges and security research.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {tools.map((tool) => (
              <div
                key={tool.name}
                className="p-4 bg-foreground/5 border border-foreground/10 rounded-lg"
              >
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {tool.name}
                </h3>
                <p className="text-xs text-foreground/70 mb-2">
                  {tool.description}
                </p>
                <span className="inline-block px-2 py-1 text-xs font-mono bg-foreground/5 border border-foreground/10 text-foreground/60 rounded">
                  {tool.category}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* External Getting Started */}
        <section>
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">Getting Started with CTFs</h2>
            <p className="text-foreground/60">
              Beginner-friendly resources and roadmaps from the community.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href="https://trailofbits.github.io/ctf/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-foreground/5 border border-foreground/10 rounded hover:bg-foreground/10 transition"
            >
              CTF Handbook – by Trail of Bits
            </a>
            <a
              href="https://picoctf.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-foreground/5 border border-foreground/10 rounded hover:bg-foreground/10 transition"
            >
              PicoCTF – Free beginner-friendly CTF platform
            </a>
            <a
              href="https://overthewire.org/wargames/"
              target="_blank"
              rel="noopener noreferrer"
              className="block p-4 bg-foreground/5 border border-foreground/10 rounded hover:bg-foreground/10 transition"
            >
              OverTheWire – Wargames to build practical skills
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-8">
          <div className="bg-blue-600/10 border border-blue-600/20 rounded-lg p-8">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Ready to Apply What You’ve Learned?
            </h2>
            <p className="text-foreground/70 mb-6">
              Explore our challenge section to practice and compete for rewards.
            </p>
            <Link
              href="/challenges"
              className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Go to Challenges →
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
