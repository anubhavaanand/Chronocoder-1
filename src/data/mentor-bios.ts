/**
 * Mentor biographies — the "article" layer of the homepage gallery journey.
 * Hand-written; keyed by mentor id (see src/data/mentors.ts).
 *
 * Each bio gives visitors the person behind the persona: who they were,
 * what they actually did, and how that legacy shapes the way the AI
 * mentor reviews code today.
 */

export interface MentorBio {
  /** One-line "known for" strip shown above the article */
  knownFor: string;
  /** The article body — two to three short paragraphs */
  paragraphs: string[];
  /** A documented quote that closes the section */
  quote: string;
  quoteContext: string;
}

export const MENTOR_BIOS: Record<string, MentorBio> = {
  ada_lovelace: {
    knownFor: "First published computer program · Visionary of the Analytical Engine",
    paragraphs: [
      "Augusta Ada Byron, Countess of Lovelace, was born into poetry and chose mathematics. Tutored by Mary Somerville and Augustus De Morgan, she collaborated with Charles Babbage on his proposed Analytical Engine — and in her 1843 translations of an Italian paper about it, she appended a set of Notes longer than the article itself. Note G contains a tabulation of Bernoulli numbers worked out step by step for the machine: the first published algorithm designed for machine execution, a full century before the first computer ran.",
      "But Ada's real legacy is what she saw that Babbage did not. The Engine, she wrote, was not merely a number-cruncher: it might one day 'weave algebraic patterns' the way the Jacquard loom weaves flowers — composing music, manipulating symbols of every kind. She called her fusion of imagination and rigour 'poetical science'. She reviews your code the same way: for mathematical elegance, for structure that anticipates what comes next, for the pattern your program weaves.",
    ],
    quote: "The Analytical Engine has no pretensions whatever to originate anything.",
    quoteContext: "Notes to Menabrea's Sketch of the Analytical Engine, 1843",
  },

  alan_turing: {
    knownFor: "The Turing Machine · Breaking Enigma · The Turing Test",
    paragraphs: [
      "In 1936, at twenty-four, Alan Turing defined what a computer is. His paper 'On Computable Numbers' imagined a bare machine — a tape, a head, a table of rules — and proved that one such machine could imitate all others. The universal machine is the blueprint of every computer you have ever touched. He also proved there are problems no program can solve: the halting problem is the ghost that stands over every loop you have ever written.",
      "During the war he led the hut at Bletchley Park that broke German naval Enigma, shortening the war and saving millions of lives. After it, he designed the ACE, programmed the Manchester Baby, and asked in 1950 whether machines could think — giving us the Turing Test instead of an answer. He reviews your code the way he approached machines: Does it terminate? At what cost? Is there a simpler mechanism that does the same?",
    ],
    quote: "We can only see a short distance ahead, but we can see plenty there that needs to be done.",
    quoteContext: "Computing Machinery and Intelligence, 1950",
  },

  grace_hopper: {
    knownFor: "First compiler · COBOL · 'Amazing Grace' of the US Navy",
    paragraphs: [
      "Grace Brewster Hopper — Vassar professor, Yale PhD — was sworn into the US Navy Reserve in 1943 at age 36 and sent to program the Harvard Mark I, where she crunched ballistics tables by hand-cranking a machine the size of a room. At Harvard her team found an actual moth trapped in a relay; she taped it into the logbook with the note 'first actual case of bug being found' — and spent the rest of her life teaching the world that debugging is a discipline, not an accident.",
      "Her conviction that computers should speak human produced the first compiler (A-0), FLOW-MATIC, and the business language COBOL — the most enduring codebase in history. She carried wire segments 'a nanosecond' long in her purse to make the speed of light feel real to executives. She rose to Rear Admiral and reviews your code like she ran her teams: warmly, systematically, and with zero tolerance for 'we've always done it this way'.",
    ],
    quote: "It's easier to ask forgiveness than it is to get permission.",
    quoteContext: "Attributed, from her later years teaching at DEC",
  },

  margaret_hamilton: {
    knownFor: "Apollo Guidance Software · Coined 'software engineering'",
    paragraphs: [
      "When Margaret Hamilton joined MIT's Instrumentation Laboratory, 'software engineering' wasn't a phrase — she coined it to argue that building software deserved the same discipline as building bridges. As head of the software division for Apollo, her team wrote the guidance computer code that flew astronauts to the Moon: asynchronous executive, priority scheduling, error detection and recovery — designed for the moment when everything goes wrong at once.",
      "That moment came on July 20, 1969, when the Apollo 11 computer began flooding with 1202 alarms during the landing. Because the software was built to shed low-priority work and protect the mission-critical, Neil Armstrong and Buzz Aldrin kept their descent. 'The never-going-to-happen can happen' was her creed long before resilience engineering had a name. She reviews your code the way she rated flight software: what fails first, what recovers, and what must never, ever crash.",
    ],
    quote: "I began to realize that the software was not getting the respect it deserved.",
    quoteContext: "On coining 'software engineering' at MIT, 1960s",
  },

  dennis_ritchie: {
    knownFor: "The C language · Unix · A foundation of everything",
    paragraphs: [
      "Dennis Ritchie spent his career at Bell Labs quietly building the layer everything else stands on. With Ken Thompson he turned an abandoned space-travel game OS into Unix — portable, elegant, and written in a language he designed for the purpose: C. Nearly every operating system kernel that matters, every major language from Python to Rust's compiler infrastructure, descends from that decision to make the system small and the language close to the machine.",
      "With Brian Kernighan he wrote 'The C Programming Language' — K&R — still a model of technical prose: no wasted words, every example load-bearing. He won the Turing Award in 1983 and the National Medal of Technology, and described it all with characteristic understatement. He reviews your code the way he built Unix: What can be removed? Will it port? Is this a tool or a policy? Simplicity, in his honour, is never an accident.",
    ],
    quote: "Unix is simple. It just takes a genius to understand its simplicity.",
    quoteContext: "Attributed, reflecting on the Unix philosophy",
  },

  barbara_liskov: {
    knownFor: "Liskov Substitution Principle · Abstract data types · Turing Award",
    paragraphs: [
      "Barbara Liskov was the first woman in the United States to earn a doctorate in computer science (Stanford, 1968). At MIT she built languages that taught the industry what abstraction means: CLU introduced abstract data types, iterators, and exceptions as first-class ideas; Argus did the same for distributed systems. Her 1987 keynote — formalized with Jeannette Wing as 'A Behavioral Notion of Subtyping' — became the L in SOLID: subclasses must be substitutable for their base classes without breaking the program.",
      "The insight underneath all of it is that correctness is designed, not tested into existence. Contracts between components — preconditions, postconditions, invariants — are what let teams build systems larger than any one mind. She won the Turing Award in 2008 and still teaches at MIT. She reviews your code as a contract negotiator: What does this promise? What can it never break? Can another implementation stand in for it, unseen?",
    ],
    quote: "Software correctness isn't something you test into existence. It's something you design for.",
    quoteContext: "Paraphrasing her lifelong teaching on program development",
  },

  guido_van_rossum: {
    knownFor: "Creator of Python · The Zen of Python · Benevolent Dictator For Life",
    paragraphs: [
      "In December 1989, Guido van Rossum of CWI Amsterdam was looking for a hobby programming project for the week between Christmas and New Year. He wanted a language that took the best of ABC and made it fun — one where the interpreter's dry British humour came from Monty Python, not from clever syntax. Python's rise from that holiday week to the world's most-taught, most-deployed scripting language is the story of one conviction: code is read far more often than it is written.",
      "He led the community as Benevolent Dictator For Life for nearly three decades, shepherding Python 3's painful but necessary reset, then stepped down with a single mailing-list post. PEP 20 — 'The Zen of Python' — is nineteen aphorisms that fit on one screen: beautiful is better than ugly, flat is better than nested, there should be one obvious way to do it. He reviews your code through that lens: Is it readable? Is it Pythonic? Is there exactly one obvious way this should be written?",
    ],
    quote: "Code is read much more often than it is written.",
    quoteContext: "Guido's guiding principle for Python's design",
  },

  linus_torvalds: {
    knownFor: "Linux kernel · Git · The world's largest collaborative codebase",
    paragraphs: [
      "In August 1991, a 21-year-old student in Helsinki posted to Usenet: 'I'm doing a (free) operating system (just a hobby, won't be big and professional like gnu)'. The hobby became the kernel of Android, supercomputers, every cloud on Earth — and the development process Linus ran to coordinate thousands of strangers became its own invention. In 2005 he wrote Git in about ten days to hold the kernel's history, and version control as we know it followed.",
      "His review culture is famously blunt — patches live or die on the mailing list by technical merit alone, hierarchy earned by track record, not titles. Underneath the sharp tongue is a disciplined engineering ethic: does it work, is it fast, does the abstraction earn its keep, and can the next maintainer understand it in five years. He reviews your code exactly the way he reviews kernel patches: no flattery, no ceremony — show me the code.",
    ],
    quote: "Talk is cheap. Show me the code.",
    quoteContext: "Linux kernel mailing list, 2000",
  },
};
