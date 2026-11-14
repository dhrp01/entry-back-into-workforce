/* Scripted demo: Melissa's story. Open #/demo to load it.
   Everything here replaces a server or model call, so the demo is instant and works offline. */
window.DEMO = {
  profile: {
    name: 'Melissa',
    lastRole: 'Elementary school teacher (2nd grade)',
    field: 'education',
    strengths: 'Organizing, budgeting spreadsheets, teaching',
    awayDate: '2014-08',
    improvement: 'Feeling current with technology, LinkedIn, and job applications',
    startDate: '2027-01',
    education: "Bachelor's in Elementary Education; Utah teaching license",
  },

  // One entry per question. `picked` and `typed` are Melissa's answer, already filled in.
  // `skills` are the professional skills that answer reveals.
  // Entries with source 'gemini' are Gemini's own words, recorded from a real run of
  // the interview with these same answers. Do not edit their text. The rest is scripted.
  interview: [
    {
      "intro": "Melissa, going back after twelve years is hard. It is also very common. You already told me you taught second grade, so I will not ask you to list your skills. I will ask what you did.",
      "question": "Which of these have you done during your years at home?",
      "selection": "multiple",
      "options": [
        "Managed the family budget",
        "PTA/PTO officer, room parent, or school fundraising",
        "Organized schedules or carpools for kids' activities",
        "Coordinated care for an aging parent or family member",
        "Taught a class, led a youth group, or had a church teaching role",
        "Ran a side business (Etsy, babysitting, direct sales, crafts)",
        "Planned a big event (reunion, wedding, large fundraiser)",
        "Managed a home renovation or a major move"
      ],
      "picked": [
        1,
        2,
        0
      ],
      "skills": []
    },
    {
      "source": "gemini",
      "intro": "Those three picks already point to real workplace skills: budget management and financial planning from running the family budget, logistics and scheduling from managing kids' activities, and event planning, stakeholder communication, and volunteer coordination from your school work. Adding a rough detail or number to each will turn them into concrete resume evidence.",
      "question": "Starting with your PTA/PTO or school work, what role did you hold and roughly how many volunteers or dollars were involved?",
      "selection": "single",
      "options": [
        "PTA or PTO officer (such as president, VP, treasurer, or secretary)",
        "Room parent coordinating a class and a small group of helpers",
        "Event or committee chair working with 10 or more volunteers",
        "Fundraising lead raising $1,000 or more"
      ],
      "picked": [
        0
      ],
      "typed": "PTA vice president for two years; our fall fun run raised about $18,000 with 60 volunteers",
      "skills": [
        "Event planning",
        "Fundraising: $18,000",
        "Coordinating 60 volunteers",
        "Stakeholder communication"
      ]
    },
    {
      "source": "gemini",
      "intro": "Serving as PTA vice president for two years—and raising $18,000 with 60 volunteers—shows event planning, fundraising, volunteer coordination, and stakeholder communication. That puts 4 professional skills on your list already, the exact coordination work schools and nonprofits hire for.",
      "question": "Next, for the schedules and carpools you organized, roughly how many people or activities were you juggling in a typical week?",
      "selection": "single",
      "options": [
        "2–3 people and 3–5 weekly activities",
        "3–4 people and 6–10 weekly activities",
        "5 or more people and 10+ weekly activities",
        "Mostly occasional trips rather than a weekly schedule"
      ],
      "picked": [
        2
      ],
      "typed": "I ran the neighborhood youth soccer league schedule: 12 teams and about 140 families each season",
      "skills": [
        "Logistics coordination",
        "Scheduling: 12 teams, 140 families",
        "Multi-priority management"
      ]
    },
    {
      "source": "gemini",
      "intro": "Coordinating a soccer league schedule for 12 teams and 140 families is real logistics coordination, scheduling, and multi-priority management—the exact work operations coordinators are paid to do. Combined with the stakeholder communication, event planning, fundraising, and volunteer coordination from your PTA role, you already have 7 professional skills.",
      "question": "Last one from your list: for managing the family budget, roughly how much did it cover per year, and did it help you reach a goal like paying something off?",
      "selection": "single",
      "options": [
        "Under $30,000 a year",
        "$30,000–$60,000 a year",
        "$60,000–$100,000 a year",
        "Over $100,000 a year",
        "Not sure of the exact total"
      ],
      "picked": [
        2
      ],
      "typed": "About $95,000 a year in a spreadsheet; we paid off our car two years early",
      "skills": [
        "Budget management: $95,000",
        "Financial planning"
      ]
    },
    {
      "intro": "A $95,000 budget and a car paid off two years early is financial planning. Last question.",
      "question": "What matters most in your next job? Tap your top three in order.",
      "selection": "ranked",
      "options": [
        "Pay",
        "Hours",
        "In-person, hybrid, or remote",
        "A flexible schedule",
        "Getting back to work fastest",
        "Room to grow"
      ],
      "picked": [
        3,
        4,
        0
      ],
      "skills": []
    }
  ],

  done: {
    intro: 'You said you were starting from zero. You just named 9 professional skills, each with proof.',
    question: 'I have what I need. Your plan is ready to build.',
  },

  roadmap: {
    summary: 'Melissa, you are not starting from zero. Twelve years at home gave you 9 skills employers pay for. Here are three pathways that fit school hours, and your first three steps.',
    gap_line: 'Career break, 2014–2026: full-time caregiver for four children. During this time I served two years as PTA vice president, led a fundraiser that raised $18,000 with 60 volunteers, and ran scheduling for a 12-team youth soccer league with 140 families.',
    strengths: [
      { name: 'Event management and fundraising', assessment: 'Strong and current.', evidence: 'Fall fun run: $18,000 raised with 60 volunteers.' },
      { name: 'Operations and scheduling', assessment: 'Strong and current.', evidence: 'Soccer league schedule: 12 teams, 140 families each season.' },
      { name: 'Budget management', assessment: 'Solid.', evidence: 'Runs the family budget in a spreadsheet.' },
      { name: 'Teaching and communication', assessment: 'Proven, from before the break.', evidence: 'Five years as a 2nd grade teacher.' },
    ],
    pathways: [
      {
        name: 'School office or program coordinator',
        why_it_fits: 'You already know how schools work, and you have run their volunteers and their events.',
        what_it_needs: 'No new license. A current resume and confidence with office software.',
        how_it_fits_life: 'School hours and the school calendar. This matches your number one priority.',
        first_step: 'Search Alpine School District classified openings for “secretary” and “coordinator”.',
        reality_check: 'Pay often starts near $18–$22 an hour. The schedule is the main benefit.',
      },
      {
        name: 'Event and volunteer coordinator',
        why_it_fits: 'An $18,000 fundraiser with 60 volunteers is this job. You have done it without the title.',
        what_it_needs: 'A one-page portfolio of the fun run: the goal, the budget, the result.',
        how_it_fits_life: 'Often part-time or hybrid at nonprofits. Some evening and weekend events.',
        first_step: 'Write the fun run as three resume bullets with numbers.',
        reality_check: 'Event days are not flexible. Ask about the event calendar before you accept.',
      },
      {
        name: 'Operations or project coordinator through a returnship',
        why_it_fits: 'Scheduling 12 teams and 140 families is operations work at real scale.',
        what_it_needs: 'Current tools: spreadsheets, shared calendars, a project tracker.',
        how_it_fits_life: 'Return Utah offers 16-week paid returnships made for people with a career break.',
        first_step: 'Read the Return Utah openings at returnutah.utah.gov.',
        reality_check: 'Many returnships are full-time for 16 weeks. Confirm the hours before you apply.',
      },
    ],
    steps: [
      { title: 'Copy your career break line', action: 'Put the line above on your resume and your LinkedIn profile. The gap now has a title and numbers.', resource_guidance: 'Your county library gives free LinkedIn Learning access and resume help.', timeframe: 'Today · 10 minutes' },
      { title: 'Book a free career coaching session', action: 'Meet a coach at the Lehi employment center. Bring this plan with you.', resource_guidance: 'Utah Department of Workforce Services, jobs.utah.gov. Coaching is free.', timeframe: 'This week · 10 minutes to book' },
      { title: 'Join one free workshop', action: 'Attend a Tech-Moms “Better Way Thursdays” virtual workshop to feel current with technology again.', resource_guidance: 'Tech-Moms, tech-moms.org. Also read about Return Utah paid returnships.', timeframe: 'Within 2 weeks · 1 hour' },
    ],
  },
};
