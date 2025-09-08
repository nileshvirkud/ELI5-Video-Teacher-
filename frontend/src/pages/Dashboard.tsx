import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../hooks/useSocket';
import TopicForm from '../components/TopicForm';
import LoadingSpinner from '../components/LoadingSpinner';
import { VideoGenerationRequest, VideoProgress, Video, UserStats } from '../types';
import apiService from '../services/api';
import { 
  PlayIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  TrendingUpIcon,
  FilmIcon,
  SparklesIcon,
  AlertCircleIcon
} from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [recentVideos, setRecentVideos] = useState<Video[]>([]);
  const [currentlyGenerating, setCurrentlyGenerating] = useState<Video[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Socket connection for real-time updates
  const { connected, joinRoom } = useSocket({
    onVideoProgress: (progress: VideoProgress) => {
      console.log('Video progress:', progress);
      // Update progress for currently generating videos
      setCurrentlyGenerating(prev => 
        prev.map(video => 
          video.id === progress.videoId 
            ? { ...video, metadata: { ...video.metadata, progress } }
            : video
        )
      );
    },
    onVideoCompleted: (data) => {
      console.log('Video completed:', data);
      setSuccess('🎉 Your video is ready! Check it out in your gallery.');
      refreshData();
    },
    onVideoFailed: (data) => {
      console.log('Video failed:', data);
      setError(`❌ Video generation failed: ${data.error}`);
      refreshData();
    }
  });

  useEffect(() => {
    if (user && connected) {
      joinRoom(user.id);
    }
  }, [user, connected, joinRoom]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Load user stats
      const statsResponse = await apiService.getUserStats();
      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      // Load recent videos
      const videosResponse = await apiService.getVideos({ limit: 5 });
      if (videosResponse.success) {
        setRecentVideos(videosResponse.data.videos);
        
        // Filter currently generating videos
        const generating = videosResponse.data.videos.filter(
          video => video.status === 'PENDING' || video.status === 'PROCESSING'
        );
        setCurrentlyGenerating(generating);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    }
  };

  const refreshData = () => {
    loadDashboardData();
  };

  const handleGenerateVideo = async (data: VideoGenerationRequest) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await apiService.generateVideo(data);
      
      if (response.success) {
        setSuccess('🚀 Video generation started! You\'ll see progress updates below.');
        refreshData();
      } else {
        throw new Error(response.error?.message || 'Generation failed');
      }
    } catch (error: any) {
      console.error('Video generation error:', error);
      
      if (error.response?.status === 429) {
        setError('⏰ You\'ve reached your hourly limit. Upgrade to Premium for more videos!');
      } else {
        setError(error.response?.data?.error?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'PROCESSING':
      case 'PENDING':
        return <ClockIcon className="w-5 h-5 text-yellow-500" />;
      case 'FAILED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return <FilmIcon className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING': return 'Waiting to start...';
      case 'PROCESSING': return 'Creating your video...';
      case 'COMPLETED': return 'Ready to watch!';
      case 'FAILED': return 'Generation failed';
      case 'CANCELLED': return 'Cancelled';
      default: return status;
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.firstName || 'Explorer'}! 🌟
        </h1>
        <p className="text-lg text-gray-600">
          What would you like to learn about today?
        </p>
      </div>

      {/* Notification Messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-lg">
          <div className="flex">
            <AlertCircleIcon className="w-5 h-5 text-red-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-red-700">{error}</p>
            </div>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-lg">
          <div className="flex">
            <CheckCircleIcon className="w-5 h-5 text-green-400 mt-0.5" />
            <div className="ml-3">
              <p className="text-green-700">{success}</p>
            </div>
            <button 
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-400 hover:text-green-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FilmIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.totalVideos}</p>
                <p className="text-gray-600">Total Videos</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.completedVideos}</p>
                <p className="text-gray-600">Completed</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <ClockIcon className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">
                  {Math.round(stats.totalDuration / 60)}m
                </p>
                <p className="text-gray-600">Watch Time</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <TrendingUpIcon className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-2xl font-bold text-gray-900">{stats.recentActivity}</p>
                <p className="text-gray-600">This Week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topic Form */}
      <TopicForm 
        onSubmit={handleGenerateVideo} 
        loading={loading}
        disabled={loading}
      />

      {/* Currently Generating Videos */}
      {currentlyGenerating.length > 0 && (
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <SparklesIcon className="w-6 h-6 text-blue-500 mr-2" />
            Videos in Progress
          </h2>
          <div className="space-y-4">
            {currentlyGenerating.map((video) => (
              <div key={video.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium text-gray-900 truncate">{video.topic}</h3>
                  <span className={`status-badge ${
                    video.status === 'PROCESSING' ? 'status-processing' : 'status-pending'
                  }`}>
                    {getStatusText(video.status)}
                  </span>
                </div>
                
                <div className="progress-bar">
                  <div 
                    className="progress-fill"
                    style={{ 
                      width: `${video.metadata?.progress?.progress || 0}%` 
                    }}
                  />
                </div>
                
                <div className="flex justify-between items-center mt-2 text-sm text-gray-600">
                  <span>
                    {video.metadata?.progress?.message || 'Preparing...'}
                  </span>
                  <span>{video.metadata?.progress?.progress || 0}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Videos */}
      {recentVideos.length > 0 && (
        <div className="card p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Videos</h2>
            <button
              onClick={() => navigate('/gallery')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recentVideos.slice(0, 6).map((video) => (
              <div
                key={video.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/video/${video.id}`)}
              >
                <div className="flex items-start justify-between mb-3">
                  <h3 className="font-medium text-gray-900 line-clamp-2">{video.topic}</h3>
                  {getStatusIcon(video.status)}
                </div>
                
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span className="capitalize">{video.tone.toLowerCase()}</span>
                  {video.duration && (
                    <span>{formatDuration(video.duration)}</span>
                  )}
                </div>
                
                {video.status === 'COMPLETED' && (
                  <button className="mt-3 w-full btn-primary text-sm py-2">
                    <PlayIcon className="w-4 h-4 mr-2 inline" />
                    Watch Video
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recentVideos.length === 0 && currentlyGenerating.length === 0 && (
        <div className="text-center py-12">
          <FilmIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No videos yet
          </h3>
          <p className="text-gray-600">
            Create your first educational video using the form above!
          </p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;