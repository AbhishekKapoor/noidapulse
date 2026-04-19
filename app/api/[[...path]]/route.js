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

// Calculate Levenshtein distance for fuzzy matching
function levenshteinDistance(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

// Normalize show title using fuzzy matching against local DB and common variations
function normalizeShowTitle(userInput, localShows) {
  const input = userInput.toLowerCase().trim().replace(/[^a-z0-9\s]/g, '');
  
  // Common spelling variations map
  const variations = {
    // Original shows
    'mirjapur': 'Mirzapur',
    'mirzpur': 'Mirzapur',
    'mirza pur': 'Mirzapur',
    'panchyat': 'Panchayat',
    'panchayaat': 'Panchayat',
    'panchait': 'Panchayat',
    'scam1992': 'Scam 1992',
    'scam 92': 'Scam 1992',
    'scam92': 'Scam 1992',
    'sacredgames': 'Sacred Games',
    'sacred game': 'Sacred Games',
    'familyman': 'The Family Man',
    'family men': 'The Family Man',
    'the familyman': 'The Family Man',
    'asur': 'Asur',
    'assur': 'Asur',
    'farzi': 'Farzi',
    'farzy': 'Farzi',
    'delhi crime': 'Delhi Crime',
    'delhicrime': 'Delhi Crime',
    'kota factory': 'Kota Factory',
    'kotafactory': 'Kota Factory',
    'paatal lok': 'Paatal Lok',
    'patal lok': 'Paatal Lok',
    'patallok': 'Paatal Lok',
    'breathe into shadows': 'Breathe Into the Shadows',
    '3idiots': '3 Idiots',
    'three idiots': '3 Idiots',
    'dangal': 'Dangal',
    'pk': 'PK',
    'strangerthings': 'Stranger Things',
    'stranger thing': 'Stranger Things',
    'money heist': 'Money Heist',
    'moneyheist': 'Money Heist',
    'breakingbad': 'Breaking Bad',
    'gameofthrones': 'Game of Thrones',
    'game of throne': 'Game of Thrones',
    // New additions
    'gangs of waseypur': 'Gangs of Wasseypur',
    'gangsofwasseypur': 'Gangs of Wasseypur',
    'wasseypur': 'Gangs of Wasseypur',
    'uri': 'Uri: The Surgical Strike',
    'uri surgical strike': 'Uri: The Surgical Strike',
    '12thfail': '12th Fail',
    'twelfth fail': '12th Fail',
    '12 fail': '12th Fail',
    'animal': 'Animal',
    'dunki': 'Dunki',
    'jawan': 'Jawan',
    'pathaan': 'Pathaan',
    'pathan': 'Pathaan',
    'aashram': 'Aashram',
    'ashram': 'Aashram',
    'laapataa ladies': 'Laapataa Ladies',
    'laapata ladies': 'Laapataa Ladies',
    'crew': 'Crew',
    'stree2': 'Stree 2',
    'stree 2': 'Stree 2',
    'tumbbad': 'Tumbbad',
    'tumbad': 'Tumbbad',
    'kahaani': 'Kahaani',
    'kahani': 'Kahaani',
    'pink': 'Pink',
    'queen': 'Queen',
    'haider': 'Haider',
    'omkara': 'Omkara',
    'maqbool': 'Maqbool',
    'raazi': 'Raazi',
    'razi': 'Raazi',
    'kedarnath': 'Kedarnath',
    'lagaan': 'Lagaan',
    'lagan': 'Lagaan',
    'devdas': 'Devdas',
    'padmaavat': 'Padmaavat',
    'padmavat': 'Padmaavat',
    'padmavati': 'Padmaavat',
    'bajirao mastani': 'Bajirao Mastani',
    'bajirao': 'Bajirao Mastani',
    'gangubai': 'Gangubai Kathiawadi',
    'gangubai kathiawadi': 'Gangubai Kathiawadi',
    'rrr': 'RRR',
    'baahubali': 'Baahubali: The Beginning',
    'bahubali': 'Baahubali: The Beginning',
    'pushpa': 'Pushpa: The Rise',
    'kgf': 'KGF Chapter 1',
    'kgf1': 'KGF Chapter 1',
    'kgf2': 'KGF Chapter 2',
    'vikram': 'Vikram',
    'leo': 'Leo',
    'jailer': 'Jailer',
    'dil chahta hai': 'Dil Chahta Hai',
    'dilchahtahai': 'Dil Chahta Hai',
    'kal ho na ho': 'Kal Ho Naa Ho',
    'kal ho naa ho': 'Kal Ho Naa Ho',
    'kabhi khushi kabhi gham': 'Kabhi Khushi Kabhie Gham',
    'k3g': 'Kabhi Khushi Kabhie Gham',
    'yjhd': 'Yeh Jawaani Hai Deewani',
    'yeh jawaani hai deewani': 'Yeh Jawaani Hai Deewani',
    'znmd': 'Zindagi Na Milegi Dobara',
    'zindagi na milegi dobara': 'Zindagi Na Milegi Dobara',
    'rockstar': 'Rockstar',
    'tamasha': 'Tamasha',
    'barfi': 'Barfi!',
    'dear zindagi': 'Dear Zindagi',
    'wake up sid': 'Wake Up Sid',
    'kapoor and sons': 'Kapoor & Sons',
    'kapoor sons': 'Kapoor & Sons',
    'inside edge': 'Inside Edge',
    'insideedge': 'Inside Edge',
    'dahaad': 'Dahaad',
    'dahad': 'Dahaad',
    'jubilee': 'Jubilee',
    'aranyak': 'Aranyak',
    'aranayak': 'Aranyak',
    'guns and gulaabs': 'Guns & Gulaabs',
    'guns gulaabs': 'Guns & Gulaabs',
    'ic814': 'IC 814: The Kandahar Hijack',
    'kandahar hijack': 'IC 814: The Kandahar Hijack',
    'khakee bihar': 'Khakee: The Bihar Chapter',
    'khaki bihar': 'Khakee: The Bihar Chapter',
    'tabbar': 'Tabbar',
    'tabar': 'Tabbar',
    'broken but beautiful': 'Broken But Beautiful',
    'bbb': 'Broken But Beautiful',
  };
  
  // Check exact match in variations
  if (variations[input]) {
    return variations[input];
  }
  
  // Check fuzzy match against local shows
  let bestMatch = null;
  let bestDistance = Infinity;
  const threshold = Math.max(3, Math.floor(input.length * 0.3)); // Allow 30% character difference
  
  for (const show of localShows) {
    const showTitle = show.title.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const distance = levenshteinDistance(input, showTitle);
    
    if (distance < bestDistance && distance <= threshold) {
      bestDistance = distance;
      bestMatch = show.title;
    }
  }
  
  if (bestMatch) {
    return bestMatch;
  }
  
  // Fallback: Title case the input
  return userInput.split(' ').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  ).join(' ');
}

