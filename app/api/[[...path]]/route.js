import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';

const MONGO_URL = process.env.MONGO_URL;
const DB_NAME = process.env.DB_NAME || 'noidapulse';
const OMDB_API_KEY = process.env.OMDB_API_KEY;

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(MONGO_URL);
  await client.connect();
  const db = client.db(DB_NAME);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Noida sectors data
const NOIDA_SECTORS = [
  { id: '201301', name: 'Sector 1-10', pincode: '201301' },
  { id: '201302', name: 'Sector 11-20', pincode: '201302' },
  { id: '201303', name: 'Sector 21-30', pincode: '201303' },
  { id: '201304', name: 'Sector 31-40', pincode: '201304' },
  { id: '201305', name: 'Sector 41-50', pincode: '201305' },
  { id: '201306', name: 'Sector 51-60', pincode: '201306' },
  { id: '201307', name: 'Sector 61-70', pincode: '201307' },
  { id: '201308', name: 'Sector 71-80', pincode: '201308' },
  { id: '201309', name: 'Sector 81-100', pincode: '201309' },
  { id: '201310', name: 'Sector 100+', pincode: '201310' },
];

// Calculate trend score with recency boost
function calculateTrendScore(checkins) {
  const now = Date.now();
  const ONE_HOUR = 60 * 60 * 1000;
  const ONE_DAY = 24 * ONE_HOUR;

  let score = 0;
  checkins.forEach((checkin) => {
    const age = now - new Date(checkin.createdAt).getTime();
    if (age < ONE_HOUR) {
      score += 10; // Very recent
    } else if (age < 6 * ONE_HOUR) {
      score += 5; // Recent
    } else if (age < ONE_DAY) {
      score += 2; // Today
    } else {
      score += 1; // Older
    }
  });
  return score;
}

