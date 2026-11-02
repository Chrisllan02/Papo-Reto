import React, { useEffect, useMemo, useRef, useState } from 'react';
import { DESKTOP_QUERY, REDUCED_MOTION_QUERY, useMediaQuery } from '../hooks/useMediaQuery';
import { Politician } from '../types';
import { nextFacesCursor, pickRotatingFaces } from '../domain/legislative/rotation';
import { safeGetItem, safeSetItem } from '../services/storage';

interface BancadaFacesProps {
  uf: string;
  politicians: Politician[];
}

const DESKTOP_FACES = 5;
const MOBILE_FACES = 3;
const CURSOR_KEY = 'paporeto_bancada_cursor_';
const ROTATION_MS = 4500;
const CASCADE_MS = 120;
const FLIP_MS = 220;

const PRELOAD_TIMEOUT_MS = 3000;

const preloadPhotos = (politicians: Politician[]) =>
  Promise.race([
    Promise.all(politicians.filter(pol => pol.photo).map(pol => new Promise<void>(resolve => {
      const image = new Image();
      image.onload = () => resolve();
      image.onerror = () => resolve();
      image.src = pol.photo;
    }))),
    new Promise<void>(resolve => setTimeout(resolve, PRELOAD_TIMEOUT_MS)),
  ]);

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();

type FlipPhase = 'idle' | 'out' | 'pre' | 'in';

const FLIP_STYLE: Record<FlipPhase, React.CSSProperties> = {
  idle: { transform: 'rotateY(0deg)' },
  out: { transform: 'rotateY(90deg)', transition: `transform ${FLIP_MS}ms ease-in` },
  pre: { transform: 'rotateY(-90deg)' },
  in: { transform: 'rotateY(0deg)', transition: `transform ${FLIP_MS}ms ease-out` },
};

interface FaceProps {
  politician: Politician;
  index: number;
  reduceMotion: boolean;
}

const Face: React.FC<FaceProps> = ({ politician, index, reduceMotion }) => {
  const [shown, setShown] = useState(politician);
  const shownIdRef = useRef(politician.id);
  const latestRef = useRef(politician);
  const [phase, setPhase] = useState<FlipPhase>('idle');
  const [failedId, setFailedId] = useState<number | null>(null);
  const current = reduceMotion ? politician : shown;

  useEffect(() => {
    latestRef.current = politician;
  });

  useEffect(() => {
    if (reduceMotion || politician.id === shownIdRef.current) {
      const reset = setTimeout(() => setPhase('idle'), 0);
      return () => clearTimeout(reset);
    }
    const delay = index * CASCADE_MS;
    const timers = [
      setTimeout(() => setPhase('out'), delay),
      setTimeout(() => {
        shownIdRef.current = latestRef.current.id;
        setShown(latestRef.current);
        setPhase('pre');
      }, delay + FLIP_MS),
      setTimeout(() => setPhase('in'), delay + FLIP_MS + 30),
      setTimeout(() => setPhase('idle'), delay + FLIP_MS * 2 + 30),
    ];
    return () => timers.forEach(clearTimeout);
  }, [politician.id, index, reduceMotion]);

  const showPhoto = Boolean(current.photo) && failedId !== current.id;

  return (
    <span
      title={current.name}
      className={`${index === 0 ? '' : '-ml-2.5 md:-ml-3'} relative block shrink-0 transition-transform duration-200 hover:z-10 hover:-translate-y-1.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0 [perspective:400px]`}
    >
      <span
        className="block animate-face-in motion-reduce:animate-none"
        style={{ animationDelay: `${index * CASCADE_MS}ms` }}
      >
        <span
          style={reduceMotion ? undefined : FLIP_STYLE[phase]}
          className="flex h-10 w-10 md:h-14 md:w-14 items-center justify-center overflow-hidden rounded-full border-2 md:border-[3px] border-white bg-white text-sm font-black text-midnight shadow-[0_4px_12px_rgba(0,39,118,0.25)] [backface-visibility:hidden]"
        >
          {showPhoto
            ? <img key={current.id} src={current.photo} alt={current.name} className="h-full w-full object-cover" onError={() => setFailedId(current.id)} />
            : <span role="img" aria-label={current.name}>{initials(current.name)}</span>}
        </span>
      </span>
    </span>
  );
};

const BancadaFaces: React.FC<BancadaFacesProps> = ({ uf, politicians }) => {
  const faceCount = useMediaQuery(DESKTOP_QUERY) ? DESKTOP_FACES : MOBILE_FACES;
  const reduceMotion = useMediaQuery(REDUCED_MOTION_QUERY);
  const cursorKey = `${CURSOR_KEY}${uf}`;
  const rotationKey = `${cursorKey}|${faceCount}`;
  const readRotation = () => ({ key: rotationKey, base: Number(safeGetItem(cursorKey)) || 0, step: 0 });
  const [rotation, setRotation] = useState(readRotation);
  if (rotation.key !== rotationKey) setRotation(readRotation());
  const { step } = rotation;
  const cursor = rotation.base + step * faceCount;
  const total = politicians.length;

  const byId = useMemo(() => new Map(politicians.map(pol => [pol.id, pol])), [politicians]);
  const ids = useMemo(() => politicians.map(pol => pol.id), [politicians]);
  const windowAt = useMemo(
    () => (at: number) => pickRotatingFaces(ids, faceCount, at)
      .map(id => byId.get(id))
      .filter((pol): pol is Politician => Boolean(pol)),
    [ids, byId, faceCount],
  );
  const faces = useMemo(() => windowAt(cursor), [windowAt, cursor]);

  useEffect(() => {
    if (total === 0) return;
    safeSetItem(cursorKey, String(nextFacesCursor(cursor, faceCount, total)));
  }, [cursorKey, cursor, faceCount, total]);

  useEffect(() => {
    if (reduceMotion || total <= faceCount) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(async () => {
        if (document.visibilityState !== 'visible') {
          schedule();
          return;
        }
        await preloadPhotos(windowAt(cursor + faceCount));
        if (!cancelled) setRotation(prev => (prev.key === rotationKey ? { ...prev, step: prev.step + 1 } : prev));
      }, ROTATION_MS);
    };
    schedule();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [reduceMotion, total, faceCount, windowAt, cursor, rotationKey, step]);

  if (faces.length === 0) return null;

  return (
    <div className="flex items-center justify-self-end md:shrink-0">
      {faces.map((pol, index) => (
        <Face key={index} politician={pol} index={index} reduceMotion={reduceMotion} />
      ))}
    </div>
  );
};

export default BancadaFaces;
