'use client';

import { useState } from 'react';

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default function Home() {
  const [videoUrl, setVideoUrl] = useState('');
  const [videoId, setVideoId] = useState('');
  const [apiUrl, setApiUrl] = useState('');
  const [status, setStatus] = useState('');
  const [downloadReady, setDownloadReady] = useState(false);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

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
      // Send the video processing request
      const params = new URLSearchParams({ video_url: videoUrl, topic: 'sarcastic' });
      const response = await fetch(`${apiUrl}/process?${params.toString()}`, { method: 'POST' });

      if (!response.ok) {
        console.error('API response:', response);
        throw new Error('Failed to start processing');
      }

      setStatus('Processing started...');
      await checkProgress(id);  // Start polling for progress
    } catch (e) {
      console.error('Submission error:', e);
      setStatus('Error starting process. Please try again.');
    }
  };

  const checkProgress = async (videoId: string) => {
    let retries = 0;
    const maxRetries = 1000;
    
    const headers = {
      'Authorization': 'Bearer 2kHe38ixHrn4xbswQKLKdYNiKHZ_5Zuca64w7EvaUo4GctWkX',
      'ngrok-skip-browser-warning': 'true'
    };
  
    while (retries < maxRetries) {
      await sleep(20000);
      retries++;
  
      try {
        const response = await fetch(`${apiUrl}/progress/${videoId}`, {
          method: 'GET',
          headers
        });
  
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
  
        const data = await response.json();
  
        if (data.status === 'completed') {
          setStatus('Processing completed. You can download the video now.');
          // Pre-fetch the video URL with headers
          const videoUrl = `${apiUrl}/download/${videoId}`;
          setVideoSrc(videoUrl);
          setDownloadReady(true);
          return;
        } else if (data.status === 'error') {
          setStatus(`Error: ${data.reason}`);
          return;
        }
        
        setStatus(`Processing... (Attempt ${retries})`);
      } catch (error) {
        console.error('Progress check error:', error);
        setStatus(`Checking progress... (Attempt ${retries})`);
      }
    }
  
    setStatus('Max retries reached. Please try again later.');
  };
  
  const handleDownload = async () => {
    if (isDownloading) return;
    
    setIsDownloading(true);
    setStatus('Starting download...');
    
    try {
      const headers = {
        'Authorization': 'Bearer 2kHe38ixHrn4xbswQKLKdYNiKHZ_5Zuca64w7EvaUo4GctWkX',
        'ngrok-skip-browser-warning': 'true'
      };

      const response = await fetch(`${apiUrl}/download/${videoId}`, {
        method: 'GET',
        headers
      });

      if (!response.ok) throw new Error('Download failed');

      // Show download progress
      const reader = response.body?.getReader();
      const contentLength = response.headers.get('Content-Length');
      const totalLength = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (!reader) throw new Error('Unable to read response');

      const chunks = [];
      let receivedLength = 0;

      while(true) {
        const {done, value} = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        // Update progress
        if (totalLength) {
          const progress = ((receivedLength / totalLength) * 100).toFixed(1);
          setStatus(`Downloading: ${progress}%`);
        }
      }

      // Combine chunks and create blob
      const blob = new Blob(chunks, { type: 'video/mp4' });
      const url = window.URL.createObjectURL(blob);
      
      // Create and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `processed_${videoId}.mp4`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setStatus('Download completed!');
    } catch (error) {
      console.error('Download error:', error);
      setStatus('Download failed. Please try again.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
  <main
    className="flex min-h-screen flex-col items-center justify-center p-24"
    style={{ backgroundColor: "#ffffff" }}
  >
    <div className="w-full max-w-2xl space-y-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          placeholder="Enter API Base URL"
          className="w-full p-3 text-lg border rounded border-gray-300 text-black"
          style={{ fontSize: "1rem" }}
        />
        <input
          type="text"
          value={videoUrl}
          onChange={(e) => setVideoUrl(e.target.value)}
          placeholder="Enter YouTube URL"
          className="w-full p-3 text-lg border rounded border-gray-300 text-black"
          style={{ fontSize: "1rem" }}
        />
        <button
          type="submit"
          className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
          disabled={isDownloading}
          style={{ fontSize: "1rem" }}
        >
          Process Video
        </button>
      </form>

      {status && (
        <div
          className="p-4 border rounded bg-gray-50 text-black"
          style={{ fontSize: "1rem" }}
        >
          <h2 className="font-bold mb-2">Status:</h2>
          <p>{status}</p>
        </div>
      )}

      {downloadReady && (
        <div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`w-full p-3 ${
              isDownloading ? "bg-gray-400" : "bg-green-500 hover:bg-green-600"
            } text-white rounded`}
            style={{ fontSize: "1rem" }}
          >
            {isDownloading ? "Downloading..." : "Download Processed Video"}
          </button>

          {videoSrc && (
            <div className="mt-4">
              <video
                controls
                className="w-full max-w-xl"
                key={videoSrc}
                style={{ borderRadius: "8px" }}
              >
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