// Fetch poster from OMDb for a show title
async function fetchPosterFromOMDb(title) {
  try {
    const response = await fetch(
      `http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${encodeURIComponent(title)}`
    );
    const data = await response.json();
    if (data.Response === 'True' && data.Poster && data.Poster !== 'N/A') {
      return {
        poster: data.Poster,
        year: data.Year,
        imdbId: data.imdbID,
      };
    }
  } catch (error) {
    console.error('OMDb poster fetch error:', error);
  }
  return null;
}

// Generate actual Noida sectors (1-135 + Greater Noida)
const NOIDA_SECTORS = [
  ...Array.from({ length: 135 }, (_, i) => ({
    id: `sector-${i + 1}`,
    name: `Sector ${i + 1}`,
    area: 'Noida'
  })),
  { id: 'greater-noida-alpha', name: 'Alpha', area: 'Greater Noida' },
  { id: 'greater-noida-beta', name: 'Beta', area: 'Greater Noida' },
  { id: 'greater-noida-gamma', name: 'Gamma', area: 'Greater Noida' },
  { id: 'greater-noida-delta', name: 'Delta', area: 'Greater Noida' },
  { id: 'greater-noida-chi', name: 'Chi', area: 'Greater Noida' },
  { id: 'greater-noida-omega', name: 'Omega', area: 'Greater Noida' },
  { id: 'noida-extension', name: 'Noida Extension', area: 'Greater Noida' },
  { id: 'techzone', name: 'Tech Zone', area: 'Greater Noida' },
];

// Device types
const DEVICE_TYPES = [
  { id: 'mobile', name: 'Mobile', icon: '📱' },
  { id: 'laptop', name: 'Laptop', icon: '💻' },
  { id: 'tablet', name: 'Tablet', icon: '📲' },
  { id: 'tv', name: 'TV', icon: '📺' },
];

