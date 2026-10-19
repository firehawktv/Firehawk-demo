/**
 * Seed script to populate the database with sample data
 * Run with: npm run seed
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Video = require('../models/Video');
const Presentation = require('../models/Presentation');

// Sample Mux playback IDs (these are example IDs - replace with your actual Mux IDs)
const sampleMuxIds = [
  'DS00Spx1CV902MCtPj5WknGlR100V00wES02rKGTWie014M',
  'VZtzUzGRv02OLSjwDnGlHGMbNkYEYtgoc',
  'a4nOgmxGWg6gULfcBbAa00gXCucIZRGoN',
  '01YX00kPNIi9m00O6sCbP301S02cUG0201sab2',
  'Radians6GiNpfpJAMoZjpTenScTnf8Qw',
  '9GD00rXR7VFHM502KiwHBqn5E4VWlDtAo'
];

const sampleData = {
  videos: [
    {
      client: 'Nike',
      project: 'Just Do It Campaign',
      title: 'Brand Anthem',
      description: 'Epic brand anthem showcasing athletes pushing their limits',
      tags: ['commercial', 'sports', 'branding', 'cinematic'],
      embedId: sampleMuxIds[0]
    },
    {
      client: 'Nike',
      project: 'Air Max Launch',
      title: 'Product Launch Video',
      description: 'Dynamic product showcase for the new Air Max line',
      tags: ['commercial', 'product', 'motion graphics'],
      embedId: sampleMuxIds[1]
    },
    {
      client: 'Apple',
      project: 'iPhone Pro',
      title: 'Cinematic Mode',
      description: 'Showcasing the incredible camera capabilities',
      tags: ['commercial', 'tech', 'cinematic', 'vfx'],
      embedId: sampleMuxIds[2]
    },
    {
      client: 'Apple',
      project: 'WWDC Opener',
      title: 'Event Intro',
      description: 'Opening sequence for the developer conference',
      tags: ['motion graphics', 'animation', 'tech'],
      embedId: sampleMuxIds[3]
    },
    {
      client: 'Netflix',
      project: 'Original Series',
      title: 'Title Sequence',
      description: 'Animated title sequence for original content',
      tags: ['animation', 'title design', 'entertainment'],
      embedId: sampleMuxIds[4]
    },
    {
      client: 'Spotify',
      project: 'Wrapped 2024',
      title: 'Campaign Video',
      description: 'Year-end campaign celebrating user listening habits',
      tags: ['motion graphics', 'social', 'music'],
      embedId: sampleMuxIds[5]
    }
  ]
};

async function seed() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/firehawk');
    console.log('Connected to MongoDB');

    // Clear existing data
    await Video.deleteMany({});
    await Presentation.deleteMany({});
    console.log('Cleared existing data');

    // Insert videos
    const videos = await Video.insertMany(sampleData.videos);
    console.log(`Inserted ${videos.length} videos`);

    // Create sample presentations
    const presentations = [
      {
        client: 'Nike Marketing Team',
        message: 'Thank you for the opportunity to present our recent work. Here are the videos from our latest campaigns.',
        videos: videos.filter(v => v.client === 'Nike').map(v => v._id),
        layout: 'grid',
        theme: 'dark'
      },
      {
        client: 'Apple Creative Review',
        clientLogo: 'https://www.apple.com/ac/globalnav/7/en_US/images/be15095f-5a20-57d0-ad14-cf4c638e223a/globalnav_apple_image__b5er5ngrzxqq_large.svg',
        message: 'Presenting our latest work for Apple. These pieces showcase our capabilities in both live action and motion graphics.',
        videos: videos.filter(v => v.client === 'Apple').map(v => v._id),
        layout: 'reel',
        theme: 'dark',
        primaryColor: '#000000'
      },
      {
        client: 'Portfolio Showcase',
        message: 'A selection of our best work across various clients and industries.',
        videos: videos.map(v => v._id),
        layout: 'grid',
        theme: 'dark'
      }
    ];

    const createdPresentations = await Presentation.insertMany(presentations);
    console.log(`Created ${createdPresentations.length} presentations`);

    // Log the URLs
    console.log('\n=== Sample Presentation URLs ===');
    createdPresentations.forEach(p => {
      console.log(`${p.client}: /hello/${p.slug}`);
    });

    console.log('\nSeed completed successfully!');
    console.log('Start the server with: npm run dev');
    console.log('Then visit: http://localhost:3000/admin');

  } catch (error) {
    console.error('Seed error:', error);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

seed();
