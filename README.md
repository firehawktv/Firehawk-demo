# Firehawk Video CMS

A custom CMS for managing video presentations with Mux.com integration. Features a responsive video grid/reel layout and a full admin dashboard for CRUD operations.

## Features

- **Video Library Management**: Store and organize videos with client, project, tags, and Mux embed IDs
- **Presentation Builder**: Create beautiful client presentations with selected videos
- **Two Layout Options**:
  - **Grid**: 3-6 videos displayed in a responsive grid with lightbox
  - **Reel**: Large player with thumbnail row below
- **Customizable Themes**: Dark/light themes with custom accent colors
- **Responsive Design**: Works on desktop, tablet, and mobile
- **View Tracking**: Track presentation views and last viewed dates
- **Expiration Dates**: Optional expiration for time-limited presentations

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose ODM
- **Templating**: EJS
- **Styling**: Tailwind CSS
- **Video Player**: Mux Player

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd Firehawk-demo
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Edit `.env` with your settings:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/firehawk
SESSION_SECRET=your-secret-key
```

5. Build CSS (optional, pre-built CSS included):
```bash
npm run css:build
```

6. Start the server:
```bash
npm run dev
```

7. Visit http://localhost:3000/admin

### Seed Sample Data (Optional)

```bash
npm run seed
```

## Project Structure

```
├── config/
│   └── db.js              # MongoDB connection
├── models/
│   ├── Video.js           # Video schema
│   └── Presentation.js    # Presentation schema
├── routes/
│   ├── api/
│   │   ├── videos.js      # Video CRUD API
│   │   └── presentations.js
│   ├── admin.js           # Admin dashboard routes
│   └── presentation.js    # Public presentation routes
├── views/
│   ├── admin/             # Admin dashboard views
│   ├── presentation/      # Client-facing presentation views
│   └── layouts/           # Layout templates
├── public/
│   └── css/               # Compiled CSS
├── src/
│   └── css/               # Tailwind source
├── scripts/
│   └── seed.js            # Database seeder
├── server.js              # Express server
└── package.json
```

## Usage

### Adding Videos

1. Go to Admin Dashboard → Videos → Add Video
2. Enter:
   - **Client**: Company name (e.g., "Nike")
   - **Project**: Project name (e.g., "Just Do It Campaign")
   - **Mux Embed ID**: The playback ID from your Mux dashboard
   - **Tags**: Comma-separated skills/tags (e.g., "commercial, motion graphics, vfx")

### Creating Presentations

1. Go to Admin Dashboard → Presentations → Create Presentation
2. Fill in:
   - **Client Name**: Who the presentation is for
   - **Client Logo URL**: Optional logo URL
   - **Message**: Personal message or description
   - **Videos**: Select 3-6 videos from your library
   - **Layout**: Choose Grid or Reel
   - **Theme**: Dark or Light
   - **Accent Color**: Custom brand color

3. Save and share the generated URL (e.g., `/p/nike-abc123`)

### Mux Integration

Videos are embedded using [Mux Player](https://docs.mux.com/guides/mux-player). To add a video:

1. Upload your video to [Mux](https://dashboard.mux.com)
2. Copy the Playback ID (e.g., `DS00Spx1CV902MCtPj5WknGlR100V00wES02rKGTWie014M`)
3. Paste it as the Embed ID in the admin dashboard

Thumbnails are automatically generated from Mux.

## API Endpoints

### Videos
- `GET /api/videos` - List all videos
- `GET /api/videos/:id` - Get single video
- `POST /api/videos` - Create video
- `PUT /api/videos/:id` - Update video
- `DELETE /api/videos/:id` - Delete video
- `GET /api/videos/clients` - Get unique clients
- `GET /api/videos/tags` - Get unique tags

### Presentations
- `GET /api/presentations` - List all presentations
- `GET /api/presentations/:id` - Get single presentation
- `POST /api/presentations` - Create presentation
- `PUT /api/presentations/:id` - Update presentation
- `DELETE /api/presentations/:id` - Delete presentation
- `POST /api/presentations/:id/duplicate` - Duplicate presentation

## Development

### Tailwind CSS

Watch for changes:
```bash
npm run css:watch
```

Build for production:
```bash
npm run css:build
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `MONGODB_URI` | MongoDB connection string | mongodb://localhost:27017/firehawk |
| `SESSION_SECRET` | Session encryption key | (generated) |
| `NODE_ENV` | Environment | development |

## MongoDB Schema

### Video
```javascript
{
  client: String,        // Required
  project: String,       // Required
  date: Date,
  tags: [String],
  embedId: String,       // Required, unique (Mux playback ID)
  title: String,
  description: String,
  thumbnail: String,
  duration: Number,
  isActive: Boolean
}
```

### Presentation
```javascript
{
  slug: String,          // Auto-generated unique URL slug
  client: String,        // Required
  clientLogo: String,
  date: Date,
  message: String,
  videos: [ObjectId],    // References to Video documents
  layout: 'grid' | 'reel',
  theme: 'light' | 'dark',
  primaryColor: String,
  backgroundColor: String,
  isActive: Boolean,
  viewCount: Number,
  lastViewed: Date,
  password: String,
  expiresAt: Date
}
```

## License

ISC
