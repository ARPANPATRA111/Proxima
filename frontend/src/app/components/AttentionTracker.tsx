import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision';
import { io } from 'socket.io-client';
import { useLocalParticipant } from '@livekit/components-react';
import { Track } from 'livekit-client';

const socketUrl = 'http://localhost:3001';

interface AttentionTrackerProps {
  roomId: string;
  studentId: string;
  studentName: string;
  onScoreUpdate?: (score: number) => void;
}

const AttentionTracker: React.FC<AttentionTrackerProps> = ({ roomId, studentId, studentName, onScoreUpdate }) => {
  const { localParticipant } = useLocalParticipant();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const scoreRef = useRef(0);
  const socketRef = useRef<ReturnType<typeof io> | null>(null);
  const currentStreamIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log(`[AttentionTracker] Setting up socket for student: ${studentName}`);
    socketRef.current = io(socketUrl);
    socketRef.current.emit('join_room', { roomId, isTeacher: false, name: studentName, studentId });
    return () => {
      console.log(`[AttentionTracker] Disconnecting socket`);
      socketRef.current?.disconnect();
    };
  }, [roomId, studentId, studentName]);

  useEffect(() => {
    const setupMediaPipe = async () => {
      try {
        console.log("[AttentionTracker] Initializing MediaPipe...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
            delegate: "GPU"
          },
          outputFaceBlendshapes: true,
          runningMode: "VIDEO",
          numFaces: 1
        });
        setIsLoaded(true);
        console.log("[AttentionTracker] MediaPipe Face Landmarker loaded successfully");
      } catch (e) {
        console.error("[AttentionTracker] MediaPipe initialization failed:", e);
      }
    };
    setupMediaPipe();
  }, []);

  useEffect(() => {
    if (!localParticipant || !videoRef.current) return;

    const attachStream = () => {
      let mediaStreamTrack: MediaStreamTrack | null = null;

      try {
        const pub = localParticipant.getTrackPublication(Track.Source.Camera);
        if (pub?.track?.mediaStreamTrack) {
          mediaStreamTrack = pub.track.mediaStreamTrack;
          console.log("[AttentionTracker] Got track via getTrackPublication");
        }
      } catch (e) {
        console.warn("[AttentionTracker] getTrackPublication failed:", e);
      }

      if (!mediaStreamTrack) {
        try {
          const pub = (localParticipant as any).getTrack?.(Track.Source.Camera);
          const track = pub?.videoTrack || pub?.track;
          if (track?.mediaStreamTrack) {
            mediaStreamTrack = track.mediaStreamTrack;
            console.log("[AttentionTracker] Got track via getTrack");
          } else if (track?.mediaStream) {
            const stream = track.mediaStream as MediaStream;
            if (stream.getVideoTracks().length > 0) {
              mediaStreamTrack = stream.getVideoTracks()[0];
              console.log("[AttentionTracker] Got track via getTrack -> mediaStream");
            }
          }
        } catch (e) {
          console.warn("[AttentionTracker] getTrack fallback failed:", e);
        }
      }

      if (!mediaStreamTrack) {
        console.warn("[AttentionTracker] No camera track found on localParticipant");
        return;
      }

      const trackId = mediaStreamTrack.id;
      if (currentStreamIdRef.current === trackId) return;

      console.log(`[AttentionTracker] Attaching new camera stream (trackId: ${trackId})`);
      currentStreamIdRef.current = trackId;
      const stream = new MediaStream([mediaStreamTrack]);
      videoRef.current!.srcObject = stream;
      videoRef.current!.play().catch(e => console.warn("[AttentionTracker] Video play failed:", e));
    };

    attachStream();
    const interval = setInterval(attachStream, 1000);
    return () => clearInterval(interval);
  }, [localParticipant]);

  useEffect(() => {
    if (!isLoaded) {
      console.log("[AttentionTracker] Waiting for MediaPipe to load...");
      return;
    }

    let animationId: number | null = null;
    let logThrottle = 0;

    const predictWebcam = () => {
      const video = videoRef.current;

      if (video && landmarkerRef.current && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          const timestamp = performance.now();
          const results = landmarkerRef.current.detectForVideo(video, timestamp);

          let calculatedScore = 0;
          const faceDetected = results.faceLandmarks && results.faceLandmarks.length > 0;

          if (faceDetected) {
            calculatedScore += 30;

            let eyesScore = 0;
            let headScore = 0;

            if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
              const blendshapes = results.faceBlendshapes[0].categories;

              const eyeBlinkLeft = blendshapes.find(c => c.categoryName === 'eyeBlinkLeft')?.score || 0;
              const eyeBlinkRight = blendshapes.find(c => c.categoryName === 'eyeBlinkRight')?.score || 0;
              if (eyeBlinkLeft < 0.4 && eyeBlinkRight < 0.4) {
                eyesScore = 50;
              }

              const lookLeft = blendshapes.find(c => c.categoryName === 'eyeLookOutLeft')?.score || 0;
              const lookRight = blendshapes.find(c => c.categoryName === 'eyeLookOutRight')?.score || 0;
              const lookDown = blendshapes.find(c => c.categoryName === 'eyeLookDownLeft')?.score || 0;
              if (lookLeft < 0.2 && lookRight < 0.2 && lookDown < 0.2) {
                headScore = 20;
              }
            }

            calculatedScore += eyesScore + headScore;
          }

          if (logThrottle % 60 === 0) {
            console.log(`[AttentionTracker] Face=${faceDetected}, Score=${calculatedScore}, Video=${video.videoWidth}x${video.videoHeight}`);
          }
          logThrottle++;

          scoreRef.current = calculatedScore;
          if (onScoreUpdate) onScoreUpdate(calculatedScore);

          if (localParticipant) {
            try {
              const payload = JSON.stringify({
                type: 'attention_score',
                studentId: localParticipant.identity,
                studentName,
                score: calculatedScore,
                timestamp: Date.now()
              });
              localParticipant.publishData(new TextEncoder().encode(payload), { topic: 'proxima_events' }).catch(() => {});
            } catch {}
          }
        } catch (e) {
          if (logThrottle % 60 === 0) {
            console.error("[AttentionTracker] detectForVideo error:", e);
          }
          logThrottle++;
        }
      } else {
        if (logThrottle % 60 === 0) {
          console.warn(`[AttentionTracker] Video not ready — readyState: ${video?.readyState}, dim: ${video?.videoWidth}x${video?.videoHeight}, landmarker: ${!!landmarkerRef.current}`);
        }
        logThrottle++;
      }

      animationId = window.requestAnimationFrame(predictWebcam);
    };

    predictWebcam();

    return () => {
      if (animationId) window.cancelAnimationFrame(animationId);
    };
  }, [isLoaded, localParticipant, onScoreUpdate, studentName]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (socketRef.current) {
        socketRef.current.emit('attention_score', {
          roomId,
          studentName,
          score: scoreRef.current
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [roomId, studentName]);

  return (
    <div style={{ position: 'absolute', opacity: 0.01, pointerEvents: 'none', width: '320px', height: '240px', overflow: 'hidden', top: '-1000px', left: '-1000px', zIndex: -1 }}>
      <video ref={videoRef} autoPlay playsInline muted width="320" height="240"></video>
    </div>
  );
};

export default AttentionTracker;
