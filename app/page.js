'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Flame, TrendingUp, MapPin, Plus, Search, Share2, Tv, Film, X, Loader2, CheckCircle2, Smartphone, Laptop, Tablet, Monitor } from 'lucide-react';

// Platform colors
const PLATFORM_COLORS = {
  'Prime': 'bg-blue-500',
  'Netflix': 'bg-red-600',
  'JioHotstar': 'bg-blue-600',
  'SonyLIV': 'bg-gray-800',
  'ZEE5': 'bg-purple-600',
  'YouTube': 'bg-red-500',
  'Various': 'bg-gray-600',
};

// Device icons
const DeviceIcon = ({ type, className = "w-4 h-4" }) => {
  switch(type) {
    case 'mobile': return <Smartphone className={className} />;
    case 'laptop': return <Laptop className={className} />;
    case 'tablet': return <Tablet className={className} />;
    case 'tv': return <Monitor className={className} />;
    default: return <Smartphone className={className} />;
  }
};

export default function HomePage() {
  const [trending, setTrending] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [selectedSector, setSelectedSector] = useState('all');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [trendStats, setTrendStats] = useState(null);
  
  // Check-in modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedShow, setSelectedShow] = useState(null);
  const [checkinSector, setCheckinSector] = useState('');
  const [checkinDevice, setCheckinDevice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkinSuccess, setCheckinSuccess] = useState(false);
  const [popularShows, setPopularShows] = useState([]);

  // Share modal state
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState(null);

  // Sector search
  const [sectorSearch, setSectorSearch] = useState('');

  const fetchTrending = useCallback(async () => {
    setLoading(true);
    try {
      const url = selectedSector && selectedSector !== 'all'
        ? `/api/trending?sector=${selectedSector}`
        : '/api/trending';
      const response = await fetch(url);
      const data = await response.json();
      setTrending(data.trending || []);
      setTrendStats(data.stats || null);
    } catch (error) {
      console.error('Error fetching trending:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedSector]);

  const fetchSectors = async () => {
    try {
      const response = await fetch('/api/sectors');
      const data = await response.json();
      setSectors(data.sectors || []);
    } catch (error) {
      console.error('Error fetching sectors:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchPopularShows = async () => {
    try {
      const response = await fetch('/api/popular?limit=12');
      const data = await response.json();
      setPopularShows(data.shows || []);
    } catch (error) {
      console.error('Error fetching popular shows:', error);
    }
  };

  useEffect(() => {
    fetchSectors();
    fetchStats();
    fetchPopularShows();
  }, []);

  useEffect(() => {
    fetchTrending();
  }, [fetchTrending]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        setSearching(true);
        try {
          const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
          const data = await response.json();
          setSearchResults(data.results || []);
        } catch (error) {
          console.error('Error searching:', error);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleCheckin = async () => {
    if (!selectedShow || !checkinSector || !checkinDevice) return;

    setSubmitting(true);
    try {
      const response = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          showId: selectedShow.showId,
          title: selectedShow.title,
          poster: selectedShow.poster || null,
          type: selectedShow.type,
          year: selectedShow.year || null,
          platform: selectedShow.platform || 'Various',
          sectorId: checkinSector,
          deviceType: checkinDevice,
        }),
      });

      if (response.ok) {
        setCheckinSuccess(true);
        setTimeout(() => {
          setIsModalOpen(false);
          setSelectedShow(null);
          setSearchQuery('');
          setSearchResults([]);
          setCheckinSector('');
          setCheckinDevice('');
          setCheckinSuccess(false);
          fetchTrending();
          fetchStats();
        }, 1500);
      }
    } catch (error) {
      console.error('Error creating checkin:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleShare = async () => {
    try {
      const url = selectedSector && selectedSector !== 'all'
        ? `/api/share?sector=${selectedSector}`
        : '/api/share';
      const response = await fetch(url);
      const data = await response.json();
      setShareData(data);
      setIsShareModalOpen(true);
    } catch (error) {
      console.error('Error fetching share data:', error);
    }
  };

  const copyShareText = () => {
    if (!shareData) return;
    const text = `🔥 ${shareData.sectorName} is watching:\n${shareData.trending.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n📱 Check out NoidaPulse!`;
    navigator.clipboard.writeText(text);
  };

  const shareToWhatsApp = () => {
    if (!shareData) return;
    const text = `🔥 ${shareData.sectorName} is watching:\n${shareData.trending.map((t, i) => `${i + 1}. ${t}`).join('\n')}\n\n📱 Check out NoidaPulse!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const topShow = trending[0];
  const restShows = trending.slice(1, 6);

  // Filter sectors based on search
  const filteredSectors = sectors.filter(sector => 
    sector.name.toLowerCase().includes(sectorSearch.toLowerCase()) ||
    (sector.area && sector.area.toLowerCase().includes(sectorSearch.toLowerCase()))
  );

  // Group sectors by area
  const noidaSectors = filteredSectors.filter(s => s.area === 'Noida');
  const greaterNoidaSectors = filteredSectors.filter(s => s.area === 'Greater Noida');

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 via-gray-900 to-gray-950">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-900/20 via-pink-900/20 to-orange-900/20" />
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute top-40 right-10 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative container mx-auto px-4 py-12 md:py-16">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/20 border border-purple-500/30 mb-6">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-purple-200">Live Trends</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold mb-4">
              <span className="gradient-text">What is Noida</span>
              <br />
              <span className="text-white">Watching?</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-md mx-auto mb-8">
              Discover what&apos;s trending in your sector. Add your vibe and see real-time entertainment trends.
            </p>

            {/* Stats */}
            {stats && (
              <div className="flex justify-center gap-8 mb-8">
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-400">{stats.totalCheckins}</div>
                  <div className="text-xs text-gray-500">Total Vibes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-pink-400">{stats.todayCheckins}</div>
                  <div className="text-xs text-gray-500">Today</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-400">{stats.uniqueShows}</div>
                  <div className="text-xs text-gray-500">Shows</div>
                </div>
              </div>
            )}

            {/* Device Stats */}
            {trendStats?.deviceStats && (
              <div className="flex justify-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3" /> {trendStats.deviceStats.mobile || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Laptop className="w-3 h-3" /> {trendStats.deviceStats.laptop || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Tablet className="w-3 h-3" /> {trendStats.deviceStats.tablet || 0}
                </span>
                <span className="flex items-center gap-1">
                  <Monitor className="w-3 h-3" /> {trendStats.deviceStats.tv || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Filter Section */}
      <section className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <MapPin className="w-5 h-5 text-purple-400 flex-shrink-0" />
            <Select value={selectedSector} onValueChange={setSelectedSector}>
              <SelectTrigger className="w-full sm:w-[220px] bg-gray-900/50 border-gray-700 text-white">
                <SelectValue placeholder="All Sectors" />
              </SelectTrigger>
              <SelectContent className="bg-gray-900 border-gray-700 max-h-[300px]">
                <div className="p-2">
                  <Input
                    placeholder="Search sectors..."
                    value={sectorSearch}
                    onChange={(e) => setSectorSearch(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white text-sm"
                  />
                </div>
                <SelectItem value="all" className="text-white hover:bg-gray-800">All Sectors</SelectItem>
                
                {noidaSectors.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-500 font-medium">Noida</div>
                    {noidaSectors.slice(0, 50).map((sector) => (
                      <SelectItem key={sector.id} value={sector.id} className="text-white hover:bg-gray-800">
                        {sector.name}
                      </SelectItem>
                    ))}
                    {noidaSectors.length > 50 && (
                      <div className="px-2 py-1 text-xs text-gray-500">+ {noidaSectors.length - 50} more (search to find)</div>
                    )}
                  </>
                )}
                
                {greaterNoidaSectors.length > 0 && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-500 font-medium mt-2">Greater Noida</div>
                    {greaterNoidaSectors.map((sector) => (
                      <SelectItem key={sector.id} value={sector.id} className="text-white hover:bg-gray-800">
                        {sector.name}
                      </SelectItem>
                    ))}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button 
            variant="outline" 
            className="border-purple-500/50 text-purple-300 hover:bg-purple-500/20 w-full sm:w-auto"
            onClick={handleShare}
          >
            <Share2 className="w-4 h-4 mr-2" />
            Share Trends
          </Button>
        </div>
      </section>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {loading ? (
          // Skeleton Loading
          <div className="space-y-6">
            <div className="h-64 bg-gray-800/50 rounded-2xl animate-pulse" />
            <div className="grid gap-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-gray-800/50 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ) : trending.length === 0 ? (
          // Empty State
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gray-800/50 flex items-center justify-center">
              <Tv className="w-12 h-12 text-gray-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No trends yet</h3>
            <p className="text-gray-500 mb-6">Be the first to add your vibe!</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Top Trending Card */}
            {topShow && (
              <Card className="relative overflow-hidden bg-gradient-to-br from-purple-900/40 via-gray-900 to-pink-900/40 border-purple-500/30 neon-border animate-pulse-glow">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-orange-400">
                      <Flame className="w-5 h-5" />
                      <span className="text-sm font-semibold uppercase tracking-wider">#1 Trending Now</span>
                    </div>
                    {topShow.platform && (
                      <span className={`px-2 py-1 text-xs rounded-full text-white ${PLATFORM_COLORS[topShow.platform] || 'bg-gray-600'}`}>
                        {topShow.platform}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-6">
                    {topShow.poster ? (
                      <img
                        src={topShow.poster}
                        alt={topShow.title}
                        className="w-28 h-40 object-cover rounded-lg shadow-lg shadow-purple-500/30"
                      />
                    ) : (
                      <div className="w-28 h-40 bg-gray-800 rounded-lg flex items-center justify-center">
                        {topShow.type === 'series' || topShow.type === 'tv' ? <Tv className="w-8 h-8 text-gray-600" /> : <Film className="w-8 h-8 text-gray-600" />}
                      </div>
                    )}
                    <div className="flex-1">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{topShow.title}</h2>
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {topShow.type === 'series' ? 'TV Series' : topShow.type === 'tv' ? 'TV Show' : 'Movie'}
                        </span>
                        {topShow.year && (
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-700/50 text-gray-300">
                            {topShow.year}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-4 h-4 text-green-400" />
                          {topShow.checkinCount} vibes
                        </span>
                      </div>
                      {/* Device breakdown */}
                      {topShow.devices && (
                        <div className="flex gap-3 mt-3 text-xs text-gray-500">
                          {topShow.devices.mobile > 0 && <span className="flex items-center gap-1"><Smartphone className="w-3 h-3" /> {topShow.devices.mobile}</span>}
                          {topShow.devices.laptop > 0 && <span className="flex items-center gap-1"><Laptop className="w-3 h-3" /> {topShow.devices.laptop}</span>}
                          {topShow.devices.tablet > 0 && <span className="flex items-center gap-1"><Tablet className="w-3 h-3" /> {topShow.devices.tablet}</span>}
                          {topShow.devices.tv > 0 && <span className="flex items-center gap-1"><Monitor className="w-3 h-3" /> {topShow.devices.tv}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Top 5 List */}
            {restShows.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  Also Trending
                </h3>
                <div className="space-y-3">
                  {restShows.map((show, index) => (
                    <Card key={show.showId} className="bg-gray-900/50 border-gray-800 hover:border-purple-500/30 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-lg font-bold text-purple-300">#{index + 2}</span>
                          </div>
                          {show.poster ? (
                            <img
                              src={show.poster}
                              alt={show.title}
                              className="w-12 h-16 object-cover rounded flex-shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-16 bg-gray-800 rounded flex items-center justify-center flex-shrink-0">
                              {show.type === 'series' || show.type === 'tv' ? <Tv className="w-4 h-4 text-gray-600" /> : <Film className="w-4 h-4 text-gray-600" />}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-white truncate">{show.title}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                              <span>{show.type === 'series' ? 'Series' : show.type === 'tv' ? 'TV' : 'Movie'}</span>
                              {show.year && <span>• {show.year}</span>}
                              {show.platform && show.platform !== 'Various' && (
                                <span className={`px-1.5 py-0.5 text-xs rounded text-white ${PLATFORM_COLORS[show.platform] || 'bg-gray-600'}`}>
                                  {show.platform}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm font-medium text-purple-400">{show.checkinCount}</div>
                            <div className="text-xs text-gray-500">vibes</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Sticky CTA Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
        <Dialog open={isModalOpen} onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) {
            setSelectedShow(null);
            setSearchQuery('');
            setSearchResults([]);
            setCheckinSector('');
            setCheckinDevice('');
            setCheckinSuccess(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white shadow-lg shadow-purple-500/30 px-8 py-6 text-lg rounded-full animate-pulse-glow"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Your Vibe
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-gray-900 border-gray-800 max-w-md mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl text-white">Add Your Vibe</DialogTitle>
            </DialogHeader>
            
            {checkinSuccess ? (
              <div className="py-12 text-center">
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10 text-green-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Vibe Added!</h3>
                <p className="text-gray-400">Thanks for sharing what you&apos;re watching</p>
              </div>
            ) : (
              <div className="space-y-6 py-4">
                {/* Step 1: Search Show */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">What are you watching?</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <Input
                      placeholder="Search shows or movies..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSelectedShow(null);
                      }}
                      className="pl-10 bg-gray-800 border-gray-700 text-white"
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 animate-spin" />
                    )}
                  </div>
                  
                  {/* Search Results */}
                  {searchResults.length > 0 && !selectedShow && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-gray-700 bg-gray-800">
                      {searchResults.map((result) => (
                        <button
                          key={result.showId}
                          onClick={() => {
                            setSelectedShow(result);
                            setSearchQuery(result.title);
                            setSearchResults([]);
                          }}
                          className="w-full flex items-center gap-3 p-3 hover:bg-gray-700 transition-colors text-left"
                        >
                          <div className="w-10 h-14 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                            {result.type === 'series' || result.type === 'tv' ? <Tv className="w-4 h-4 text-gray-500" /> : <Film className="w-4 h-4 text-gray-500" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-white truncate">{result.title}</div>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{result.type}</span>
                              {result.platform && (
                                <span className={`px-1.5 py-0.5 rounded text-white ${PLATFORM_COLORS[result.platform] || 'bg-gray-600'}`}>
                                  {result.platform}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Popular Shows */}
                  {!selectedShow && searchQuery.length < 2 && popularShows.length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs text-gray-500 mb-2">Popular shows</div>
                      <div className="flex flex-wrap gap-2">
                        {popularShows.slice(0, 8).map((show) => (
                          <button
                            key={show.id}
                            onClick={() => {
                              setSelectedShow({
                                showId: show.id,
                                title: show.title,
                                type: show.type,
                                platform: show.platform,
                              });
                              setSearchQuery(show.title);
                            }}
                            className="px-3 py-1.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-full transition-colors"
                          >
                            {show.title}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selected Show */}
                  {selectedShow && (
                    <div className="mt-3 p-3 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center gap-3">
                      <div className="w-12 h-16 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        {selectedShow.type === 'series' || selectedShow.type === 'tv' ? <Tv className="w-5 h-5 text-gray-500" /> : <Film className="w-5 h-5 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-white truncate">{selectedShow.title}</div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          <span>{selectedShow.type}</span>
                          {selectedShow.platform && (
                            <span className={`px-1.5 py-0.5 rounded text-white ${PLATFORM_COLORS[selectedShow.platform] || 'bg-gray-600'}`}>
                              {selectedShow.platform}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedShow(null);
                          setSearchQuery('');
                        }}
                        className="p-1 hover:bg-gray-700 rounded flex-shrink-0"
                      >
                        <X className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Step 2: Select Sector */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Where in Noida?</label>
                  <Select value={checkinSector} onValueChange={setCheckinSector}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                      <SelectValue placeholder="Select your sector" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-gray-700 max-h-[200px]">
                      <div className="p-2">
                        <Input
                          placeholder="Search sectors..."
                          className="bg-gray-800 border-gray-700 text-white text-sm"
                          onChange={(e) => setSectorSearch(e.target.value)}
                        />
                      </div>
                      {noidaSectors.slice(0, 30).map((sector) => (
                        <SelectItem key={sector.id} value={sector.id} className="text-white hover:bg-gray-800">
                          {sector.name}
                        </SelectItem>
                      ))}
                      {greaterNoidaSectors.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs text-gray-500 font-medium mt-2">Greater Noida</div>
                          {greaterNoidaSectors.map((sector) => (
                            <SelectItem key={sector.id} value={sector.id} className="text-white hover:bg-gray-800">
                              {sector.name}
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Step 3: Select Device */}
                <div>
                  <label className="text-sm font-medium text-gray-300 mb-2 block">Watching on?</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'mobile', name: 'Mobile', icon: Smartphone },
                      { id: 'laptop', name: 'Laptop', icon: Laptop },
                      { id: 'tablet', name: 'Tablet', icon: Tablet },
                      { id: 'tv', name: 'TV', icon: Monitor },
                    ].map((device) => (
                      <button
                        key={device.id}
                        onClick={() => setCheckinDevice(device.id)}
                        className={`p-3 rounded-lg border flex flex-col items-center gap-1 transition-all ${
                          checkinDevice === device.id
                            ? 'border-purple-500 bg-purple-500/20 text-purple-300'
                            : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                        }`}
                      >
                        <device.icon className="w-5 h-5" />
                        <span className="text-xs">{device.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit Button */}
                <Button
                  onClick={handleCheckin}
                  disabled={!selectedShow || !checkinSector || !checkinDevice || submitting}
                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Adding...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Vibe
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl text-white">Share Trends</DialogTitle>
          </DialogHeader>
          {shareData && (
            <div className="space-y-4 py-4">
              {/* Share Card Preview */}
              <div className="p-6 rounded-xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30">
                <div className="flex items-center gap-2 mb-4">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <span className="font-semibold text-white">{shareData.sectorName} is watching:</span>
                </div>
                <ol className="space-y-2">
                  {shareData.trending.map((title, index) => (
                    <li key={index} className="flex items-center gap-3 text-gray-200">
                      <span className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center text-sm text-purple-300">
                        {index + 1}
                      </span>
                      {title}
                    </li>
                  ))}
                </ol>
                {shareData.trending.length === 0 && (
                  <p className="text-gray-400 text-center py-4">No trends to share yet</p>
                )}
              </div>

              {/* Share Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={copyShareText}
                  variant="outline"
                  className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
                >
                  Copy Text
                </Button>
                <Button
                  onClick={shareToWhatsApp}
                  className="flex-1 bg-green-600 hover:bg-green-500 text-white"
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-12 border-t border-gray-800">
        <div className="text-center text-gray-500 text-sm">
          <p>Made with 💜 for Noida</p>
          <p className="mt-1">NoidaPulse - Open Source Entertainment Trends</p>
        </div>
      </footer>
    </div>
  );
}