// Local shows database with platform info
const LOCAL_SHOWS = [
  {"id": "local-1", "title": "Mirzapur", "type": "series", "platform": "Prime"},
  {"id": "local-2", "title": "Panchayat", "type": "series", "platform": "Prime"},
  {"id": "local-3", "title": "The Family Man", "type": "series", "platform": "Prime"},
  {"id": "local-4", "title": "Made in Heaven", "type": "series", "platform": "Prime"},
  {"id": "local-5", "title": "Farzi", "type": "series", "platform": "Prime"},
  {"id": "local-6", "title": "Paatal Lok", "type": "series", "platform": "Prime"},
  {"id": "local-7", "title": "Breathe", "type": "series", "platform": "Prime"},
  {"id": "local-8", "title": "Breathe Into the Shadows", "type": "series", "platform": "Prime"},
  {"id": "local-9", "title": "Delhi Crime", "type": "series", "platform": "Netflix"},
  {"id": "local-10", "title": "Sacred Games", "type": "series", "platform": "Netflix"},
  {"id": "local-11", "title": "Jamtara", "type": "series", "platform": "Netflix"},
  {"id": "local-12", "title": "Kota Factory", "type": "series", "platform": "Netflix"},
  {"id": "local-13", "title": "She", "type": "series", "platform": "Netflix"},
  {"id": "local-14", "title": "Class", "type": "series", "platform": "Netflix"},
  {"id": "local-15", "title": "Rana Naidu", "type": "series", "platform": "Netflix"},
  {"id": "local-16", "title": "Trial by Fire", "type": "series", "platform": "Netflix"},
  {"id": "local-17", "title": "Scam 1992", "type": "series", "platform": "SonyLIV"},
  {"id": "local-18", "title": "Scam 2003", "type": "series", "platform": "SonyLIV"},
  {"id": "local-19", "title": "Rocket Boys", "type": "series", "platform": "SonyLIV"},
  {"id": "local-20", "title": "Maharani", "type": "series", "platform": "SonyLIV"},
  {"id": "local-21", "title": "Undekhi", "type": "series", "platform": "SonyLIV"},
  {"id": "local-22", "title": "Avrodh", "type": "series", "platform": "SonyLIV"},
  {"id": "local-23", "title": "Asur", "type": "series", "platform": "JioHotstar"},
  {"id": "local-24", "title": "Special OPS", "type": "series", "platform": "JioHotstar"},
  {"id": "local-25", "title": "Criminal Justice", "type": "series", "platform": "JioHotstar"},
  {"id": "local-26", "title": "Aarya", "type": "series", "platform": "JioHotstar"},
  {"id": "local-27", "title": "Human", "type": "series", "platform": "JioHotstar"},
  {"id": "local-28", "title": "Hostages", "type": "series", "platform": "JioHotstar"},
  {"id": "local-29", "title": "The Night Manager (India)", "type": "series", "platform": "JioHotstar"},
  {"id": "local-30", "title": "Taaza Khabar", "type": "series", "platform": "JioHotstar"},
  {"id": "local-31", "title": "3 Idiots", "type": "movie", "platform": "Various"},
  {"id": "local-32", "title": "Dangal", "type": "movie", "platform": "Various"},
  {"id": "local-33", "title": "PK", "type": "movie", "platform": "Various"},
  {"id": "local-34", "title": "Zindagi Na Milegi Dobara", "type": "movie", "platform": "Various"},
  {"id": "local-35", "title": "Yeh Jawaani Hai Deewani", "type": "movie", "platform": "Various"},
  {"id": "local-36", "title": "Kabir Singh", "type": "movie", "platform": "Various"},
  {"id": "local-37", "title": "Andhadhun", "type": "movie", "platform": "Various"},
  {"id": "local-38", "title": "Drishyam", "type": "movie", "platform": "Various"},
  {"id": "local-39", "title": "Drishyam 2", "type": "movie", "platform": "Various"},
  {"id": "local-40", "title": "Gully Boy", "type": "movie", "platform": "Various"},
  {"id": "local-41", "title": "Article 15", "type": "movie", "platform": "Various"},
  {"id": "local-42", "title": "Stree", "type": "movie", "platform": "Various"},
  {"id": "local-43", "title": "Bhediya", "type": "movie", "platform": "Various"},
  {"id": "local-44", "title": "Bhool Bhulaiyaa 2", "type": "movie", "platform": "Various"},
  {"id": "local-45", "title": "War", "type": "movie", "platform": "Various"},
  {"id": "local-46", "title": "Pathaan", "type": "movie", "platform": "Various"},
  {"id": "local-47", "title": "Jawan", "type": "movie", "platform": "Various"},
  {"id": "local-48", "title": "Tiger Zinda Hai", "type": "movie", "platform": "Various"},
  {"id": "local-49", "title": "Bajrangi Bhaijaan", "type": "movie", "platform": "Various"},
  {"id": "local-50", "title": "Chhichhore", "type": "movie", "platform": "Various"},
  {"id": "local-51", "title": "RRR", "type": "movie", "platform": "Various"},
  {"id": "local-52", "title": "Baahubali: The Beginning", "type": "movie", "platform": "Various"},
  {"id": "local-53", "title": "Baahubali 2", "type": "movie", "platform": "Various"},
  {"id": "local-54", "title": "Pushpa: The Rise", "type": "movie", "platform": "Various"},
  {"id": "local-55", "title": "KGF Chapter 1", "type": "movie", "platform": "Various"},
  {"id": "local-56", "title": "KGF Chapter 2", "type": "movie", "platform": "Various"},
  {"id": "local-57", "title": "Vikram", "type": "movie", "platform": "Various"},
  {"id": "local-58", "title": "Master", "type": "movie", "platform": "Various"},
  {"id": "local-59", "title": "Leo", "type": "movie", "platform": "Various"},
  {"id": "local-60", "title": "Jailer", "type": "movie", "platform": "Various"},
  {"id": "local-61", "title": "Pitchers", "type": "series", "platform": "ZEE5"},
  {"id": "local-62", "title": "TVF Tripling", "type": "series", "platform": "ZEE5"},
  {"id": "local-63", "title": "Permanent Roommates", "type": "series", "platform": "ZEE5"},
  {"id": "local-64", "title": "Aspirants", "type": "series", "platform": "YouTube"},
  {"id": "local-65", "title": "Gullak", "type": "series", "platform": "SonyLIV"},
  {"id": "local-66", "title": "College Romance", "type": "series", "platform": "SonyLIV"},
  {"id": "local-67", "title": "Flames", "type": "series", "platform": "Prime"},
  {"id": "local-68", "title": "Little Things", "type": "series", "platform": "Netflix"},
  {"id": "local-69", "title": "Decoupled", "type": "series", "platform": "Netflix"},
  {"id": "local-70", "title": "Masaba Masaba", "type": "series", "platform": "Netflix"},
  {"id": "local-71", "title": "Lust Stories", "type": "movie", "platform": "Netflix"},
  {"id": "local-72", "title": "Ghost Stories", "type": "movie", "platform": "Netflix"},
  {"id": "local-73", "title": "Monica O My Darling", "type": "movie", "platform": "Netflix"},
  {"id": "local-74", "title": "Jaane Jaan", "type": "movie", "platform": "Netflix"},
  {"id": "local-75", "title": "Darlings", "type": "movie", "platform": "Netflix"},
  {"id": "local-76", "title": "Sherni", "type": "movie", "platform": "Prime"},
  {"id": "local-77", "title": "Sardar Udham", "type": "movie", "platform": "Prime"},
  {"id": "local-78", "title": "Shershaah", "type": "movie", "platform": "Prime"},
  {"id": "local-79", "title": "Ram Setu", "type": "movie", "platform": "Prime"},
  {"id": "local-80", "title": "Atrangi Re", "type": "movie", "platform": "JioHotstar"},
  {"id": "local-81", "title": "Housefull", "type": "movie", "platform": "Various"},
  {"id": "local-82", "title": "Golmaal", "type": "movie", "platform": "Various"},
  {"id": "local-83", "title": "Welcome", "type": "movie", "platform": "Various"},
  {"id": "local-84", "title": "Hera Pheri", "type": "movie", "platform": "Various"},
  {"id": "local-85", "title": "Phir Hera Pheri", "type": "movie", "platform": "Various"},
  {"id": "local-86", "title": "Munna Bhai MBBS", "type": "movie", "platform": "Various"},
  {"id": "local-87", "title": "Lage Raho Munna Bhai", "type": "movie", "platform": "Various"},
  {"id": "local-88", "title": "Don", "type": "movie", "platform": "Various"},
  {"id": "local-89", "title": "Don 2", "type": "movie", "platform": "Various"},
  {"id": "local-90", "title": "Raees", "type": "movie", "platform": "Various"},
  {"id": "local-91", "title": "Black Mirror", "type": "series", "platform": "Netflix"},
  {"id": "local-92", "title": "Stranger Things", "type": "series", "platform": "Netflix"},
  {"id": "local-93", "title": "Money Heist", "type": "series", "platform": "Netflix"},
  {"id": "local-94", "title": "Breaking Bad", "type": "series", "platform": "Netflix"},
  {"id": "local-95", "title": "Game of Thrones", "type": "series", "platform": "JioHotstar"},
  {"id": "local-96", "title": "The Boys", "type": "series", "platform": "Prime"},
  {"id": "local-97", "title": "Reacher", "type": "series", "platform": "Prime"},
  {"id": "local-98", "title": "Loki", "type": "series", "platform": "JioHotstar"},
  {"id": "local-99", "title": "WandaVision", "type": "series", "platform": "JioHotstar"},
  {"id": "local-100", "title": "Narcos", "type": "series", "platform": "Netflix"},
  {"id": "local-101", "title": "Bigg Boss", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-102", "title": "Shark Tank India", "type": "tv", "platform": "SonyLIV"},
  {"id": "local-103", "title": "Indian Idol", "type": "tv", "platform": "SonyLIV"},
  {"id": "local-104", "title": "Kaun Banega Crorepati", "type": "tv", "platform": "SonyLIV"},
  {"id": "local-105", "title": "Roadies", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-106", "title": "Splitsvilla", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-107", "title": "MTV Hustle", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-108", "title": "Dance India Dance", "type": "tv", "platform": "ZEE5"},
  {"id": "local-109", "title": "Sa Re Ga Ma Pa", "type": "tv", "platform": "ZEE5"},
  {"id": "local-110", "title": "Taarak Mehta Ka Ooltah Chashmah", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-111", "title": "CID", "type": "tv", "platform": "SonyLIV"},
  {"id": "local-112", "title": "Crime Patrol", "type": "tv", "platform": "SonyLIV"},
  {"id": "local-113", "title": "Savdhaan India", "type": "tv", "platform": "Various"},
  {"id": "local-114", "title": "Kumkum Bhagya", "type": "tv", "platform": "ZEE5"},
  {"id": "local-115", "title": "Naagin", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-116", "title": "Yeh Rishta Kya Kehlata Hai", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-117", "title": "Anupamaa", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-118", "title": "Kasautii Zindagii Kay", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-119", "title": "Balika Vadhu", "type": "tv", "platform": "JioHotstar"},
  {"id": "local-120", "title": "Mahabharat", "type": "tv", "platform": "JioHotstar"},
  // New additions (121-240)
  {"id": "local-121", "title": "Queen", "type": "movie", "platform": "Various"},
  {"id": "local-122", "title": "Kahaani", "type": "movie", "platform": "Various"},
  {"id": "local-123", "title": "Talvar", "type": "movie", "platform": "Various"},
  {"id": "local-124", "title": "No One Killed Jessica", "type": "movie", "platform": "Various"},
  {"id": "local-125", "title": "Pink", "type": "movie", "platform": "Various"},
  {"id": "local-126", "title": "Badla", "type": "movie", "platform": "Netflix"},
  {"id": "local-127", "title": "Karthik Calling Karthik", "type": "movie", "platform": "Various"},
  {"id": "local-128", "title": "Talaash", "type": "movie", "platform": "Various"},
  {"id": "local-129", "title": "Detective Byomkesh Bakshy!", "type": "movie", "platform": "Various"},
  {"id": "local-130", "title": "Raat Akeli Hai", "type": "movie", "platform": "Netflix"},
  {"id": "local-131", "title": "NH10", "type": "movie", "platform": "Various"},
  {"id": "local-132", "title": "Udta Punjab", "type": "movie", "platform": "Various"},
  {"id": "local-133", "title": "Haider", "type": "movie", "platform": "Various"},
  {"id": "local-134", "title": "Omkara", "type": "movie", "platform": "Various"},
  {"id": "local-135", "title": "Maqbool", "type": "movie", "platform": "Various"},
  {"id": "local-136", "title": "Gangs of Wasseypur", "type": "movie", "platform": "Various"},
  {"id": "local-137", "title": "Gangs of Wasseypur 2", "type": "movie", "platform": "Various"},
  {"id": "local-138", "title": "Raman Raghav 2.0", "type": "movie", "platform": "Various"},
  {"id": "local-139", "title": "Black Friday", "type": "movie", "platform": "Various"},
  {"id": "local-140", "title": "Satya", "type": "movie", "platform": "Various"},
  {"id": "local-141", "title": "Company", "type": "movie", "platform": "Various"},
  {"id": "local-142", "title": "Sarkar", "type": "movie", "platform": "Various"},
  {"id": "local-143", "title": "Shootout at Lokhandwala", "type": "movie", "platform": "Various"},
  {"id": "local-144", "title": "Shootout at Wadala", "type": "movie", "platform": "Various"},
  {"id": "local-145", "title": "Once Upon a Time in Mumbaai", "type": "movie", "platform": "Various"},
  {"id": "local-146", "title": "Raazi", "type": "movie", "platform": "Prime"},
  {"id": "local-147", "title": "Uri: The Surgical Strike", "type": "movie", "platform": "ZEE5"},
  {"id": "local-148", "title": "Lakshya", "type": "movie", "platform": "Various"},
  {"id": "local-149", "title": "Border", "type": "movie", "platform": "Various"},
  {"id": "local-150", "title": "LOC Kargil", "type": "movie", "platform": "Various"},
  {"id": "local-151", "title": "Kesari", "type": "movie", "platform": "Various"},
  {"id": "local-152", "title": "Shahid", "type": "movie", "platform": "Various"},
  {"id": "local-153", "title": "Aligarh", "type": "movie", "platform": "Various"},
  {"id": "local-154", "title": "Newton", "type": "movie", "platform": "Various"},
  {"id": "local-155", "title": "Masaan", "type": "movie", "platform": "Various"},
  {"id": "local-156", "title": "Lunchbox", "type": "movie", "platform": "Various"},
  {"id": "local-157", "title": "October", "type": "movie", "platform": "Prime"},
  {"id": "local-158", "title": "Tamasha", "type": "movie", "platform": "Various"},
  {"id": "local-159", "title": "Rockstar", "type": "movie", "platform": "Various"},
  {"id": "local-160", "title": "Barfi!", "type": "movie", "platform": "Various"},
  {"id": "local-161", "title": "Wake Up Sid", "type": "movie", "platform": "Various"},
  {"id": "local-162", "title": "Dear Zindagi", "type": "movie", "platform": "Netflix"},
  {"id": "local-163", "title": "Kapoor & Sons", "type": "movie", "platform": "Netflix"},
  {"id": "local-164", "title": "Humpty Sharma Ki Dulhania", "type": "movie", "platform": "Various"},
  {"id": "local-165", "title": "Badrinath Ki Dulhania", "type": "movie", "platform": "Various"},
  {"id": "local-166", "title": "Kal Ho Naa Ho", "type": "movie", "platform": "Various"},
  {"id": "local-167", "title": "Kabhi Khushi Kabhie Gham", "type": "movie", "platform": "Various"},
  {"id": "local-168", "title": "Dil Chahta Hai", "type": "movie", "platform": "Various"},
  {"id": "local-169", "title": "Swades", "type": "movie", "platform": "Various"},
  {"id": "local-170", "title": "Lagaan", "type": "movie", "platform": "Various"},
  {"id": "local-171", "title": "Devdas", "type": "movie", "platform": "Various"},
  {"id": "local-172", "title": "Padmaavat", "type": "movie", "platform": "Various"},
  {"id": "local-173", "title": "Bajirao Mastani", "type": "movie", "platform": "Various"},
  {"id": "local-174", "title": "Ram-Leela", "type": "movie", "platform": "Various"},
  {"id": "local-175", "title": "Gangubai Kathiawadi", "type": "movie", "platform": "Netflix"},
  {"id": "local-176", "title": "Tumbbad", "type": "movie", "platform": "Prime"},
  {"id": "local-177", "title": "Stree 2", "type": "movie", "platform": "Various"},
  {"id": "local-178", "title": "Munjya", "type": "movie", "platform": "Various"},
  {"id": "local-179", "title": "Roohi", "type": "movie", "platform": "Various"},
  {"id": "local-180", "title": "Bhoot: Part One", "type": "movie", "platform": "Prime"},
  {"id": "local-181", "title": "The Kerala Story", "type": "movie", "platform": "Various"},
  {"id": "local-182", "title": "Article 370", "type": "movie", "platform": "Various"},
  {"id": "local-183", "title": "Sam Bahadur", "type": "movie", "platform": "ZEE5"},
  {"id": "local-184", "title": "Maidaan", "type": "movie", "platform": "Various"},
  {"id": "local-185", "title": "12th Fail", "type": "movie", "platform": "JioHotstar"},
  {"id": "local-186", "title": "OMG 2", "type": "movie", "platform": "Netflix"},
  {"id": "local-187", "title": "Laapataa Ladies", "type": "movie", "platform": "Netflix"},
  {"id": "local-188", "title": "Crew", "type": "movie", "platform": "Various"},
  {"id": "local-189", "title": "Animal", "type": "movie", "platform": "Netflix"},
  {"id": "local-190", "title": "Dunki", "type": "movie", "platform": "Netflix"},
  {"id": "local-191", "title": "Inside Edge", "type": "series", "platform": "Prime"},
  {"id": "local-192", "title": "Bandish Bandits", "type": "series", "platform": "Prime"},
  {"id": "local-193", "title": "Four More Shots Please", "type": "series", "platform": "Prime"},
  {"id": "local-194", "title": "Hush Hush", "type": "series", "platform": "Prime"},
  {"id": "local-195", "title": "Dahaad", "type": "series", "platform": "Prime"},
  {"id": "local-196", "title": "Mumbai Diaries", "type": "series", "platform": "Prime"},
  {"id": "local-197", "title": "Modern Love Mumbai", "type": "series", "platform": "Prime"},
  {"id": "local-198", "title": "Jubilee", "type": "series", "platform": "Prime"},
  {"id": "local-199", "title": "Suzhal", "type": "series", "platform": "Prime"},
  {"id": "local-200", "title": "Vadhandhi", "type": "series", "platform": "Prime"},
  {"id": "local-201", "title": "Ray", "type": "series", "platform": "Netflix"},
  {"id": "local-202", "title": "Aranyak", "type": "series", "platform": "Netflix"},
  {"id": "local-203", "title": "Choona", "type": "series", "platform": "Netflix"},
  {"id": "local-204", "title": "Guns & Gulaabs", "type": "series", "platform": "Netflix"},
  {"id": "local-205", "title": "IC 814: The Kandahar Hijack", "type": "series", "platform": "Netflix"},
  {"id": "local-206", "title": "Khakee: The Bihar Chapter", "type": "series", "platform": "Netflix"},
  {"id": "local-207", "title": "Tooth Pari", "type": "series", "platform": "Netflix"},
  {"id": "local-208", "title": "Betaal", "type": "series", "platform": "Netflix"},
  {"id": "local-209", "title": "Typewriter", "type": "series", "platform": "Netflix"},
  {"id": "local-210", "title": "Leila", "type": "series", "platform": "Netflix"},
  {"id": "local-211", "title": "JL50", "type": "series", "platform": "SonyLIV"},
  {"id": "local-212", "title": "Tabbar", "type": "series", "platform": "SonyLIV"},
  {"id": "local-213", "title": "Your Honor", "type": "series", "platform": "SonyLIV"},
  {"id": "local-214", "title": "Potluck", "type": "series", "platform": "SonyLIV"},
  {"id": "local-215", "title": "Faadu", "type": "series", "platform": "SonyLIV"},
  {"id": "local-216", "title": "Raisinghani vs Raisinghani", "type": "series", "platform": "SonyLIV"},
  {"id": "local-217", "title": "Freedom at Midnight", "type": "series", "platform": "SonyLIV"},
  {"id": "local-218", "title": "Commander Karan Saxena", "type": "series", "platform": "JioHotstar"},
  {"id": "local-219", "title": "The Freelancer", "type": "series", "platform": "JioHotstar"},
  {"id": "local-220", "title": "Saas Bahu Aur Flamingo", "type": "series", "platform": "JioHotstar"},
  {"id": "local-221", "title": "City of Dreams", "type": "series", "platform": "JioHotstar"},
  {"id": "local-222", "title": "Out of Love", "type": "series", "platform": "JioHotstar"},
  {"id": "local-223", "title": "Grahan", "type": "series", "platform": "JioHotstar"},
  {"id": "local-224", "title": "Rudra", "type": "series", "platform": "JioHotstar"},
  {"id": "local-225", "title": "Showtime", "type": "series", "platform": "JioHotstar"},
  {"id": "local-226", "title": "The Great Indian Murder", "type": "series", "platform": "JioHotstar"},
  {"id": "local-227", "title": "Lootere", "type": "series", "platform": "JioHotstar"},
  {"id": "local-228", "title": "Aashram", "type": "series", "platform": "MX Player"},
  {"id": "local-229", "title": "Campus Diaries", "type": "series", "platform": "MX Player"},
  {"id": "local-230", "title": "Indori Ishq", "type": "series", "platform": "MX Player"},
  {"id": "local-231", "title": "Ek Thi Begum", "type": "series", "platform": "MX Player"},
  {"id": "local-232", "title": "Matsya Kaand", "type": "series", "platform": "MX Player"},
  {"id": "local-233", "title": "Raktanchal", "type": "series", "platform": "MX Player"},
  {"id": "local-234", "title": "Hello Mini", "type": "series", "platform": "MX Player"},
  {"id": "local-235", "title": "Broken But Beautiful", "type": "series", "platform": "MX Player"},
  {"id": "local-236", "title": "Bhaukaal", "type": "series", "platform": "MX Player"},
  {"id": "local-237", "title": "Cartel", "type": "series", "platform": "MX Player"},
  {"id": "local-238", "title": "High", "type": "series", "platform": "MX Player"},
  {"id": "local-239", "title": "Runaway Lugaai", "type": "series", "platform": "MX Player"},
  {"id": "local-240", "title": "Nakaab", "type": "series", "platform": "MX Player"},
];

// Platform colors for UI
const PLATFORM_COLORS = {
  'Prime': '#00A8E1',
  'Netflix': '#E50914',
  'JioHotstar': '#1F80E0',
  'SonyLIV': '#000000',
  'ZEE5': '#8B5CF6',
  'YouTube': '#FF0000',
  'MX Player': '#0D47A1',
  'Various': '#6B7280',
};

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
      const { searchParams } = new URL(request.url);
      const area = searchParams.get('area'); // 'noida' or 'greater-noida'
      
      let filteredSectors = NOIDA_SECTORS;
      if (area === 'noida') {
        filteredSectors = NOIDA_SECTORS.filter(s => s.area === 'Noida');
      } else if (area === 'greater-noida') {
        filteredSectors = NOIDA_SECTORS.filter(s => s.area === 'Greater Noida');
      }
      
      return NextResponse.json({ sectors: filteredSectors }, { headers });
    }

    // Get device types
    if (path === '/devices' && method === 'GET') {
      return NextResponse.json({ devices: DEVICE_TYPES }, { headers });
    }

    // Search shows - Local DB first, then OMDb fallback
    if (path === '/search' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const query = searchParams.get('q');

      if (!query || query.length < 2) {
        return NextResponse.json({ results: [] }, { headers });
      }

      const queryLower = query.toLowerCase();
      
      // Search local database first
      const localResults = LOCAL_SHOWS.filter(show => 
        show.title.toLowerCase().includes(queryLower)
      ).map(show => ({
        showId: show.id,
        title: show.title,
        type: show.type,
        platform: show.platform,
        source: 'local',
      }));

      // If we have local results, return them
      if (localResults.length > 0) {
        return NextResponse.json({ results: localResults, source: 'local' }, { headers });
      }

      // Fallback to OMDb API
      const apiKey = process.env.OMDB_API_KEY;
      const omdbUrl = `http://www.omdbapi.com/?apikey=${apiKey}&s=${encodeURIComponent(query)}`;
      
      const omdbResponse = await fetch(omdbUrl);
      const omdbData = await omdbResponse.json();

      if (omdbData.Response === 'True') {
        const results = omdbData.Search.map((item) => ({
          showId: item.imdbID,
          title: item.Title,
          year: item.Year,
          type: item.Type,
          poster: item.Poster !== 'N/A' ? item.Poster : null,
          platform: 'Various',
          source: 'omdb',
        }));
        return NextResponse.json({ results, source: 'omdb' }, { headers });
      }

      return NextResponse.json({ results: [], source: 'none' }, { headers });
    }

    // Get popular/suggested shows
    if (path === '/popular' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const platform = searchParams.get('platform');
      const type = searchParams.get('type');
      const limit = parseInt(searchParams.get('limit') || '20');
      
      let shows = [...LOCAL_SHOWS];
      
      if (platform && platform !== 'all') {
        shows = shows.filter(s => s.platform === platform);
      }
      if (type && type !== 'all') {
        shows = shows.filter(s => s.type === type);
      }
      
      // Shuffle and limit
      shows = shows.sort(() => Math.random() - 0.5).slice(0, limit);
      
      return NextResponse.json({ shows }, { headers });
    }

    // Get trending shows - with date range filter and deduplication by normalizedTitle
    if (path === '/trending' && method === 'GET') {
      const { searchParams } = new URL(request.url);
      const sector = searchParams.get('sector');
      const deviceType = searchParams.get('device');
      const dateFrom = searchParams.get('from'); // ISO date string
      const dateTo = searchParams.get('to'); // ISO date string
      const timeRange = searchParams.get('range'); // 'today', 'week', 'month', 'all'

      const { db } = await connectToDatabase();
      const checkinsCollection = db.collection('checkins');

      // Build date query
      let dateQuery = {};
      if (timeRange === 'today') {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        dateQuery = { $gte: todayStart };
      } else if (timeRange === 'week') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dateQuery = { $gte: weekAgo };
      } else if (timeRange === 'month') {
        const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        dateQuery = { $gte: monthAgo };
      } else if (dateFrom || dateTo) {
        if (dateFrom) dateQuery.$gte = new Date(dateFrom);
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          dateQuery.$lte = toDate;
        }
      } else {
        // Default to last 7 days
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        dateQuery = { $gte: sevenDaysAgo };
      }

      const query = { createdAt: dateQuery };
      if (sector && sector !== 'all') {
        query.sectorId = sector;
      }
      if (deviceType && deviceType !== 'all') {
        query.deviceType = deviceType;
      }

      const checkins = await checkinsCollection.find(query).toArray();

      // Group by normalizedTitle (to merge same shows with different spellings)
      const showMap = new Map();
      const deviceStats = { mobile: 0, laptop: 0, tablet: 0, tv: 0 };
      const platformStats = {};
      
      checkins.forEach((checkin) => {
        // Use normalizedTitle as key to merge duplicates
        const key = checkin.normalizedTitle || (checkin.title ? checkin.title.toLowerCase() : checkin.showId);
        
        if (!showMap.has(key)) {
          showMap.set(key, {
            showId: checkin.showId || key,
            normalizedTitle: key,
            title: checkin.displayTitle || checkin.title,
            poster: checkin.poster,
            type: checkin.type,
            year: checkin.year,
            platform: checkin.platform || 'Various',
            imdbId: checkin.imdbId,
            checkins: [],
            devices: { mobile: 0, laptop: 0, tablet: 0, tv: 0 },
            lastWatched: checkin.createdAt,
          });
        }
        const show = showMap.get(key);
        show.checkins.push(checkin);
        
        // Update poster if this checkin has one and existing doesn't
        if (!show.poster && checkin.poster) {
          show.poster = checkin.poster;
        }
        
        // Track latest watch time
        if (new Date(checkin.createdAt) > new Date(show.lastWatched)) {
          show.lastWatched = checkin.createdAt;
        }
        
        // Track device stats
        if (checkin.deviceType && deviceStats[checkin.deviceType] !== undefined) {
          deviceStats[checkin.deviceType]++;
          show.devices[checkin.deviceType]++;
        }
        
        // Track platform stats
        const plat = checkin.platform || 'Various';
        platformStats[plat] = (platformStats[plat] || 0) + 1;
      });

      // Calculate scores and sort
      const trending = Array.from(showMap.values())
        .map((show) => ({
          showId: show.showId,
          title: show.title,
          poster: show.poster,
          type: show.type,
          year: show.year,
          platform: show.platform,
          score: calculateTrendScore(show.checkins),
          checkinCount: show.checkins.length,
          devices: show.devices,
          lastWatched: show.lastWatched,
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10);

      return NextResponse.json({ 
        trending, 
        stats: { deviceStats, platformStats },
        filters: { sector, deviceType, timeRange, dateFrom, dateTo }
      }, { headers });
    }

    // Create check-in with fuzzy matching normalization and poster fetching
    if (path === '/checkin' && method === 'POST') {
      const body = await request.json();
      let { showId, title, poster, type, year, sectorId, deviceType, platform } = body;

      if (!title || !sectorId || !deviceType) {
        return NextResponse.json(
          { error: 'Missing required fields: title, sectorId, deviceType' },
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

      const device = DEVICE_TYPES.find((d) => d.id === deviceType);
      if (!device) {
        return NextResponse.json(
          { error: 'Invalid device type' },
          { status: 400, headers }
        );
      }

      const { db } = await connectToDatabase();
      const checkinsCollection = db.collection('checkins');
      const showsCollection = db.collection('shows');

      // Normalize title using fuzzy matching
      const normalizedTitle = normalizeShowTitle(title, LOCAL_SHOWS);
      
      // Check if show already exists in our shows collection
      let existingShow = await showsCollection.findOne({ 
        normalizedTitle: normalizedTitle.toLowerCase() 
      });

      // If not exists, try to find in local DB or fetch from OMDb
      if (!existingShow) {
        // Check local DB
        const localShow = LOCAL_SHOWS.find(s => 
          s.title.toLowerCase() === normalizedTitle.toLowerCase()
        );

        let showData = {
          id: uuidv4(),
          normalizedTitle: normalizedTitle.toLowerCase(),
          displayTitle: normalizedTitle,
          type: type || (localShow?.type) || 'unknown',
          platform: platform || (localShow?.platform) || 'Various',
          poster: poster || null,
          year: year || null,
          imdbId: null,
          createdAt: new Date(),
        };

        // Fetch poster from OMDb if not provided
        if (!showData.poster) {
          const omdbData = await fetchPosterFromOMDb(normalizedTitle);
          if (omdbData) {
            showData.poster = omdbData.poster;
            showData.year = showData.year || omdbData.year;
            showData.imdbId = omdbData.imdbId;
          }
        }

        await showsCollection.insertOne(showData);
        existingShow = showData;
      }

      // Create the checkin
      const checkin = {
        id: uuidv4(),
        showId: existingShow.id,
        normalizedTitle: existingShow.normalizedTitle,
        displayTitle: existingShow.displayTitle,
        poster: existingShow.poster,
        type: existingShow.type,
        year: existingShow.year,
        platform: existingShow.platform,
        imdbId: existingShow.imdbId,
        sectorId,
        sectorName: sector.name,
        sectorArea: sector.area,
        deviceType,
        deviceName: device.name,
        createdAt: new Date(),
        // Add readable time info
        watchedAt: new Date().toISOString(),
        watchedDate: new Date().toLocaleDateString('en-IN'),
        watchedTime: new Date().toLocaleTimeString('en-IN'),
      };

      await checkinsCollection.insertOne(checkin);

      return NextResponse.json({ 
        success: true, 
        checkin,
        normalized: title !== normalizedTitle ? { original: title, normalized: normalizedTitle } : null
      }, { status: 201, headers });
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
