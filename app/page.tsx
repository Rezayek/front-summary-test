'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [status, setStatus] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [downloadReady, setDownloadReady] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);

  const extractVideoId = (url: string): string | null => {
    try {
      const urlObj = new URL(url);
      if (urlObj.hostname.includes('youtube.com')) {
        return urlObj.searchParams.get('v');
      } else if (urlObj.hostname.includes('youtu.be')) {
        return urlObj.pathname.slice(1);
      }
      return null;
    } catch (e) {
      console.error('Invalid URL error:', e);
      setStatus('Invalid YouTube URL. Please check and try again.');
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reset all state variables
    setVideoId('');
    setStatus('');
    setWs(null);
    setDownloadReady(false);
    setVideoSrc(null);

    if (!apiUrl) {
      alert('Please provide the API base URL.');
      return;
    }

    const id = extractVideoId(videoUrl);
    if (!id) {
      alert('Invalid YouTube URL');
      return;
    }
    setVideoId(id);

    try {
      // Establish a new WebSocket connection
      const websocket = new WebSocket(`${apiUrl.replace('http', 'ws')}/progress/${id}`);
      setWs(websocket);

      // Send the video processing request
      const params = new URLSearchParams({ video_url: videoUrl, topic: 'sarcastic' });
      const response = await fetch(`${apiUrl}/process?${params.toString()}`, { method: 'POST' });

      if (!response.ok) {
        console.error('API response:', response);
        throw new Error('Failed to start processing');
      }
    } catch (e) {
      console.error('Submission error:', e);
      setStatus('Error starting process. Please try again.');
    }
  };

  useEffect(() => {
    if (!ws) return;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setStatus('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message.type === 'status' && message.message === 'Processing completed') {
          setStatus('Processing completed. You can download the video now.');
          setDownloadReady(true);
          setVideoSrc(`${apiUrl}/download/${videoId}`);
          ws.close();
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      setStatus('WebSocket error');
    };

    ws.onclose = () => {
      console.log('WebSocket closed');
      setStatus('WebSocket connection closed');
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) ws.close();
      setWs(null);
    };
  }, [ws, apiUrl, videoId]);

  const handleDownload = async () => {
    try {
      const response = await fetch(`${apiUrl}/download/${videoId}`);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Download error:', error);
      setStatus('Download failed');
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="w-full max-w-2xl space-y-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={apiUrl}
            onChange={(e) => setApiUrl(e.target.value)}
            placeholder="Enter API Base URL"
            className="w-full p-2 border rounded"
          />
          <input
            type="text"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Enter YouTube URL"
            className="w-full p-2 border rounded"
          />
          <button
            type="submit"
            className="w-full p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Process Video
          </button>
        </form>

        {status && (
          <div className="p-4 border rounded bg-gray-50">
            <h2 className="font-bold mb-2">Status:</h2>
            <p>{status}</p>
          </div>
        )}

        {downloadReady && (
          <div>
            <button
              onClick={handleDownload}
              className="w-full p-2 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Download Processed Video
            </button>

            {videoSrc && (
              <div className="mt-4">
                <video controls className="w-full max-w-xl">
                  <source src={videoSrc} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
