import { atom } from "jotai";
import type { SliceableArrayLike } from "meyda";

import type { ImageItem } from "@/types";

export const livePaintingOptionsAtom = atom({
	brushSize: 10,
	color: "#ffffff",
});

export const clearCounterAtom = atom(0);
export const imageAtom = atom("");
export const imagesAtom = atom<ImageItem[]>([]);
export const storyImagesAtom = atom<ImageItem[]>([]);

export const rmsAtom = atom<number>(0);
export const bufferAtom = atom<SliceableArrayLike<number>>(new Float32Array(0));
export const audioDeviceAtom = atom<string>("0");

export const drawingCanvasAtom = atom<HTMLCanvasElement | null>(null);
export const waveformCanvasAtom = atom<OffscreenCanvas | null>(null);

export const imageCanvasAtom = atom<OffscreenCanvas | null>(null);
export const imageConfigAtom = atom({
	src: "/divided/dividid.png",
	x: 0,
	y: 0,
	scale: 0.15,
});
