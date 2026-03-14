module.exports = {
  books: [
    {
      title: 'Shadow Warrior',
      slug: 'shadow-warrior',
      author: 'Aria Voss',
      category: 'action',
      description: 'A fallen guardian rises through betrayal, war, and destiny.',
      coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=80',
      rating: 4.7,
      totalViews: 12000,
      viewsLast24h: 480,
      viewsLast7d: 2200,
      trendingScore: 0,
      featured: true
    },
    {
      title: 'Quarterly Hearts',
      slug: 'quarterly-hearts',
      author: 'Milan Reeves',
      category: 'finance',
      description: 'Love and risk intertwine inside a ruthless investment firm.',
      coverImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
      rating: 4.4,
      totalViews: 7800,
      viewsLast24h: 320,
      viewsLast7d: 1900,
      trendingScore: 0,
      featured: true
    },
    {
      title: 'The Last Laugh',
      slug: 'the-last-laugh',
      author: 'Nova Quinn',
      category: 'comedy',
      description: 'A struggling comedian discovers a notebook that predicts every punchline.',
      coverImage: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=800&q=80',
      rating: 4.2,
      totalViews: 5300,
      viewsLast24h: 240,
      viewsLast7d: 1300,
      trendingScore: 0,
      featured: false
    }
  ],
  chaptersBySlug: {
    'shadow-warrior': [
      { chapterNumber: 1, title: 'The Beginning', content: 'Storm clouds gathered as Kael returned to the ruined citadel.\n\nThe gate stood open, and silence was louder than battle.\n\nHe stepped through ash and memory, swearing revenge.' },
      { chapterNumber: 2, title: 'Dark Secret', content: 'The old archivist whispered a name Kael thought buried forever.\n\nBeneath the temple, a sigil glowed with forbidden power.\n\nHis blood answered before his mind could resist.' },
      { chapterNumber: 3, title: 'The War', content: 'Armies collided before sunrise.\n\nSteel sang, banners burned, and the prince fell.\n\nKael raised the shadow blade and the world changed.' }
    ],
    'quarterly-hearts': [
      { chapterNumber: 1, title: 'Opening Bell', content: 'At 9:30 a.m., the market opened and so did Nora\'s chance.\n\nShe pitched the deal that could save the firm.\n\nAcross the table sat the one rival she could never forget.' }
    ],
    'the-last-laugh': [
      { chapterNumber: 1, title: 'Mic Check', content: 'Eli bombed his set for the sixth week in a row.\n\nThen he found a notebook under the barstool.\n\nEvery joke inside worked perfectly.' }
    ]
  }
};
