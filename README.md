# 🎬 NoidaPulse

**What is Noida Watching?** - Real-time entertainment trends for Noida

![NoidaPulse](https://img.shields.io/badge/NoidaPulse-Live-purple)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green)

## 🚀 Features

- 📺 **240+ Shows Database** - Popular Indian & International shows
- 🔍 **Smart Search** - Fuzzy matching with spelling correction
- 📍 **143 Noida Sectors** - Location-based trending
- 📱 **Device Tracking** - Mobile, Laptop, Tablet, TV
- 📅 **Date/Time Filters** - Custom date and time range filtering
- 📺 **Season Tracking** - Track which season you're watching
- 📤 **WhatsApp Sharing** - Share trends with friends
- 🖼️ **Auto Posters** - Fetched from OMDb API

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API Routes
- **Database**: MongoDB Atlas
- **External API**: OMDb API

## 🏃 Quick Start

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (free tier works)
- OMDb API key (free at omdbapi.com)

### Installation

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/noidapulse.git
cd noidapulse

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your credentials

# Run development server
yarn dev
```

### Environment Variables

```env
MONGO_URL=mongodb+srv://...
DB_NAME=noidapulse
OMDB_API_KEY=your_api_key
```

## 📦 Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/noidapulse)

1. Click the button above or go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Add environment variables
4. Deploy!

## 📱 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/sectors` | GET | Get Noida sectors |
| `/api/devices` | GET | Get device types |
| `/api/timeslots` | GET | Get time slots |
| `/api/search?q=` | GET | Search shows |
| `/api/popular` | GET | Get popular shows |
| `/api/trending` | GET | Get trending shows |
| `/api/checkin` | POST | Add a vibe |
| `/api/share` | GET | Get shareable data |
| `/api/stats` | GET | Get statistics |

## 🎯 Time Slots

- 🌅 Morning (6AM-12PM)
- ☀️ Afternoon (12PM-5PM)
- 🌆 Evening (5PM-9PM)
- 🌙 Night (9PM-12AM)
- 🌃 Late Night (12AM-3AM)
- 🌄 Early Morning (3AM-6AM)

## 📄 License

MIT License - Feel free to use and modify!

## 🙏 Credits

- [OMDb API](https://www.omdbapi.com/) for movie/show data
- [shadcn/ui](https://ui.shadcn.com/) for UI components
- Made with 💜 for Noida
