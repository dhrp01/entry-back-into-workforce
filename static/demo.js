/* Scripted demo: Melissa's story. Open #/demo to load it.
   Everything here replaces a server or model call, so the demo is instant and works offline. */
window.DEMO = {
  profile: {
    name: 'Melissa',
    lastRole: 'Elementary school teacher (2nd grade)',
    field: 'education',
    strengths: 'Organizing, budgeting spreadsheets, working with kids and parents',
    awayDate: '2014-08',
    improvement: 'Feeling current with technology, LinkedIn, and job applications',
    startDate: '2027-01',
    education: "Bachelor's in Elementary Education; Utah teaching license",
  },

  // One entry per question. `picked` and `typed` are Melissa's answer, already filled in.
  // `skills` are the professional skills that answer reveals.
  interview: [
    {
      intro: 'Melissa, going back after twelve years is hard. It is also very common. You already told me you taught second grade, so I will not ask you to list your skills. I will ask what you did.',
      question: 'Which of these have you done during your years at home?',
      selection: 'multiple',
      options: [
        'PTA or PTO officer, room parent, or school fundraising',
        'Organized schedules or carpools for kids’ activities',
        'Managed the family budget',
        'Cared for a family member with medical needs',
        'Taught or led a group at church or in the community',
        'Ran a home renovation or a big move',
      ],
      picked: [0, 1, 2],
      skills: ['Volunteer leadership', 'Scheduling and logistics', 'Budget management'],
    },
    {
      intro: 'A PTA officer does real leadership work. Let’s put numbers on it.',
      question: 'Tell me about the PTA fundraising. How big was it?',
      selection: 'single',
      options: [],
      typed: 'I was PTA vice president for two years. Our fall fun run raised about $18,000 with 60 volunteers.',
      skills: ['Event management', 'Fundraising: $18,000', 'Leading 60 volunteers'],
    },
    {
      intro: 'That is event management and fundraising. Employers pay for both.',
      question: 'And the schedules you organized? What did that involve?',
      selection: 'single',
      options: [],
      typed: 'I ran the neighborhood youth soccer league schedule: 12 teams and about 140 families each season.',
      skills: ['Operations coordination', 'Communication with 140 families'],
    },
    {
      intro: 'Twelve teams and 140 families is operations coordination. Last question.',
      question: 'What matters most in your next job? Tap in order.',
      selection: 'ranked',
      options: ['A flexible schedule', 'Getting back to work quickly', 'Pay', 'Using my teaching degree'],
      picked: [0, 1, 2],
      skills: [],
    },
  ],

  done: {
    intro: 'You said you were starting from zero. You just named 8 professional skills, each with proof.',
    question: 'I have what I need. Your plan is ready to build.',
  },

  roadmap: {
    summary: 'Melissa, you are not starting from zero. Twelve years at home gave you 8 skills employers pay for. Here are three pathways that fit school hours, and your first three steps.',
    gap_line: 'Career break, 2014–2026: full-time caregiver for four children. During this time I served two years as PTA vice president, led a fundraiser that raised $18,000 with 60 volunteers, and ran scheduling for a 12-team youth soccer league.',
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