async function handleRequest(request, context) {
  const { params } = context;
  const pathSegments = params?.path || [];
  const path = '/' + pathSegments.join('/');
  const method = request.method;

  // Add CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // Handle preflight
  if (method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers });
  }

  try {
    // Health check
    if (path === '/health' && method === 'GET') {
      return NextResponse.json({ status: 'healthy', timestamp: new Date().toISOString() }, { headers });
    }

    // Get sectors
    if (path === '/sectors' && method === 'GET') {
      return NextResponse.json({ sectors: NOIDA_SECTORS }, { headers });
    }

    // Search shows using OMDb API
    if (path === '/search' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q');

      if (!query || query.length < 2) {
        return NextResponse.json({ results: [] }, { headers });
      }

      const apiKey = process.env.OMDB_API_KEY;
      const omdbUrl = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`;
      
      const omdbResponse = await fetch(omdbUrl);
      const omdbData = await omdbResponse.json();

      if (omdbData.Response === 'True') {
        const results = omdbData.Search.map((item) => ({
          imdbId: item.imdbID,
          title: item.Title,
          year: item.Year,
          type: item.Type,
          poster: item.Poster !== 'N/A' ? item.Poster : null,
        }));
        return NextResponse.json({ results }, { headers });
      }

      return NextResponse.json({ results: [] }, { headers });
    }

    // Get trending shows
    if (path === '/trending' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const sector = searchParams.get('sector');

      const { db } = await connectToDatabase();
      const checkinsCollection = db.collection('checkins');

      // Get checkins from last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const query = { createdAt: { $gte: sevenDaysAgo } };
      if (sector) {
        query.sectorId = sector;
      }

      const checkins = await checkinsCollection.find(query).toArray();

      // Group by show
      const showMap = new Map();
      checkins.forEach((checkin) => {
        const key = checkin.imdbId;
        if (!showMap.has(key)) {
          showMap.set(key, {
            imdbId: checkin.imdbId,
            title: checkin.title,
            poster: checkin.poster,
            type: checkin.type,
            year: checkin.year,
            checkins: [],
          });
        }
        showMap.get(key).checkins.push(checkin);
      });

      // Calculate scores and sort
      const trending = Array.from(showMap.values())
        .map((show) => ({
          ...show,
          score: calculateTrendScore(show.checkins),
          checkinCount: show.checkins.length,
          checkins: undefined,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return NextResponse.json({ trending }, { headers });
    }

    // Create check-in
    if (path === '/checkin' && method === 'POST') {
      const body = await request.json();
      const { imdbId, title, poster, type, year, sectorId } = body;

      if (!imdbId || !title || !sectorId) {
        return NextResponse.json(
          { error: 'Missing required fields: imdbId, title, sectorId' },
          { status: 400, headers }
        );
      }

      const sector = NOIDA_SECTORS.find((s) => s.id === sectorId);
      if (!sector) {
        return NextResponse.json(
          { error: 'Invalid sector' },
          { status: 400, headers }
        );
      }

      const { db } = await connectToDatabase();
      const checkinsCollection = db.collection('checkins');

      const checkin = {
        id: uuidv4(),
        imdbId,
        title,
        poster: poster || null,
        type: type || 'unknown',
        year: year || null,
        sectorId,
        sectorName: sector.name,
        createdAt: new Date(),
      };

      await checkinsCollection.insertOne(checkin);

      return NextResponse.json({ success: true, checkin }, { status: 201, headers });
    }

    // Get stats
    if (path === '/stats' && method === 'GET') {
      const { db } = await connectToDatabase();
      const checkinsCollection = db.collection('checkins');

      const totalCheckins = await checkinsCollection.countDocuments();
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayCheckins = await checkinsCollection.countDocuments({
        createdAt: { $gte: todayStart },
      });

      // Get unique shows
      const uniqueShows = await checkinsCollection.distinct('imdbId');

      // Get top sector
      const sectorStats = await checkinsCollection
        .aggregate([
          { $group: { _id: '$sectorId', count: { $sum: 1 }, name: { $first: '$sectorName' } } },
          { $sort: { count: -1 } },
          { $limit: 1 },
        ])
        .toArray();

      return NextResponse.json(
        {
          totalCheckins,
          todayCheckins,
          uniqueShows: uniqueShows.length,
          topSector: sectorStats[0] || null,
        },
        { headers }
      );
    }

    // Get shareable card data for a sector
    if (path === '/share' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const sector = searchParams.get('sector');

      const { db } = await connectToDatabase();
      const checkinsCollection = db.collection('checkins');

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const query = { createdAt: { $gte: sevenDaysAgo } };
      
      let sectorName = 'All of Noida';
      if (sector) {
        query.sectorId = sector;
        const sectorData = NOIDA_SECTORS.find((s) => s.id === sector);
        sectorName = sectorData ? sectorData.name : 'Noida';
      }

      const checkins = await checkinsCollection.find(query).toArray();

      // Group by show
      const showMap = new Map();
      checkins.forEach((checkin) => {
        const key = checkin.imdbId;
        if (!showMap.has(key)) {
          showMap.set(key, {
            title: checkin.title,
            checkins: [],
          });
        }
        showMap.get(key).checkins.push(checkin);
      });

      const trending = Array.from(showMap.values())
        .map((show) => ({
          title: show.title,
          score: calculateTrendScore(show.checkins),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      return NextResponse.json(
        {
          sectorName,
          trending: trending.map((t) => t.title),
          generatedAt: new Date().toISOString(),
        },
        { headers }
      );
    }

    // 404 for unknown routes
    return NextResponse.json({ error: 'Not found' }, { status: 404, headers });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500, headers }
    );
  }
}

export async function GET(request, context) {
  return handleRequest(request, context);
}

export async function POST(request, context) {
  return handleRequest(request, context);
}

export async function PUT(request, context) {
  return handleRequest(request, context);
}

export async function DELETE(request, context) {
  return handleRequest(request, context);
}

export async function OPTIONS(request, context) {
  return handleRequest(request, context);
}
